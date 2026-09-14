import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RateLimitError } from "@/lib/ai/types";

const WINDOW_MS = 60_000;
const AUTHENTICATED_LIMIT = 20;
const GUEST_LIMIT = 8;

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

function guestSubject(request: Request) {
  const salt = process.env.SOUP_RATE_LIMIT_SALT || "SOUP_LOCAL_RATE_LIMIT";
  const digest = createHash("sha256").update(`${salt}:${requestIp(request)}`).digest("hex");
  return `guest:${digest}`;
}

export async function checkRateLimit(request: Request, profileId?: string | null): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
  const subject = profileId ? `profile:${profileId}` : guestSubject(request);
  const limit = profileId ? AUTHENTICATED_LIMIT : GUEST_LIMIT;

  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "ai_rate_limit_counters" ("subject", "windowStart", "count", "updatedAt")
    VALUES (${subject}, ${windowStart}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("subject") DO UPDATE SET
      "count" = CASE
        WHEN "ai_rate_limit_counters"."windowStart" < EXCLUDED."windowStart" THEN 1
        ELSE "ai_rate_limit_counters"."count" + 1
      END,
      "windowStart" = GREATEST("ai_rate_limit_counters"."windowStart", EXCLUDED."windowStart"),
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count"
  `);

  const count = Number(rows[0]?.count || 0);
  if (count > limit) {
    const retryAfterMs = WINDOW_MS - (now - windowStart.getTime());
    throw new RateLimitError("Rate limit exceeded. Please slow down.", Math.max(1000, retryAfterMs));
  }
}
