// Token usage tracking hook.
//
// There is no database table for AI usage yet (adding one is a schema
// change, out of scope for this pass — see summary). This logs a
// structured record for every completed call and exposes a subscriber
// hook so a real persistence backend (a new UsageEvent table, a metrics
// pipeline, etc.) can be plugged in later without touching the call site
// in the route handler.
export type UsageEvent = {
  profileId: string;
  sessionId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: string;
};

type UsageSubscriber = (event: UsageEvent) => void;
const subscribers: UsageSubscriber[] = [];

export function onUsage(subscriber: UsageSubscriber) {
  subscribers.push(subscriber);
}

export function trackTokenUsage(event: Omit<UsageEvent, "timestamp">) {
  const full: UsageEvent = { ...event, timestamp: new Date().toISOString() };
  for (const sub of subscribers) sub(full);
}
