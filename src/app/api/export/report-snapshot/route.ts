export async function GET() {
  return Response.json({ error: "This legacy GCI endpoint is disabled in SOUP." }, { status: 410 });
}
export async function POST() {
  return Response.json({ error: "This legacy GCI endpoint is disabled in SOUP." }, { status: 410 });
}
