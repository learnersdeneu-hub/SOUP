import { z, type ZodTypeAny } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseJsonBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<ParseResult<z.output<S>>> {
  let raw: unknown;
  try {
    const text = await request.text();
    raw = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }

  return { ok: true, data: parsed.data };
}

export const idSchema = z.string().trim().min(1).max(191);
export const optionalIdSchema = z.string().trim().max(191).optional().nullable().transform((value) => value || null);
export const shortTextSchema = (max = 500) => z.string().trim().max(max);
export const optionalShortTextSchema = (max = 500) => z.string().trim().max(max).optional().default("");

export function parseSearchParams<S extends ZodTypeAny>(request: Request, schema: S): ParseResult<z.output<S>> {
  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}

export async function parseFormData<S extends ZodTypeAny>(request: Request, schema: S): Promise<ParseResult<z.output<S>>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) raw[key] = value;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: Response.json({ error: "Invalid request." }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}
