import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

// The extension never receives a Supabase session cookie or a long-lived
// secret directly. A signed-in student generates a short-lived pairing code
// from the web app; the extension redeems it once for a device-scoped bearer
// token. Only hashes are ever persisted — the plaintext code/token exist only
// in the HTTP response that creates them.
const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
const PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function randomCode(length = 8) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += PAIRING_CODE_ALPHABET[bytes[i] % PAIRING_CODE_ALPHABET.length];
  return out;
}

export async function createPairingCode(profileId: string) {
  const code = randomCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
  await prisma.companionPairingCode.create({
    data: { profileId, codeHash: hash(code), expiresAt },
  });
  return { code, expiresAt };
}

export async function redeemPairingCode(rawCode: string, deviceLabel?: string) {
  const normalized = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return { ok: false as const, reason: "INVALID" };
  const pairing = await prisma.companionPairingCode.findUnique({ where: { codeHash: hash(normalized) } });
  if (!pairing || pairing.consumedAt || pairing.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, reason: "EXPIRED" };
  }
  const token = randomBytes(32).toString("hex");
  const [, device] = await prisma.$transaction([
    prisma.companionPairingCode.update({ where: { id: pairing.id }, data: { consumedAt: new Date() } }),
    prisma.companionDevice.create({
      data: { profileId: pairing.profileId, tokenHash: hash(token), label: deviceLabel?.trim().slice(0, 120) || "SOUP Companion" },
    }),
  ]);
  return { ok: true as const, token, deviceId: device.id, profileId: pairing.profileId };
}

export async function authenticateCompanionToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const device = await prisma.companionDevice.findUnique({ where: { tokenHash: hash(match[1].trim()) } });
  if (!device || device.revokedAt) return null;
  const profile = await prisma.profile.findUnique({ where: { id: device.profileId }, include: { user: true } });
  if (!profile) return null;
  await prisma.companionDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { device, profile };
}

export async function requireCompanionAuth(request: Request) {
  const current = await authenticateCompanionToken(request);
  if (!current) return { ok: false as const, response: Response.json({ error: "Companion is not connected to a SOUP account. Reconnect from the app." }, { status: 401 }) };
  return { ok: true as const, ...current };
}
