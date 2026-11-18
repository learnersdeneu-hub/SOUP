// USD→PKR rate for bank-transfer invoices.
//
// Looked up once when an invoice is generated and locked onto that invoice,
// so the PKR figure a student sees never changes afterwards. Uses
// ExchangeRate-API's free open endpoint (no key, daily updates, attribution
// shown on the invoice). The request carries no student data.
//
// If the service is down, slow or returns something implausible, this
// returns null and the invoice tells the student to send the PKR
// equivalent at their bank's rate instead of showing a guessed number.

const RATE_URL = "https://open.er-api.com/v6/latest/USD";
export const RATE_SOURCE = "ExchangeRate-API (exchangerate-api.com)";

export type UsdPkrRate = { rate: number; date: string; source: string };

// A sanity window rather than a price: rejects obviously broken responses
// (0, nulls, a different currency's rate) without needing updates over time.
const MIN_PLAUSIBLE = 50;
const MAX_PLAUSIBLE = 5000;

export async function getUsdToPkrRate(fetcher: typeof fetch = fetch): Promise<UsdPkrRate | null> {
  try {
    const response = await fetcher(RATE_URL, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!response.ok) return null;
    const body = await response.json() as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
    const rate = Number(body?.rates?.PKR);
    if (body?.result !== "success" || !Number.isFinite(rate) || rate < MIN_PLAUSIBLE || rate > MAX_PLAUSIBLE) return null;
    const updated = body.time_last_update_unix ? new Date(body.time_last_update_unix * 1000) : new Date();
    return { rate: Math.round(rate * 100) / 100, date: updated.toISOString(), source: RATE_SOURCE };
  } catch {
    return null;
  }
}
