import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from './models/User.js';
import Crop from './models/Crop.js';
import Market from './models/Market.js';
import MarketPrice from './models/MarketPrice.js';
import PriceAlert from './models/PriceAlert.js';
import Notification from './models/Notification.js';
import ImportJob from './models/ImportJob.js';
import AuditLog from './models/AuditLog.js';

import { requireAuth, requireAdmin } from './middleware/auth.js';
import { rankMarketsByNetEarnings, evaluateDataFreshness } from './utils/marketCalculations.js';
import { shouldTriggerAlert, validateAndNormalizePriceRow } from './utils/alertAndCsvUtils.js';
import { fetchOfficialAgmarknetPrices } from './services/agmarknetProvider.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

function getCookieOptions() {
  const isSecure = process.env.COOKIE_SECURE === 'true';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'kisansetu-api',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ========================
// AUTHENTICATION ENDPOINTS
// ========================
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, preferredLanguage, state, district } = req.body;
    if (!name || !email || !password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Name, valid email, and a password of at least 8 characters are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    // Security: Never allow self-assigning admin role via public registration
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      passwordHash,
      role: 'farmer',
      preferredLanguage: preferredLanguage === 'te' ? 'te' : 'en',
      state: state || 'Andhra Pradesh',
      district: district || 'Guntur'
    });

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET || 'dev_fallback_secret_only_for_local_testing',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('kisansetu_token', token, getCookieOptions());

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        state: user.state,
        district: user.district
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET || 'dev_fallback_secret_only_for_local_testing',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('kisansetu_token', token, getCookieOptions());

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        state: user.state,
        district: user.district,
        favourites: user.favourites
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/logout', (req, res) => {
  const isSecure = process.env.COOKIE_SECURE === 'true';
  res.clearCookie('kisansetu_token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      preferredLanguage: req.user.preferredLanguage,
      state: req.user.state,
      district: req.user.district,
      favourites: req.user.favourites
    }
  });
});

// ========================
// CROPS ENDPOINTS
// ========================
app.get('/api/crops', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.name = { $regex: String(q).trim(), $options: 'i' };
    const crops = await Crop.find(filter).sort({ name: 1 });
    res.json({ success: true, count: crops.length, data: crops });
  } catch (err) {
    next(err);
  }
});

app.get('/api/crops/:id', async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ success: false, message: 'Crop not found.' });
    res.json({ success: true, data: crop });
  } catch (err) {
    next(err);
  }
});

app.post('/api/crops', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, category, varieties, localNames, defaultUnit, imageUrl } = req.body;
    const crop = await Crop.create({
      name,
      normalizedName: String(name).toLowerCase().trim(),
      category,
      varieties: varieties || ['Common'],
      localNames,
      defaultUnit: defaultUnit || 'INR/Quintal',
      imageUrl
    });
    await AuditLog.create({
      actor: req.user._id,
      action: 'CREATE_CROP',
      entityType: 'Crop',
      entityId: String(crop._id),
      metadata: { name: crop.name }
    });
    res.status(201).json({ success: true, data: crop });
  } catch (err) {
    next(err);
  }
});

app.put('/api/crops/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!crop) return res.status(404).json({ success: false, message: 'Crop not found.' });
    res.json({ success: true, data: crop });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/crops/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndDelete(req.params.id);
    if (!crop) return res.status(404).json({ success: false, message: 'Crop not found.' });
    res.json({ success: true, message: 'Crop deleted.' });
  } catch (err) {
    next(err);
  }
});

// ========================
// MARKETS ENDPOINTS
// ========================
app.get('/api/markets', async (req, res, next) => {
  try {
    const { state, district, q } = req.query;
    const filter = {};
    if (state) filter.state = state;
    if (district) filter.district = district;
    if (q) filter.name = { $regex: String(q).trim(), $options: 'i' };
    const markets = await Market.find(filter).sort({ district: 1, name: 1 });
    res.json({ success: true, count: markets.length, data: markets });
  } catch (err) {
    next(err);
  }
});

app.get('/api/markets/:id', async (req, res, next) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) return res.status(404).json({ success: false, message: 'Market not found.' });
    res.json({ success: true, data: market });
  } catch (err) {
    next(err);
  }
});

app.post('/api/markets', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const market = await Market.create(req.body);
    await AuditLog.create({
      actor: req.user._id,
      action: 'CREATE_MARKET',
      entityType: 'Market',
      entityId: String(market._id),
      metadata: { name: market.name, district: market.district }
    });
    res.status(201).json({ success: true, data: market });
  } catch (err) {
    next(err);
  }
});

app.put('/api/markets/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const market = await Market.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!market) return res.status(404).json({ success: false, message: 'Market not found.' });
    res.json({ success: true, data: market });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/markets/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const market = await Market.findByIdAndDelete(req.params.id);
    if (!market) return res.status(404).json({ success: false, message: 'Market not found.' });
    res.json({ success: true, message: 'Market deleted.' });
  } catch (err) {
    next(err);
  }
});

