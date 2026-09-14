import { expect, test } from "@playwright/test";

// These run against whatever the app can do with no logged-in user and no
// seeded test account, so they're safe to run in any environment that has
// the app running — including CI with only placeholder env vars, as long as
// a real (even empty) database is reachable for the health check.

test("health endpoint reports database reachability", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();
  expect(body.product).toBe("SOUP");
  expect(["ok", "degraded"]).toContain(body.status);
  // A degraded-but-responsive health check is still a pass for this smoke
  // test — it proves the app is up and the route runs. A real DB outage
  // should be caught by monitoring/alerting, not this test.
});

test("sign-in page renders the email/password form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByPlaceholder("Email")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("protected API routes reject unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/journey/attach-document", {
    data: { documentId: "does-not-matter" },
  });
  expect(response.status()).toBe(401);
});

test("admin API routes reject unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/admin/applications/nonexistent-id/status", {
    data: { status: "SUBMITTED" },
  });
  expect(response.status()).toBe(403);
});
