export const SOUP_SUPPORT_EMAIL = process.env.SOUP_SUPPORT_EMAIL || "admissions@learnerden.eu";
export const SOUP_SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SOUP_WHATSAPP || "48739654618";

export function supportWhatsAppUrl(message = "Hi SOUP, I need help with my student journey.") {
  const digits = SOUP_SUPPORT_WHATSAPP.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function supportMailto(subject = "SOUP student support") {
  return `mailto:${SOUP_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
