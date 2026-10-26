import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toQuintals,
  convertPriceUnit,
  calculateMarketNetEarnings,
  rankMarketsByNetEarnings,
  evaluateDataFreshness
} from '../src/utils/marketCalculations.js';
import {
  shouldTriggerAlert,
  validateAndNormalizePriceRow
} from '../src/utils/alertAndCsvUtils.js';

describe('KisanSetu Unit Conversions & Net Earnings Engine', () => {
  it('converts kilograms to quintals accurately (100 kg = 1 quintal)', () => {
    assert.equal(toQuintals(2500, 'Kg'), 25);
    assert.equal(toQuintals(100, 'kilograms'), 1);
    assert.equal(toQuintals(45, 'Kg'), 0.45);
  });

  it('does NOT divide by 100 again when input unit is already Quintal', () => {
    assert.equal(toQuintals(25, 'Quintal'), 25);
    assert.equal(toQuintals(12.5, 'qtl'), 12.5);
  });

  it('throws validation error on zero or negative quantities', () => {
    assert.throws(() => toQuintals(0, 'Quintal'), /positive number/);
    assert.throws(() => toQuintals(-10, 'Kg'), /positive number/);
  });

  it('converts prices between INR/Quintal and INR/Kg accurately', () => {
    assert.equal(convertPriceUnit(2480, 'INR/Quintal', 'INR/Kg'), 24.8);
    assert.equal(convertPriceUnit(19.5, 'INR/Kg', 'INR/Quintal'), 1950);
    assert.equal(convertPriceUnit(2480, 'INR/Quintal', 'INR/Quintal'), 2480);
  });

  it('calculates Gross Revenue and Estimated Net Earnings accurately for Quintal input', () => {
    const res = calculateMarketNetEarnings({
      quantity: 30,
      quantityUnit: 'Quintal',
      modalPrice: 2480,
      priceUnit: 'INR/Quintal',
      transportCost: 2100,
      additionalExpenses: 900
    });
    assert.equal(res.quantityInQuintals, 30);
    assert.equal(res.grossRevenue, 74400);
    assert.equal(res.totalExpenses, 3000);
    assert.equal(res.estimatedNetEarnings, 71400);
    assert.equal(res.netRealizationPerQuintal, 2380);
  });

  it('calculates Gross Revenue and Estimated Net Earnings accurately for Kg input', () => {
    const res = calculateMarketNetEarnings({
      quantity: 3000, // 30 quintals
      quantityUnit: 'Kg',
      modalPrice: 2480,
      priceUnit: 'INR/Quintal',
      transportCost: 2100,
      additionalExpenses: 900
    });
    assert.equal(res.quantityInQuintals, 30);
    assert.equal(res.grossRevenue, 74400);
    assert.equal(res.estimatedNetEarnings, 71400);
  });

  it('ranks multiple markets by Estimated Net Earnings (not raw modal price)', () => {
    const referenceDate = new Date('2026-10-26T00:00:00Z');
    const ranking = rankMarketsByNetEarnings({
      quantity: 40,
      quantityUnit: 'Quintal',
      minAcceptablePricePerQuintal: 2300,
      referenceDate,
      marketEntries: [
        {
          marketName: 'Distant High-Price Mandi',
          modalPrice: 2520,
          unit: 'INR/Quintal',
          transportCost: 6800,
          additionalExpenses: 1200,
          observationDate: '2026-10-25T00:00:00Z',
          dataStatus: 'OFFICIAL'
        },
        {
          marketName: 'Nearby Optimal Mandi',
          modalPrice: 2460,
          unit: 'INR/Quintal',
          transportCost: 1400,
          additionalExpenses: 800,
          observationDate: '2026-10-26T00:00:00Z',
          dataStatus: 'OFFICIAL'
        }
      ]
    });

    // Nearby Optimal: 40 * 2460 = 98,400 - 2,200 = 96,200
    // Distant High-Price: 40 * 2520 = 100,800 - 8,000 = 92,800
    assert.equal(ranking.bestMarket.marketName, 'Nearby Optimal Mandi');
    assert.equal(ranking.bestMarket.estimatedNetEarnings, 96200);
    assert.equal(ranking.rankedMarkets[1].estimatedNetEarnings, 92800);
    assert.equal(ranking.bestMarket.advantageOverSecondBest, 3400);
  });

  it('flags stale price observations older than 7 days', () => {
    const ref = new Date('2026-10-26T00:00:00Z');
    const fresh = evaluateDataFreshness('2026-10-25T00:00:00Z', ref);
    const stale = evaluateDataFreshness('2026-10-10T00:00:00Z', ref);
    assert.equal(fresh.isStale, false);
    assert.equal(stale.isStale, true);
    assert.equal(stale.daysOld, 16);
  });
});

describe('KisanSetu Price Alert Evaluation & Duplicate Prevention', () => {
  it('triggers ABOVE_OR_EQUAL alert when modal price meets or exceeds target', () => {
    const alert = {
      crop: 'crop_paddy',
      market: 'mkt_kakinada',
      targetPrice: 2450,
      unit: 'INR/Quintal',
      condition: 'ABOVE_OR_EQUAL',
      status: 'ACTIVE',
      lastEvaluatedObservationId: null
    };
    const obs = {
      _id: 'obs_101',
      crop: 'crop_paddy',
      market: 'mkt_kakinada',
      modalPrice: 2480,
      unit: 'INR/Quintal'
    };
    const res = shouldTriggerAlert(alert, obs);
    assert.equal(res.triggered, true);
    assert.equal(res.normalizedObsPrice, 2480);
  });

  it('prevents duplicate notification for the same observation ID', () => {
    const alert = {
      crop: 'crop_paddy',
      market: null,
      targetPrice: 2400,
      unit: 'INR/Quintal',
      condition: 'ABOVE_OR_EQUAL',
      status: 'ACTIVE',
      lastEvaluatedObservationId: 'obs_101'
    };
    const obs = {
      _id: 'obs_101',
      crop: 'crop_paddy',
      market: 'mkt_kakinada',
      modalPrice: 2480,
      unit: 'INR/Quintal'
    };
    const res = shouldTriggerAlert(alert, obs);
    assert.equal(res.triggered, false);
    assert.match(res.reason, /Duplicate observation/);
  });
});

describe('KisanSetu CSV Import & AGMARKNET Row Validation', () => {
  it('accepts valid AGMARKNET row and generates deterministic duplicateKey', () => {
    const row = {
      state: 'Andhra Pradesh',
      district: 'Guntur',
      market: 'Guntur Mirchi Yard',
      commodity: 'Red Chilli (Dry)',
      variety: 'Teja (S17)',
      min_price: '17200',
      max_price: '19400',
      modal_price: '18600',
      arrival_date: '25/10/2026'
    };
    const check = validateAndNormalizePriceRow(row, 1);
    assert.equal(check.valid, true);
    assert.equal(check.normalized.modalPrice, 18600);
    assert.equal(check.duplicateKey, 'red chilli (dry)|teja (s17)|guntur mirchi yard|2026-10-25');
  });

  it('rejects row when modal price lies outside [min_price, max_price]', () => {
    const invalidRow = {
      state: 'Andhra Pradesh',
      district: 'Guntur',
      market: 'Guntur Mirchi Yard',
      commodity: 'Paddy',
      variety: 'BPT 5204',
      min_price: '2300',
      max_price: '2500',
      modal_price: '2800',
      arrival_date: '2026-10-25'
    };
    const check = validateAndNormalizePriceRow(invalidRow, 2);
    assert.equal(check.valid, false);
    assert.match(check.error.reason, /Modal price .* must lie between/);
  });
});
