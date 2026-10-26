/**
 * Official Indian Government Open Government Data (OGD) AGMARKNET Provider
 * Dataset: Current Daily Price of Various Commodities from Various Markets (Mandi)
 * Resource URL: https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
 * API Endpoint: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
 */
import { validateAndNormalizePriceRow } from '../utils/alertAndCsvUtils.js';

const DEFAULT_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

export async function fetchOfficialAgmarknetPrices({
  apiKey = process.env.DATA_GOV_IN_API_KEY,
  resourceId = process.env.DATA_GOV_IN_RESOURCE_ID || DEFAULT_RESOURCE_ID,
  state = 'Andhra Pradesh',
  limit = 100,
  offset = 0
} = {}) {
  if (!apiKey || apiKey === 'your_data_gov_in_api_key_here') {
    return {
      ok: false,
      configured: false,
      error: 'DATA_GOV_IN_API_KEY is not configured in server environment. Use CSV Import or configure an official OGD API key.',
      records: []
    };
  }

  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (state) {
    url.searchParams.set('filters[state.keyword]', state);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        error: `Data.gov.in API responded with HTTP ${response.status}`,
        records: []
      };
    }

    const payload = await response.json();
    const rawRecords = Array.isArray(payload.records) ? payload.records : [];
    const validRecords = [];
    const validationErrors = [];

    rawRecords.forEach((raw, idx) => {
      const result = validateAndNormalizePriceRow(
        { ...raw, source: 'AGMARKNET_API', dataStatus: 'OFFICIAL' },
        idx + 1
      );
      if (result.valid) {
        validRecords.push(result.normalized);
      } else {
        validationErrors.push(result.error);
      }
    });

    return {
      ok: true,
      configured: true,
      totalFetched: rawRecords.length,
      records: validRecords,
      validationErrors,
      updatedTimestamp: payload.updated_date || new Date().toISOString()
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: `AGMARKNET network or timeout error: ${err.message}`,
      records: []
    };
  }
}
