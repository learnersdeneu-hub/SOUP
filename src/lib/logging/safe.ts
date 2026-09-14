export function safeErrorName(error: unknown) {
  if (error instanceof Error) return error.name || "Error";
  return typeof error === "string" ? "StringError" : "UnknownError";
}

// Only the error's own class name, a short truncated message, and (for a
// known retryable-vs-not AI failure) that flag are logged — never request
// bodies, student data, provider response payloads, document text, emails,
// database records, or secret-bearing URLs. This is deliberately just enough
// to tell a rate limit apart from a timeout, a DB blip, or a malformed AI
// response without needing full request tracing.
function safeErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) return "";
  const message = error.message ? error.message.slice(0, 300) : "";
  const retryable = "retryable" in error && typeof (error as { retryable?: unknown }).retryable === "boolean"
    ? ` retryable=${(error as { retryable: boolean }).retryable}`
    : "";
  return `${message}${retryable}`;
}

export function logServerError(code: string, error?: unknown) {
  const name = error ? safeErrorName(error) : "Error";
  const detail = error ? safeErrorDetail(error) : "";
  console.error(code, name, detail);
}
