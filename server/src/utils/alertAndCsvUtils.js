import { convertPriceUnit } from './marketCalculations.js';

/**
 * Evaluates whether a price observation triggers a farmer's PriceAlert.
 * Prevents duplicate firing if lastEvaluatedObservationId matches observationId.
 */
export function shouldTriggerAlert(alert, observation) {
  if (!alert || !observation) return { triggered: false, reason: 'Missing alert or observation' };
  if (alert.status !== 'ACTIVE') return { triggered: false, reason: 'Alert is not active' };

  const obsId = String(observation._id || observation.id || '');
  if (obsId && alert.lastEvaluatedObservationId && String(alert.lastEvaluatedObservationId) === obsId) {
    return { triggered: false, reason: 'Duplicate observation already evaluated' };
  }

  if (String(alert.crop) !== String(observation.crop)) {
    return { triggered: false, reason: 'Crop mismatch' };
  }

  if (alert.market && String(alert.market) !== String(observation.market)) {
    return { triggered: false, reason: 'Market mismatch' };
  }

  const normalizedObsPrice = convertPriceUnit(
    observation.modalPrice,
    observation.unit || 'INR/Quintal',
    alert.unit || 'INR/Quintal'
  );

  const target = Number(alert.targetPrice);
  let conditionMet = false;
  if (alert.condition === 'ABOVE_OR_EQUAL') {
    conditionMet = normalizedObsPrice >= target;
  } else if (alert.condition === 'BELOW_OR_EQUAL') {
    conditionMet = normalizedObsPrice <= target;
  }

  return {
    triggered: conditionMet,
    normalizedObsPrice,
    targetPrice: target,
    reason: conditionMet ? 'Condition met' : 'Threshold not reached'
  };
}

/**
 * Validates and normalizes raw CSV / AGMARKNET rows.
 * Rejects missing fields, negative prices, min > max, or modal outside [min, max].
 */
export function validateAndNormalizePriceRow(rawRow, rowNumber = 1) {
  const state = String(rawRow.state || rawRow.State || 'Andhra Pradesh').trim();
  const district = String(rawRow.district || rawRow.District || '').trim();
  const market = String(rawRow.market || rawRow.Market || rawRow.marketName || '').trim();
  const commodity = String(rawRow.commodity || rawRow.Commodity || rawRow.crop || rawRow.commodityName || '').trim();
  const variety = String(rawRow.variety || rawRow.Variety || 'Common').trim();
  const grade = String(rawRow.grade || rawRow.Grade || 'FAQ').trim();
  const arrivalDateRaw = String(rawRow.arrival_date || rawRow.observationDate || rawRow.Arrival_Date || '').trim();

  const minPrice = Number(rawRow.min_price ?? rawRow.minimumPrice ?? rawRow.minPrice ?? rawRow.Min_x0020_Price);
  const maxPrice = Number(rawRow.max_price ?? rawRow.maximumPrice ?? rawRow.maxPrice ?? rawRow.Max_x0020_Price);
  const modalPrice = Number(rawRow.modal_price ?? rawRow.modalPrice ?? rawRow.Modal_x0020_Price);

  if (!district || !market || !commodity) {
    return { valid: false, error: { rowNumber, reason: 'Missing required market, district, or commodity name', rawRow } };
  }
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || !Number.isFinite(modalPrice)) {
    return { valid: false, error: { rowNumber, reason: 'Prices (min, max, modal) must be valid numbers', rawRow } };
  }
  if (minPrice <= 0 || maxPrice <= 0 || modalPrice <= 0) {
    return { valid: false, error: { rowNumber, reason: 'Prices must be strictly greater than zero', rawRow } };
  }
  if (minPrice > maxPrice) {
    return { valid: false, error: { rowNumber, reason: `Minimum price (${minPrice}) cannot exceed maximum price (${maxPrice})`, rawRow } };
  }
  if (modalPrice < minPrice || modalPrice > maxPrice) {
    return { valid: false, error: { rowNumber, reason: `Modal price (${modalPrice}) must lie between minimum (${minPrice}) and maximum (${maxPrice})`, rawRow } };
  }

  // Parse DD/MM/YYYY or YYYY-MM-DD
  let parsedDate = null;
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(arrivalDateRaw)) {
    const [dd, mm, yyyy] = arrivalDateRaw.split(/[/-]/);
    parsedDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  } else if (arrivalDateRaw) {
    parsedDate = new Date(arrivalDateRaw);
  }
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return { valid: false, error: { rowNumber, reason: `Invalid observation date: "${arrivalDateRaw}"`, rawRow } };
  }

  const duplicateKey = `${commodity.toLowerCase()}|${variety.toLowerCase()}|${market.toLowerCase()}|${parsedDate.toISOString().slice(0, 10)}`;

  return {
    valid: true,
    duplicateKey,
    normalized: {
      state,
      district,
      marketName: market,
      commodityName: commodity,
      variety,
      grade,
      minPrice,
      maxPrice,
      minimumPrice: minPrice,
      maximumPrice: maxPrice,
      modalPrice,
      unit: rawRow.unit || 'INR/Quintal',
      observationDate: parsedDate,
      source: rawRow.source || 'CSV_IMPORT',
      status: rawRow.status || 'MANUALLY_ENTERED',
      dataStatus: rawRow.dataStatus || 'MANUALLY_VERIFIED'
    }
  };
}
