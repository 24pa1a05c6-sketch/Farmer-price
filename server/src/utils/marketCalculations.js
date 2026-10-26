/**
 * KisanSetu Pure Calculation & Market Ranking Engine
 * Implements strict unit conversions and net earnings formulas:
 * - 1 Quintal = 100 Kilograms
 * - Quantity in quintals = Quantity in kilograms / 100 (if unit is Kg)
 * - Gross revenue = Quantity in quintals * Modal price per quintal
 * - Estimated net earnings = Gross revenue - Transportation cost - Additional selling expenses
 */

export const QUINTAL_TO_KG = 100;

/**
 * Converts a quantity in 'Quintal' or 'Kg' into Quintals.
 * Never divides by 100 if the input unit is already 'Quintal'.
 */
export function toQuintals(quantity, quantityUnit = 'Quintal') {
  const num = Number(quantity);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error('Quantity must be a positive number greater than zero.');
  }
  const normalizedUnit = String(quantityUnit).trim().toLowerCase();
  if (normalizedUnit === 'quintal' || normalizedUnit === 'quintals' || normalizedUnit === 'qtl') {
    return Number(num.toFixed(4));
  }
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilogram' || normalizedUnit === 'kilograms') {
    return Number((num / QUINTAL_TO_KG).toFixed(4));
  }
  throw new Error(`Unsupported quantity unit: ${quantityUnit}. Expected 'Quintal' or 'Kg'.`);
}

/**
 * Converts a price between INR/Quintal and INR/Kg.
 */
export function convertPriceUnit(price, fromUnit = 'INR/Quintal', toUnit = 'INR/Quintal') {
  const val = Number(price);
  if (!Number.isFinite(val) || val < 0) {
    throw new Error('Price must be a non-negative number.');
  }
  if (fromUnit === toUnit) return Number(val.toFixed(2));
  if (fromUnit === 'INR/Quintal' && toUnit === 'INR/Kg') {
    return Number((val / QUINTAL_TO_KG).toFixed(2));
  }
  if (fromUnit === 'INR/Kg' && toUnit === 'INR/Quintal') {
    return Number((val * QUINTAL_TO_KG).toFixed(2));
  }
  throw new Error(`Unsupported price unit conversion from ${fromUnit} to ${toUnit}`);
}

/**
 * Computes freshness status and days elapsed relative to a reference date.
 */
