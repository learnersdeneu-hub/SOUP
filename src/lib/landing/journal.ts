// The SOUP Journal: short, practical articles for students planning to study
// abroad. Shown on the signed-out landing page (/sign-in) and readable in
// full at /journal/[slug] without an account. Static content on purpose — no
// CMS yet — so keep facts general and point to official sources for anything
// that changes year to year (visa rules, required amounts, fees).

export type JournalSection = { heading?: string; paragraphs: string[]; bullets?: string[] };

export type JournalArticle = {
  slug: string;
  title: string;
  dek: string;
  category: "Guides" | "Money" | "Insurance" | "Student living" | "Applications" | "Destinations";
  readMinutes: number;
  emoji: string;
  cover: { from: string; to: string; ink: string };
  body: JournalSection[];
};

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    slug: "study-abroad-timeline",
    title: "The 12-month study-abroad timeline (that actually works)",
    dek: "From shortlist to boarding pass: what to do, and when, so nothing lands on your desk the week before a deadline.",
    category: "Guides",
    readMinutes: 6,
    emoji: "🗓️",
    cover: { from: "#1F3FA8", to: "#5B7BEA", ink: "#FFFFFF" },
    body: [
      {
        paragraphs: [
          "Most stressful study-abroad stories have the same plot: everything was possible, it just all happened at once. The fix is boring but powerful — spread the work across a year. Here's the rhythm we see working for SOUP students.",
        ],
      },
      {
        heading: "12–9 months out: decide what you want",
        paragraphs: ["This is research season. Be honest about budget, subject and the kind of city you want to live in."],
        bullets: [
          "Shortlist 5–8 programs across two or three countries.",
          "Check entry requirements: grades, English test, portfolio or interview.",
          "Book your English test early — seats fill up before intake deadlines.",
        ],
      },
      {
        heading: "9–6 months out: apply",
        paragraphs: ["Popular programs and scholarships close early. Aim to submit before the rush, not on the deadline."],
        bullets: [
          "Write your motivation letter and CV, then get them reviewed.",
          "Ask referees for recommendation letters with at least three weeks' notice.",
          "Scan and store transcripts, passport and certificates in one place.",
        ],
      },
      {
        heading: "6–3 months out: offers, money and visa",
        paragraphs: ["Once an offer arrives, the clock starts on everything that depends on it."],
        bullets: [
          "Accept your offer and pay any deposit by the stated date.",
          "Arrange proof of funds — some countries require a blocked account.",
          "Book your visa appointment; slots can be weeks away in peak season.",
          "Buy student health insurance that meets your visa's requirements.",
        ],
      },
      {
        heading: "3–0 months out: get ready to land",
        paragraphs: ["Housing goes fast near popular campuses, so don't leave it to arrival week."],
        bullets: ["Secure verified accommodation.", "Book flights after your visa is granted.", "Make copies of every key document — digital and paper."],
      },
      {
        paragraphs: ["Inside SOUP, Noodles builds this timeline around your actual intake date and keeps your checklist up to date as each step is done."],
      },
    ],
  },
  {
    slug: "blocked-account-explained",
    title: "Proof of funds and blocked accounts, explained simply",
    dek: "Why embassies want to see your money, how a blocked account works, and the mistakes that delay visas.",
    category: "Money",
    readMinutes: 5,
    emoji: "💶",
    cover: { from: "#0B6B50", to: "#3FB08A", ink: "#FFFFFF" },
    body: [
      {
        paragraphs: [
          "Almost every student visa asks the same question: can you afford to live here while you study? Proof of funds is how you answer it. The rules differ by country, but the logic is the same everywhere.",
        ],
      },
      {
        heading: "What counts as proof of funds",
        paragraphs: ["Depending on the country, embassies typically accept one or more of:"],
        bullets: [
          "A blocked account holding a year of living costs (common for Germany).",
          "Bank statements showing a steady balance over several months.",
          "A scholarship or sponsorship letter.",
          "A formal declaration from a parent or sponsor with their statements.",
        ],
      },
      {
        heading: "How a blocked account works",
        paragraphs: [
          "You deposit the required yearly amount into an account in your name. After you arrive, a fixed monthly amount is released to you. The account is 'blocked' only in the sense that you can't withdraw everything at once — it's still your money.",
          "The required amount is set by the government and can change each year, so always confirm the current figure on the official embassy or foreign-office website before you transfer anything.",
        ],
      },
      {
        heading: "Mistakes that slow visas down",
        paragraphs: [],
        bullets: [
          "Large unexplained deposits right before the application.",
          "Statements that aren't stamped or are missing pages.",
          "Using an amount from last year's guidance.",
          "Names that don't exactly match your passport.",
        ],
      },
      {
        paragraphs: ["SOUP's money planner breaks down your real costs — tuition, rent, insurance, travel — and tells you what proof your destination asks for."],
      },
    ],
  },
  {
    slug: "student-insurance-for-your-visa",
    title: "Student insurance for your visa: what actually matters",
    dek: "Coverage amounts, start dates and the fine print that gets visa applications returned — and how to get it right first time.",
    category: "Insurance",
    readMinutes: 4,
    emoji: "🛡️",
    cover: { from: "#6A3FA0", to: "#A57BDB", ink: "#FFFFFF" },
    body: [
      {
        paragraphs: [
          "Insurance feels like a box to tick, until a visa officer sends your file back because the policy starts a day late. A few details make all the difference.",
        ],
      },
      {
        heading: "Check these four things before you buy",
        paragraphs: [],
        bullets: [
          "Coverage amount — your destination may set a minimum for medical and repatriation costs.",
          "Dates — the policy should cover your whole stay, starting on or before your travel date.",
          "Territory — make sure the country (or the whole Schengen area) is named.",
          "Exclusions — pre-existing conditions are usually not covered. Read the wording.",
        ],
      },
      {
        heading: "Buy before you travel",
        paragraphs: [
          "Policies bought after you've arrived are often not valid for the visa you're applying for. Buy on or before your departure date, and keep the certificate with your visa documents.",
        ],
      },
      {
        heading: "How SOUP and insuremart make it easy",
        paragraphs: [
          "SOUP works with insuremart and Hellenic Sun Insurance Brokers to offer visa-ready student and travel insurance. You enter your destination and dates once, compare plans, and the partner reviews your details before the policy is issued — so the certificate you upload with your visa application is the right one.",
        ],
      },
    ],
  },
  {
    slug: "finding-student-housing",
    title: "Finding a room before you land: the student-housing checklist",
    dek: "How to spot a good listing, avoid scams and lock in a place near campus while you're still at home.",
    category: "Student living",
    readMinutes: 5,
    emoji: "🏠",
    cover: { from: "#E8B90C", to: "#FFE27A", ink: "#3A2E00" },
    body: [
      {
        paragraphs: [
          "Your first home abroad shapes your first semester. The good news: you can secure a safe, verified room long before you fly.",
        ],
      },
      {
        heading: "Decide what you need",
        paragraphs: [],
        bullets: [
          "Budget: rent plus bills, deposit and any booking fee.",
          "Commute: how long to campus by public transport?",
          "Type: student residence, shared flat or studio.",
          "Contract length that matches your semesters.",
        ],
      },
      {
        heading: "Red flags to walk away from",
        paragraphs: [],
        bullets: [
          "Landlords who ask for money by wire before any contract.",
          "Prices far below everything else in the area.",
          "No viewing, no video tour and no verifiable address.",
          "Pressure to decide 'today'.",
        ],
      },
      {
        heading: "Book through verified platforms",
        paragraphs: [
          "SOUP partners with AmberStudent and HousingAnywhere, which list student rooms near universities with verified landlords and secure payment. Search inside SOUP and you'll see options near the campus you've applied to.",
        ],
      },
    ],
  },
  {
    slug: "motivation-letter-that-stands-out",
    title: "Writing a motivation letter admissions teams remember",
    dek: "A simple structure, real examples of what works, and the clichés to cut.",
    category: "Applications",
    readMinutes: 6,
    emoji: "✍️",
    cover: { from: "#B23C0B", to: "#F08A5D", ink: "#FFFFFF" },
    body: [
      {
        paragraphs: [
          "Admissions teams read hundreds of letters that say 'I have always been passionate about…'. The ones they remember are specific. Here's a structure that keeps you specific.",
        ],
      },
      {
        heading: "A five-paragraph structure",
        paragraphs: [],
        bullets: [
          "Hook: one real moment that led you to this subject.",
          "Proof: what you've done about it — projects, work, courses.",
          "Fit: why this program, at this university (name modules, labs, professors).",
          "Future: what you want to do after, and how the degree gets you there.",
          "Close: a confident, short final line.",
        ],
      },
      {
        heading: "Cut these",
        paragraphs: [],
        bullets: ["Quotes from famous people.", "Your whole life story.", "Lists of adjectives about yourself without evidence.", "The same letter for every university."],
      },
      {
        paragraphs: ["SOUP's CV & letter tools help you draft, then tailor each version to the program you're applying to."],
      },
    ],
  },
  {
    slug: "studying-in-europe-on-a-budget",
    title: "Studying in Europe on a budget: where to look",
    dek: "Public universities, lower-cost cities and English-taught programs that don't cost a fortune.",
    category: "Destinations",
    readMinutes: 5,
    emoji: "🇪🇺",
    cover: { from: "#14213D", to: "#3D4A63", ink: "#FFFFFF" },
    body: [
      {
        paragraphs: [
          "Europe has some of the best-value degrees in the world, if you know where to look. Tuition and living costs vary a lot between countries — and between cities in the same country.",
        ],
      },
      {
        heading: "Where the value is",
        paragraphs: [],
        bullets: [
          "Public universities, where tuition for international students is often far lower than at private schools.",
          "Central and Eastern Europe, where cities like Debrecen and Budapest combine strong programs with lower living costs.",
          "Southern Europe, including Greece's public universities, which SOUP works with through a government partner network.",
          "Smaller cities: rent is often a fraction of the capital's.",
        ],
      },
      {
        heading: "Count the full cost",
        paragraphs: ["Tuition is only part of it. Add rent, insurance, transport, food, visa fees and flights before you compare programs."],
      },
      {
        paragraphs: ["SOUP shows partner and independent options side by side, so you can compare honestly — partners are shown first only when they genuinely fit you."],
      },
    ],
  },
];

export function getJournalArticle(slug: string) {
  return JOURNAL_ARTICLES.find((article) => article.slug === slug) || null;
}
