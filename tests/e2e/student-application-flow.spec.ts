import { expect, test } from "@playwright/test";

// This test exercises the real "log in -> see dashboard -> open an
// application" path, which needs a seeded student account in an actual
// Supabase + Postgres environment — not something a sandbox without network
// access can stand up. Rather than fake a pass, it skips itself with a clear
// reason when the required credentials aren't supplied, the same pattern
// used by scripts/rls-live-verification.mjs. See tests/e2e/README.md for how
// to seed the fixture account and run this for real.

const email = process.env.E2E_STUDENT_EMAIL;
const password = process.env.E2E_STUDENT_PASSWORD;

test.skip(!email || !password, "E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not set — see tests/e2e/README.md");

test("a seeded student can sign in and reach their dashboard", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

test("a seeded student can open their applications list", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

  await page.goto("/applications");
  // The page should render the applications shell without an error state,
  // whether or not the seeded fixture account has any applications yet.
  await expect(page.getByText(/error|something went wrong/i)).toHaveCount(0);
});
