/**
 * KisanSetu Pure Calculation & Market Ranking Engine (Frontend)
 *
 * Key business rules & formulas:
 * 1. 1 Quintal = 100 Kilograms.
 * 2. Quantity in Quintals = Quantity in Kg / 100 (when unit is Kg).
 *    Never divides by 100 if the input unit is already Quintal.
 * 3. Gross Revenue = Quantity (in Quintals) * Modal Price per Quintal.
 * 4. Total Expenses = Transport Cost + Additional Selling / Handling Expenses (Hamali, bags, loading).
 *    Never assumes missing transport costs are verified zero-cost.
 * 5. Estimated Net Earnings = Gross Revenue - Total Expenses.
 * 6. Net Realization per Quintal = Estimated Net Earnings / Quantity (in Quintals).
 */

export const QUINTAL_IN_KG = 100;
export const QUINTAL_TO_KG = 100;

/**
 * Converts quantity in Quintal or Kg into Quintals.
 */
export function toQuintals(quantity, quantityUnit = 'Quintal') {
  const num = Number(quantity);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error('Quantity must be a positive number greater than zero.');
  }

  const normalized = String(quantityUnit).trim().toLowerCase();
  if (normalized === 'quintal' || normalized === 'quintals' || normalized === 'qtl') {
    return Number(num.toFixed(4));
  }
  if (normalized === 'kg' || normalized === 'kilogram' || normalized === 'kilograms') {
    return Number((num / QUINTAL_IN_KG).toFixed(4));
  }

  throw new Error(`Unsupported quantity unit: ${quantityUnit}. Expected 'Quintal' or 'Kg'.`);
}

/**
 * Converts price between INR/Quintal and INR/Kg.
 */
export function convertPriceUnit(price, fromUnit = 'INR/Quintal', toUnit = 'INR/Quintal') {
  const val = Number(price);
  if (!Number.isFinite(val) || val < 0) {
    throw new TypeError('Price must be a valid non-negative number.');
  }

  if (fromUnit === toUnit) return Number(val.toFixed(2));
  if (fromUnit === 'INR/Quintal' && toUnit === 'INR/Kg') {
    return Number((val / QUINTAL_IN_KG).toFixed(2));
  }
  if (fromUnit === 'INR/Kg' && toUnit === 'INR/Quintal') {
    return Number((val * QUINTAL_IN_KG).toFixed(2));
  }

  throw new Error(`Unsupported price unit conversion: ${fromUnit} to ${toUnit}`);
}

/**
 * Evaluates observation freshness.
 */
export function evaluateDataFreshness(observationDate, referenceDate = new Date()) {
  const obs = new Date(observationDate);
  const ref = new Date(referenceDate);
  if (Number.isNaN(obs.getTime())) {
    return { isStale: false, daysOld: null, freshnessLabel: 'Unknown Date' };
  }
  const diffMs = Math.max(0, ref.getTime() - obs.getTime());
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isStale = daysOld > 7;
  let freshnessLabel = 'Updated Today';
  if (daysOld === 1) freshnessLabel = '1 day ago';
  else if (daysOld > 1) freshnessLabel = `${daysOld} days ago`;
  return { isStale, daysOld, freshnessLabel };
}

/**
 * Calculates net earnings for a single market entry.
 */
export function calculateMarketNetEarnings({
  quantity = 1,
  quantityUnit = 'Quintal',
  modalPrice = 0,
  priceUnit = 'INR/Quintal',
  transportCost = 0,
  additionalExpenses = 0,
  minAcceptablePricePerQuintal = null,
  observationDate = new Date(),
  referenceDate = new Date()
} = {}) {
  const quantityInQuintals = toQuintals(quantity, quantityUnit);
  const quantityInKg = Number((quantityInQuintals * QUINTAL_IN_KG).toFixed(2));

  const modalPricePerQuintal = convertPriceUnit(modalPrice, priceUnit, 'INR/Quintal');
  const modalPricePerKg = convertPriceUnit(modalPricePerQuintal, 'INR/Quintal', 'INR/Kg');

  const grossRevenue = Number((quantityInQuintals * modalPricePerQuintal).toFixed(2));
  const tCost = Number(transportCost) || 0;
  const aCost = Number(additionalExpenses) || 0;
  const totalExpenses = Number((tCost + aCost).toFixed(2));
  const estimatedNetEarnings = Number((grossRevenue - totalExpenses).toFixed(2));
  const netRealizationPerQuintal = Number((estimatedNetEarnings / quantityInQuintals).toFixed(2));

  const freshness = evaluateDataFreshness(observationDate, referenceDate);
  const meetsMinAcceptable =
    minAcceptablePricePerQuintal === null ||
    minAcceptablePricePerQuintal === '' ||
    Number(minAcceptablePricePerQuintal) <= 0
      ? true
      : modalPricePerQuintal >= Number(minAcceptablePricePerQuintal);

  return {
    quantityInQuintals,
    quantityInKg,
    modalPricePerQuintal,
    modalPricePerKg,
    grossRevenue,
    transportCost: tCost,
    additionalExpenses: aCost,
    handlingCost: aCost,
    totalExpenses,
    estimatedNetEarnings,
    netRealizationPerQuintal,
    meetsMinAcceptable,
    meetsMinAcceptablePrice: meetsMinAcceptable,
    meetsMinimumPrice: meetsMinAcceptable,
    // Aliases for compatibility
    pricePerQuintal: modalPricePerQuintal,
    grossEarnings: grossRevenue,
    totalCosts: totalExpenses,
    netEarnings: estimatedNetEarnings,
    freshness
  };
}

/**
 * Computes Best Market comparison and ranks markets by net earnings.
 * Matches call signature in App.jsx:
 *   computeBestMarketComparison({ quantity, quantityUnit, minAcceptablePricePerQuintal, markets })
 */
