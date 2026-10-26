import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toQuintals,
  convertPriceUnit,
  calculateMarketNetEarnings,
  computeBestMarketComparison
} from '../src/utils/calculations.js';

describe('KisanSetu Client Unit Conversions & Calculation Engine', () => {
  it('converts kilograms to quintals accurately (100 kg = 1 quintal)', () => {
    assert.equal(toQuintals(2500, 'Kg'), 25);
    assert.equal(toQuintals(100, 'kilograms'), 1);
    assert.equal(toQuintals(45, 'Kg'), 0.45);
  });

  it('does NOT divide by 100 again when input unit is already Quintal', () => {
    assert.equal(toQuintals(25, 'Quintal'), 25);
    assert.equal(toQuintals(12.5, 'qtl'), 12.5);
    assert.equal(toQuintals(30, 'quintals'), 30);
  });

  it('throws error on zero or negative quantities', () => {
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
    // Compatibility aliases
    assert.equal(res.grossEarnings, 74400);
    assert.equal(res.totalCosts, 3000);
    assert.equal(res.netEarnings, 71400);
    assert.equal(res.modalPricePerQuintal, 2480);
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

  it('ranks markets by estimated net earnings and provides properties expected by App.jsx', () => {
    const markets = [
      {
        marketId: 'm1',
        marketName: 'Distant High-Price Mandi',
        district: 'Guntur',
        modalPrice: 2520,
        priceUnit: 'INR/Quintal',
        transportCost: 6800,
        handlingCost: 1200
      },
      {
        marketId: 'm2',
        marketName: 'Nearby Optimal Mandi',
        district: 'West Godavari',
        modalPrice: 2460,
        priceUnit: 'INR/Quintal',
        transportCost: 1400,
        handlingCost: 800
      }
    ];

    const result = computeBestMarketComparison({
      quantity: 40,
      quantityUnit: 'Quintal',
      minAcceptablePricePerQuintal: 2300,
      markets
    });

    // Nearby Optimal: 40 * 2460 = 98400 - 2200 = 96200
    // Distant High: 40 * 2520 = 100800 - 8000 = 92800
    assert.equal(result.rankedMarkets[0].marketId, 'm2');
    assert.equal(result.rankedMarkets[0].rank, 1);
    assert.equal(result.rankedMarkets[0].isBestMarket, true);
    assert.equal(result.rankedMarkets[0].modalPricePerQuintal, 2460);
    assert.equal(result.rankedMarkets[0].grossRevenue, 98400);
    assert.equal(result.rankedMarkets[0].totalExpenses, 2200);
    assert.equal(result.rankedMarkets[0].estimatedNetEarnings, 96200);

    assert.equal(result.rankedMarkets[1].marketId, 'm1');
    assert.equal(result.rankedMarkets[1].rank, 2);
    assert.equal(result.rankedMarkets[1].isBestMarket, false);
    assert.equal(result.rankedMarkets[1].estimatedNetEarnings, 92800);
  });

  it('handles invalid or empty inputs without crashing', () => {
    const emptyResult = computeBestMarketComparison({ markets: [] });
    assert.equal(emptyResult.rankedMarkets.length, 0);

    const zeroQtyResult = computeBestMarketComparison({ quantity: 0, markets: [{ modalPrice: 2400 }] });
    assert.equal(zeroQtyResult.rankedMarkets.length, 0);
  });
});
