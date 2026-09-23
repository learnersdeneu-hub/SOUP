-- Free-text institution name captured at signup. Nullable, additive: existing
-- accounts are unaffected and simply have NULL until they fill it in once,
-- either during a fresh signup or via a one-time prompt after sign-in.
ALTER TABLE "users" ADD COLUMN "institutionName" TEXT;