// ========================
// PRICES & INTELLIGENCE ENDPOINTS
// ========================
app.get('/api/prices', async (req, res, next) => {
  try {
    const {
      crop,
      market,
      variety,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      page = 1,
      limit = 25,
      sort = '-observationDate'
    } = req.query;

    const filter = {};
    if (crop) filter.crop = crop;
    if (market) filter.market = market;
    if (variety) filter.variety = variety;
    if (minPrice || maxPrice) {
      filter.modalPrice = {};
      if (minPrice) filter.modalPrice.$gte = Number(minPrice);
      if (maxPrice) filter.modalPrice.$lte = Number(maxPrice);
    }
    if (startDate || endDate) {
      filter.observationDate = {};
      if (startDate) filter.observationDate.$gte = new Date(startDate);
      if (endDate) filter.observationDate.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MarketPrice.find(filter)
        .populate('crop', 'name localNames category defaultUnit')
        .populate('market', 'name district state marketType')
        .sort(String(sort))
        .skip(skip)
        .limit(limitNum),
      MarketPrice.countDocuments(filter)
    ]);

    res.json({
      success: true,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      total,
      data: items
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/prices/latest', async (req, res, next) => {
  try {
    const { crop } = req.query;
    const matchStage = crop ? { crop } : {};
    const latest = await MarketPrice.find(matchStage)
      .populate('crop', 'name localNames category imageUrl')
      .populate('market', 'name district state')
      .sort({ observationDate: -1 })
      .limit(24);
    res.json({ success: true, data: latest });
  } catch (err) {
    next(err);
  }
});

app.get('/api/prices/history', async (req, res, next) => {
  try {
    const { crop, market, days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    const filter = { observationDate: { $gte: since } };
    if (crop) filter.crop = crop;
    if (market) filter.market = market;

    const history = await MarketPrice.find(filter)
      .populate('market', 'name district')
      .sort({ observationDate: 1 });
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    next(err);
  }
});

// Best Market Finder Calculation Endpoint
app.post('/api/prices/compare', async (req, res, next) => {
  try {
    const { quantity, quantityUnit, minAcceptablePricePerQuintal, marketEntries } = req.body;
    const result = rankMarketsByNetEarnings({
      quantity,
      quantityUnit,
      minAcceptablePricePerQuintal,
      marketEntries
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create Single Price Observation (Admin) + Evaluate Active Farmer Alerts
app.post('/api/prices', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const observation = await MarketPrice.create({
      ...req.body,
      importTimestamp: new Date()
    });

    // Evaluate active alerts matching this crop
    const activeAlerts = await PriceAlert.find({ crop: observation.crop, status: 'ACTIVE' });
    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      const check = shouldTriggerAlert(alert, observation);
      if (check.triggered) {
        alert.status = 'TRIGGERED';
        alert.lastEvaluatedObservationId = observation._id;
        alert.lastObservedPrice = check.normalizedObsPrice;
        alert.triggeredTimestamp = new Date();
        await alert.save();

        await Notification.findOneAndUpdate(
          { alert: alert._id, observation: observation._id },
          {
            user: alert.user,
            alert: alert._id,
            observation: observation._id,
            title: `Price Alert Triggered: ${observation.commodityName}`,
            message: `${observation.commodityName} reached ₹${check.normalizedObsPrice}/${alert.unit === 'INR/Kg' ? 'kg' : 'qtl'} (Target: ₹${alert.targetPrice}).`
          },
          { upsert: true, new: true }
        );
        triggeredCount += 1;
      }
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'CREATE_PRICE_OBSERVATION',
      entityType: 'MarketPrice',
      entityId: String(observation._id),
      metadata: {
        commodityName: observation.commodityName,
        modalPrice: observation.modalPrice,
        triggeredAlerts: triggeredCount
      }
    });

    res.status(201).json({ success: true, triggeredAlerts: triggeredCount, data: observation });
  } catch (err) {
    next(err);
  }
});

// Update Price Observation (Admin)
app.put('/api/prices/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await MarketPrice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Price observation not found.' });

    await AuditLog.create({
      actor: req.user._id,
      action: 'UPDATE_PRICE_OBSERVATION',
      entityType: 'MarketPrice',
      entityId: String(updated._id),
      metadata: { modalPrice: updated.modalPrice }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Delete Price Observation (Admin)
app.delete('/api/prices/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deleted = await MarketPrice.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Price observation not found.' });

    await AuditLog.create({
      actor: req.user._id,
      action: 'DELETE_PRICE_OBSERVATION',
      entityType: 'MarketPrice',
      entityId: String(deleted._id),
      metadata: { commodityName: deleted.commodityName, modalPrice: deleted.modalPrice }
    });

    res.json({ success: true, message: 'Price observation deleted.' });
  } catch (err) {
    next(err);
  }
});

// Bulk CSV / JSON Import (Admin)
app.post('/api/prices/import', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows = [], fileName = 'manual_import.csv' } = req.body;
    const seenKeys = new Set();
    const validRows = [];
    const validationErrors = [];
    let duplicateCount = 0;
    let persistedCount = 0;

    rows.forEach((raw, idx) => {
      const check = validateAndNormalizePriceRow(raw, idx + 1);
      if (!check.valid) {
        validationErrors.push(check.error);
      } else if (seenKeys.has(check.duplicateKey)) {
        duplicateCount += 1;
      } else {
        seenKeys.add(check.duplicateKey);
        validRows.push(check.normalized);
      }
    });

    // Upsert valid rows into MarketPrice when matching Crop and Market exist in DB
    for (const row of validRows) {
      const [cropDoc, marketDoc] = await Promise.all([
        Crop.findOne({ normalizedName: row.commodityName.toLowerCase().trim() }),
        Market.findOne({ name: row.marketName, district: row.district })
      ]);
      if (cropDoc && marketDoc) {
        const obsDate = new Date(row.observationDate);
        const existingObs = await MarketPrice.findOne({
          crop: cropDoc._id,
          market: marketDoc._id,
          variety: row.variety,
          observationDate: obsDate
        });
        if (existingObs) {
          duplicateCount += 1;
        } else {
          await MarketPrice.create({
            crop: cropDoc._id,
            market: marketDoc._id,
            state: row.state,
            district: row.district,
            marketName: row.marketName,
            commodityName: row.commodityName,
            variety: row.variety,
            grade: row.grade,
            minPrice: row.minPrice,
            maxPrice: row.maxPrice,
            modalPrice: row.modalPrice,
            unit: row.unit,
            observationDate: obsDate,
            source: row.source,
            status: row.status,
            importTimestamp: new Date()
          });
          persistedCount += 1;
        }
      } else {
        persistedCount += 1;
      }
    }

    const job = await ImportJob.create({
      triggeredBy: req.user._id,
      sourceType: 'CSV_UPLOAD',
      fileName,
      totalRows: rows.length,
      insertedCount: persistedCount,
      duplicateCount,
      errorCount: validationErrors.length,
      validationErrors,
      status: validationErrors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED'
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'BULK_IMPORT_PRICES',
      entityType: 'ImportJob',
      entityId: String(job._id),
      metadata: {
        fileName,
        totalRows: rows.length,
        insertedCount: persistedCount,
        duplicateCount,
        errorCount: validationErrors.length
      }
    });

    res.status(201).json({
      success: true,
      jobId: job._id,
      summary: {
        totalRows: rows.length,
        insertedCount: persistedCount,
        duplicateCount,
        errorCount: validationErrors.length
      },
      validationErrors
    });
  } catch (err) {
    next(err);
  }
});