export function computeBestMarketComparison({
  quantity = 1,
  quantityUnit = 'Quintal',
  minAcceptablePricePerQuintal = 0,
  markets = [],
  referenceDate = new Date()
} = {}) {
  const safeQuantity = Number(quantity);
  if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
    return {
      quantityInQuintals: 0,
      quantityInKg: 0,
      rankedMarkets: [],
      bestMarket: null,
      summaryWarnings: ['Please enter a valid harvest quantity greater than zero.']
    };
  }

  const quantityInQuintals = toQuintals(safeQuantity, quantityUnit);
  const quantityInKg = Number((quantityInQuintals * QUINTAL_IN_KG).toFixed(2));

  if (!Array.isArray(markets) || markets.length === 0) {
    return {
      quantityInQuintals,
      quantityInKg,
      rankedMarkets: [],
      bestMarket: null,
      summaryWarnings: ['No mandi price data available for comparison.']
    };
  }

  const evaluated = markets.map((entry) => {
    const rawPrice =
      entry.modalPrice ??
      entry.modalPricePerQuintal ??
      entry.pricePerQuintal ??
      entry.price ??
      0;

    const priceUnit = entry.priceUnit ?? entry.unit ?? 'INR/Quintal';

    // Transport cost handling: flat or per-quintal
    let tCost = 0;
    let transportCostProvided = false;
    if (entry.transportCost !== undefined && entry.transportCost !== null) {
      tCost = Number(entry.transportCost) || 0;
      transportCostProvided = true;
    } else if (entry.transportCostPerQuintal !== undefined && entry.transportCostPerQuintal !== null) {
      tCost = Number(entry.transportCostPerQuintal) * quantityInQuintals;
      transportCostProvided = true;
    }

    // Handling / Hamali / Additional cost handling
    let hCost = 0;
    let handlingCostProvided = false;
    if (entry.handlingCost !== undefined && entry.handlingCost !== null) {
      hCost = Number(entry.handlingCost) || 0;
      handlingCostProvided = true;
    } else if (entry.additionalExpenses !== undefined && entry.additionalExpenses !== null) {
      hCost = Number(entry.additionalExpenses) || 0;
      handlingCostProvided = true;
    } else if (entry.handlingCostPerQuintal !== undefined && entry.handlingCostPerQuintal !== null) {
      hCost = Number(entry.handlingCostPerQuintal) * quantityInQuintals;
      handlingCostProvided = true;
    }

    const modalPricePerQuintal = convertPriceUnit(rawPrice, priceUnit, 'INR/Quintal');
    const modalPricePerKg = convertPriceUnit(modalPricePerQuintal, 'INR/Quintal', 'INR/Kg');

    const grossRevenue = Number((quantityInQuintals * modalPricePerQuintal).toFixed(2));
    const totalExpenses = Number((tCost + hCost).toFixed(2));
    const estimatedNetEarnings = Number((grossRevenue - totalExpenses).toFixed(2));
    const netRealizationPerQuintal = Number((estimatedNetEarnings / quantityInQuintals).toFixed(2));

    const freshness = evaluateDataFreshness(entry.observationDate || new Date(), referenceDate);
    const minThreshold = Number(minAcceptablePricePerQuintal) || 0;
    const meetsMin = minThreshold <= 0 || modalPricePerQuintal >= minThreshold;

    const warnings = [];
    if (!transportCostProvided) {
      warnings.push('Transport cost not entered — net earnings do not include haulage.');
    }
    if (!handlingCostProvided) {
      warnings.push('Hamali/handling cost not entered.');
    }
    if (freshness.isStale) {
      warnings.push(`Stale price record (${freshness.daysOld} days old).`);
    }
    if (!meetsMin) {
      warnings.push(`Modal price (₹${modalPricePerQuintal}/qtl) is below your minimum acceptable threshold.`);
    }

    return {
      ...entry,
      modalPrice: rawPrice,
      modalPricePerQuintal,
      modalPricePerKg,
      pricePerQuintal: modalPricePerQuintal,
      grossRevenue,
      grossEarnings: grossRevenue,
      transportCost: tCost,
      handlingCost: hCost,
      additionalExpenses: hCost,
      totalExpenses,
      totalCosts: totalExpenses,
      estimatedNetEarnings,
      netEarnings: estimatedNetEarnings,
      netRealizationPerQuintal,
      meetsMinAcceptable: meetsMin,
      meetsMinAcceptablePrice: meetsMin,
      meetsMinimumPrice: meetsMin,
      hasVerifiedCosts: transportCostProvided && handlingCostProvided,
      freshness,
      warnings
    };
  });

  // Sort descending by net earnings
  evaluated.sort((a, b) => b.estimatedNetEarnings - a.estimatedNetEarnings);

  const bestNet = evaluated[0]?.estimatedNetEarnings ?? 0;
  const secondBestNet = evaluated.length > 1 ? evaluated[1].estimatedNetEarnings : bestNet;

  const rankedMarkets = evaluated.map((m, idx) => ({
    ...m,
    rank: idx + 1,
    isBestMarket: idx === 0,
    isBestOption: idx === 0,
    advantageOverSecondBest: idx === 0 ? Number((bestNet - secondBestNet).toFixed(2)) : 0,
    deltaFromBest: Number((m.estimatedNetEarnings - bestNet).toFixed(2))
  }));

  return {
    quantityInQuintals,
    quantityInKg,
    rankedMarkets,
    bestMarket: rankedMarkets[0] || null,
    summaryWarnings: []
  };
}

// Export server-matching function alias as well
export const rankMarketsByNetEarnings = computeBestMarketComparison;
