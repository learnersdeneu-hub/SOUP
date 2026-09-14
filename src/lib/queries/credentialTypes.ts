import { prisma } from "@/lib/prisma";

// credential_types is a small, rarely-changing lookup table — cache the
// code -> id map per server instance rather than re-querying on every call.
let cache: Map<string, string> | null = null;

export async function getCredentialTypeId(code: string): Promise<string> {
  if (!cache) {
    const types = await prisma.credentialType.findMany();
    cache = new Map(types.map((t) => [t.code, t.id]));
  }
  const id = cache.get(code);
  if (!id) throw new Error(`Unknown credential type code: ${code}`);
  return id;
}