export function evaluateDataFreshness(observationDate, referenceDate = new Date()) {
  const obs = new Date(observationDate);
  const ref = new Date(referenceDate);
  if (Number.isNaN(obs.getTime())) {
    return { isStale: true, daysOld: null, freshnessLabel: 'Invalid Date' };
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
 * Calculates gross revenue and estimated net earnings for a single market observation.
 */
export function calculateMarketNetEarnings({
  quantity,
  quantityUnit = 'Quintal',
  modalPrice,
  priceUnit = 'INR/Quintal',
  transportCost = 0,
  additionalExpenses = 0,
  minAcceptablePricePerQuintal = null,
  observationDate = new Date(),
  referenceDate = new Date()
}) {
  const tCost = Number(transportCost);
  const aCost = Number(additionalExpenses);
  if (!Number.isFinite(tCost) || tCost < 0) {
    throw new Error('Transportation cost cannot be negative.');
  }
  if (!Number.isFinite(aCost) || aCost < 0) {
    throw new Error('Additional selling expenses cannot be negative.');
  }

  const quantityInQuintals = toQuintals(quantity, quantityUnit);
  const quantityInKg = Number((quantityInQuintals * QUINTAL_TO_KG).toFixed(2));
  const modalPricePerQuintal = convertPriceUnit(modalPrice, priceUnit, 'INR/Quintal');
  const modalPricePerKg = convertPriceUnit(modalPricePerQuintal, 'INR/Quintal', 'INR/Kg');

  const grossRevenue = Number((quantityInQuintals * modalPricePerQuintal).toFixed(2));
  const totalExpenses = Number((tCost + aCost).toFixed(2));
  const estimatedNetEarnings = Number((grossRevenue - totalExpenses).toFixed(2));
  const netRealizationPerQuintal = Number((estimatedNetEarnings / quantityInQuintals).toFixed(2));

  const freshness = evaluateDataFreshness(observationDate, referenceDate);
  const meetsMinAcceptable =
    minAcceptablePricePerQuintal === null || minAcceptablePricePerQuintal === '' || Number(minAcceptablePricePerQuintal) <= 0
      ? true
      : modalPricePerQuintal >= Number(minAcceptablePricePerQuintal);

  return {
    quantityInQuintals,
    quantityInKg,
    modalPricePerQuintal,
    modalPricePerKg,
    grossRevenue,
    transportCost: Number(tCost.toFixed(2)),
    additionalExpenses: Number(aCost.toFixed(2)),
    totalExpenses,
    estimatedNetEarnings,
    netRealizationPerQuintal,
    meetsMinAcceptable,
    meetsMinAcceptablePrice: meetsMinAcceptable,
    freshness
  };
}

/**
 * Ranks multiple markets by estimated net earnings, attaching warnings for stale or incomparable records.
 */
export function rankMarketsByNetEarnings({
  quantity,
  quantityUnit = 'Quintal',
  minAcceptablePricePerQuintal = null,
  marketEntries = [],
  referenceDate = new Date()
}) {
  const quantityInQuintals = toQuintals(quantity, quantityUnit);
  const quantityInKg = Number((quantityInQuintals * QUINTAL_TO_KG).toFixed(2));

  if (!Array.isArray(marketEntries) || marketEntries.length === 0) {
    return {
      quantityInQuintals,
      quantityInKg,
      rankedMarkets: [],
      bestMarket: null,
      summaryWarnings: ['No market records available for comparison.']
    };
  }

  const evaluated = marketEntries.map((entry) => {
    const calc = calculateMarketNetEarnings({
      quantity,
      quantityUnit,
      modalPrice: entry.modalPrice,
      priceUnit: entry.priceUnit || entry.unit || 'INR/Quintal',
      transportCost: entry.transportCost ?? 0,
      additionalExpenses: entry.additionalExpenses ?? entry.otherExpenses ?? entry.handlingCost ?? 0,
      minAcceptablePricePerQuintal,
      observationDate: entry.observationDate,
      referenceDate
    });

    const warnings = [];
    if (calc.freshness.isStale) {
      warnings.push(`Stale price observation (${calc.freshness.daysOld} days old). Verify with mandi before dispatch.`);
    }
    if (!calc.meetsMinAcceptable) {
      warnings.push(`Modal price (₹${calc.modalPricePerQuintal}/qtl) is below your minimum acceptable threshold.`);
    }
    if (entry.dataStatus === 'DEMO_SAMPLE' || entry.status === 'DEMONSTRATION') {
      warnings.push('Demonstration record — labeled sample data.');
    }

    return {
      ...entry,
      ...calc,
      warnings
    };
  });

  // Sort descending by estimatedNetEarnings
  evaluated.sort((a, b) => b.estimatedNetEarnings - a.estimatedNetEarnings);

  const bestNet = evaluated[0].estimatedNetEarnings;
  const secondBestNet = evaluated.length > 1 ? evaluated[1].estimatedNetEarnings : bestNet;

  const rankedMarkets = evaluated.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    isBestOption: idx === 0,
    advantageOverSecondBest: idx === 0 ? Number((bestNet - secondBestNet).toFixed(2)) : 0,
    deltaFromBest: Number((item.estimatedNetEarnings - bestNet).toFixed(2))
  }));

  const summaryWarnings = [];
  const staleCount = rankedMarkets.filter((m) => m.freshness.isStale).length;
  if (staleCount > 0) {
    summaryWarnings.push(`${staleCount} market(s) have price observations older than 7 days.`);
  }

  return {
    quantityInQuintals,
    quantityInKg,
    rankedMarkets,
    bestMarket: rankedMarkets[0] || null,
    summaryWarnings
  };
}