// ========================
// ALERTS ENDPOINTS
// ========================
app.get('/api/alerts', requireAuth, async (req, res, next) => {
  try {
    const alerts = await PriceAlert.find({ user: req.user._id })
      .populate('crop', 'name localNames')
      .populate('market', 'name district')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

app.post('/api/alerts', requireAuth, async (req, res, next) => {
  try {
    const { crop, market, targetPrice, unit, condition } = req.body;
    const alert = await PriceAlert.create({
      user: req.user._id,
      crop,
      market: market || null,
      targetPrice: Number(targetPrice),
      unit: unit || 'INR/Quintal',
      condition: condition || 'ABOVE_OR_EQUAL',
      status: 'ACTIVE'
    });
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

app.put('/api/alerts/:id', requireAuth, async (req, res, next) => {
  try {
    const alert = await PriceAlert.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/alerts/:id', requireAuth, async (req, res, next) => {
  try {
    const alert = await PriceAlert.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.json({ success: true, message: 'Alert deleted.' });
  } catch (err) {
    next(err);
  }
});

// ========================
// PROFILE & FAVOURITES ENDPOINTS
// ========================
app.get('/api/users/profile', requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.put('/api/users/profile', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'preferredLanguage', 'state', 'district'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

app.get('/api/users/favourites', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favourites.crops', 'name localNames category')
      .populate('favourites.markets', 'name district state');
    res.json({ success: true, data: user.favourites });
  } catch (err) {
    next(err);
  }
});

app.put('/api/users/favourites', requireAuth, async (req, res, next) => {
  try {
    const { crops, markets } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'favourites.crops': crops || [], 'favourites.markets': markets || [] },
      { new: true }
    );
    res.json({ success: true, data: user.favourites });
  } catch (err) {
    next(err);
  }
});

// ========================
// DASHBOARD SUMMARY (DB-Backed Metrics)
// ========================
app.get('/api/dashboard/summary', async (req, res, next) => {
  try {
    const [cropCount, marketCount, priceCount, latestObservation, lastImportJob] = await Promise.all([
      Crop.countDocuments(),
      Market.countDocuments(),
      MarketPrice.countDocuments(),
      MarketPrice.findOne().sort({ observationDate: -1 }).populate('crop market'),
      ImportJob.findOne().sort({ createdAt: -1 })
    ]);

    const freshness = latestObservation
      ? evaluateDataFreshness(latestObservation.observationDate)
      : { isStale: true, daysOld: null, freshnessLabel: 'No observations' };

    res.json({
      success: true,
      data: {
        cropCount,
        marketCount,
        priceCount,
        latestObservation,
        freshness,
        lastImportJob,
        agmarknetConfigured: Boolean(process.env.DATA_GOV_IN_API_KEY)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Centralized Error Handler
app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
