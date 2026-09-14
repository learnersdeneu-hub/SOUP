import type { Opportunity, OpportunityProvider, OpportunitySearchContext } from "@/lib/opportunities/types";

/**
 * Sprint 1 provider boundary. No scraper or fabricated fallback is used.
 * Sprint 2/live integrations register real providers here and must return
 * source URLs so every displayed opportunity remains traceable.
 */
const providers: OpportunityProvider[] = [];

export function getOpportunityProviders(): readonly OpportunityProvider[] {
  return providers;
}

export async function searchLiveOpportunities(context: OpportunitySearchContext): Promise<Opportunity[]> {
  if (providers.length === 0) return [];
  const results = await Promise.allSettled(providers.map((provider) => provider.search(context)));
  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => Boolean(item.externalId && item.provider && item.title && item.organization && item.url));
}
