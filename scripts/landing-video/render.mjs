// Renders scripts/landing-video/tour.html into public/landing/soup-tour.mp4
// (+ a poster JPEG). Every CSS animation is paused and scrubbed to an exact
// time per frame, so the result is deterministic rather than a screen
// recording. Needs Playwright (chromium) and ffmpeg on PATH.
//   node scripts/landing-video/render.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public/landing");
const FPS = 30;
const SECONDS = 15;

mkdirSync(outDir, { recursive: true });
const frames = mkdtempSync(path.join(tmpdir(), "soup-tour-"));

const launchOptions = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, ignoreHTTPSErrors: true });
await page.goto(pathToFileURL(path.join(here, "tour.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));

for (let i = 0; i < FPS * SECONDS; i++) {
  const ms = (i / FPS) * 1000;
  await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), ms);
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
}
await browser.close();

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"),
  "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(outDir, "soup-tour.mp4"),
]);
// Poster: a frame from scene 3 (the Noodles chat) — the most "this is the product" moment.
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-i", path.join(frames, `f${String(FPS * 9 + 15).padStart(4, "0")}.png`),
  "-vf", "scale=1280:720:flags=lanczos", "-q:v", "4", path.join(outDir, "soup-tour-poster.jpg"),
]);
rmSync(frames, { recursive: true, force: true });
console.log("Wrote public/landing/soup-tour.mp4 and soup-tour-poster.jpg");
