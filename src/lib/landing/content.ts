// Copy and partner lists for the signed-out landing page (/sign-in). Kept in
// line with the confirmed partners the signed-in home page shows
// (src/app/page.tsx) — add a partner here only once it's real.

export const LANDING_UNIVERSITIES = [
  { name: "KEDGE Business School", country: "France" },
  { name: "ESDES Business School", country: "France" },
  { name: "University of Debrecen", country: "Hungary" },
  { name: "International Business School Budapest", country: "Hungary" },
  { name: "University of Europe for Applied Sciences", country: "Germany" },
  { name: "Hochschule Fresenius", country: "Germany" },
  { name: "GISMA University for Applied Sciences", country: "Germany" },
  { name: "Berlin School of Business and Innovation", country: "Germany" },
  { name: "University of Greenwich", country: "United Kingdom" },
  { name: "Dublin Business School", country: "Ireland" },
  { name: "Collegium Da Vinci Poland", country: "Poland" },
  { name: "Algebra University College Croatia", country: "Croatia" },
] as const;

export const LANDING_LIVING_PARTNERS = [
  { name: "AmberStudent", websiteUrl: "https://amberstudent.com/", line: "Student residences and shared flats near campuses worldwide." },
  { name: "HousingAnywhere", websiteUrl: "https://housinganywhere.com/", line: "Mid- to long-term rooms across Europe with secure payment." },
] as const;

export const LANDING_INSURANCE_PARTNERS = [
  { name: "insuremart", websiteUrl: "https://insuremart.pk/" },
  { name: "Hellenic Sun Insurance Brokers", websiteUrl: "https://www.hellenicsun.pk/" },
] as const;

export const LANDING_MORE_PARTNERS = [
  { name: "LearnersDen.eu", websiteUrl: "https://learnersden.eu/", role: "Counselling & application management" },
  { name: "MCB Islamic Bank", websiteUrl: "https://www.mcbislamicbank.com/", role: "Student banking" },
  { name: "COTHM", websiteUrl: "https://cothm.edu.pk/", role: "Hospitality pathway" },
] as const;

export const LANDING_PERSONAS = [
  { emoji: "🎓", title: "School leavers", line: "Heading for a bachelor's abroad and not sure where to start." },
  { emoji: "📚", title: "Graduates", line: "Going for a master's and comparing programs across countries." },
  { emoji: "🍳", title: "Diploma graduates", line: "Topping up a hospitality or vocational diploma into a degree." },
  { emoji: "✈️", title: "Offer holders", line: "Got the offer — now need visa, housing, insurance and money sorted." },
] as const;

export const LANDING_USES = [
  { title: "Discover universities", line: "Search programs by subject, country and budget." },
  { title: "Ask Noodles, 24/7", line: "An AI counselor for every question, big or small." },
  { title: "Apply & track", line: "Every application, offer and deadline in one tracker." },
  { title: "Document vault", line: "Upload once, reuse for every application and visa." },
  { title: "Visa checklists", line: "Built from current official sources for your country." },
  { title: "Housing, insurance, money", line: "Verified partners for everything before you fly." },
] as const;

export const LANDING_FAQ = [
  {
    q: "Why do I need to request access?",
    a: "SOUP is opening to students in stages so every student gets real attention from our counselling team. Request access with your name and email — once you're approved we email you a sign-in link.",
  },
  {
    q: "Does SOUP only recommend partner universities?",
    a: "No. Noodles looks for programs that genuinely fit your profile and budget. Suitable SOUP partners are shown first, but independent options are always there too — and we never show made-up 'match percentages'.",
  },
  {
    q: "How does student insurance through SOUP work?",
    a: "Insurance bought through SOUP is arranged by our partners insuremart and Hellenic Sun Insurance Brokers. You add your destination and dates, compare visa-ready plans, and the partner reviews your details before the policy is issued.",
  },
  {
    q: "Can I use SOUP on my phone?",
    a: "Yes. SOUP works in any modern browser on phone, tablet or laptop, and your chats, documents and applications follow you across devices.",
  },
] as const;
