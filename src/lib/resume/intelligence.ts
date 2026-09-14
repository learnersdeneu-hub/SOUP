import type { ResumeContent } from "@/lib/resume/types";

export type IntelligencePriority = "HIGH" | "MEDIUM" | "LOW";
export type IntelligenceStatus = "DONE" | "IN_PROGRESS" | "NOT_STARTED";

export type ResumeSignal = {
  id: string;
  title: string;
  detail: string;
  passed: boolean;
  weight: number;
  category: "FOUNDATION" | "EXPERIENCE" | "IMPACT" | "SKILLS" | "TARGETING" | "ATS";
};

export type ResumeRecommendation = {
  id: string;
  title: string;
  why: string;
  action: string;
  priority: IntelligencePriority;
  checkpoint: string;
  suggestedWindowDays: 30 | 90 | 180;
};

export type ResumeCheckpoint = {
  id: string;
  label: string;
  description: string;
  status: IntelligenceStatus;
  targetDays: 30 | 90 | 180;
  priority: IntelligencePriority;
};

export type ResumeIntelligence = {
  healthScore: number;
  atsReadinessScore: number;
  sectionCompletenessScore: number;
  impactScore: number;
  targetingScore: number;
  signals: ResumeSignal[];
  recommendations: ResumeRecommendation[];
  checkpoints: ResumeCheckpoint[];
  strengths: string[];
  missingSections: string[];
  summary: string;
};

const METRIC_PATTERN = /(?:\b\d+(?:\.\d+)?%|\b\d+[+,]?\s*(?:users|clients|customers|students|projects|people|members|sales|leads|hours|days|weeks|months|years|applications|cases|teams|countries|markets)\b|[$£€]\s?\d|\b\d+[kKmM]\b)/;
const ACTION_VERBS = /\b(achieved|built|created|delivered|designed|developed|drove|improved|increased|launched|led|managed|optimized|organised|organized|reduced|researched|resolved|secured|supported|trained|won|implemented|coordinated|produced|analysed|analyzed)\b/i;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function allBullets(content: ResumeContent) {
  return [
    ...content.experience.flatMap((item) => item.bullets || []),
    ...content.achievements,
    ...content.projects.map((item) => item.description),
  ].filter(hasText);
}

function recommendation(
  id: string,
  title: string,
  why: string,
  action: string,
  priority: IntelligencePriority,
  checkpoint: string,
  suggestedWindowDays: 30 | 90 | 180,
): ResumeRecommendation {
  return { id, title, why, action, priority, checkpoint, suggestedWindowDays };
}

export function analyzeResume(content: ResumeContent): ResumeIntelligence {
  const bullets = allBullets(content);
  const quantifiedBullets = bullets.filter((bullet) => METRIC_PATTERN.test(bullet));
  const actionBullets = bullets.filter((bullet) => ACTION_VERBS.test(bullet));
  const targetRole = content.targetRole?.trim() || "";
  const summary = content.personal.summary?.trim() || "";
  const skills = content.skills.filter(hasText);
  const experience = content.experience.filter((item) => hasText(item.employer) || hasText(item.title));
  const education = content.education.filter((item) => hasText(item.institution) || hasText(item.qualification));
  const projects = content.projects.filter((item) => hasText(item.name) || hasText(item.description));

  const signals: ResumeSignal[] = [
    { id: "contact-email", title: "Professional email is present", detail: "Recruiters need a reliable contact method.", passed: hasText(content.personal.email), weight: 7, category: "FOUNDATION" },
    { id: "contact-location", title: "Location is present", detail: "Location helps employers understand availability and mobility.", passed: hasText(content.personal.location), weight: 4, category: "FOUNDATION" },
    { id: "headline", title: "Clear professional headline", detail: "A focused headline helps establish the profile at a glance.", passed: hasText(content.personal.headline) && content.personal.headline.trim().length >= 8, weight: 7, category: "TARGETING" },
    { id: "target-role", title: "Target role is defined", detail: "A defined target makes tailoring and keyword analysis more meaningful.", passed: targetRole.length >= 3, weight: 8, category: "TARGETING" },
    { id: "summary", title: "Professional summary is substantial", detail: "A concise 35–110 word summary gives context without overcrowding the resume.", passed: summary.split(/\s+/).filter(Boolean).length >= 35 && summary.split(/\s+/).filter(Boolean).length <= 110, weight: 8, category: "FOUNDATION" },
    { id: "education", title: "Education section is populated", detail: "Education is a core background section for students and many early-career applicants.", passed: education.length > 0, weight: 8, category: "FOUNDATION" },
    { id: "experience", title: "Experience section is populated", detail: "Experience gives employers evidence of applied capability.", passed: experience.length > 0, weight: 10, category: "EXPERIENCE" },
    { id: "bullets", title: "Experience uses achievement bullets", detail: "Structured bullets are easier to scan than dense paragraphs.", passed: bullets.length >= 3, weight: 7, category: "ATS" },
    { id: "action-language", title: "Bullets use action-oriented language", detail: "Action verbs make ownership and contribution clearer.", passed: bullets.length > 0 && actionBullets.length / bullets.length >= 0.5, weight: 8, category: "IMPACT" },
    { id: "quantified-impact", title: "Achievements include measurable evidence", detail: "Numbers, percentages and scale make impact easier to evaluate.", passed: quantifiedBullets.length >= Math.min(2, Math.max(1, Math.ceil(bullets.length / 4))), weight: 10, category: "IMPACT" },
    { id: "skills", title: "Skills section has useful breadth", detail: "A focused skills section helps matching systems and human reviewers.", passed: skills.length >= 5, weight: 7, category: "SKILLS" },
    { id: "linkedin", title: "Professional profile link is present", detail: "A LinkedIn or portfolio link gives employers another evidence source.", passed: hasText(content.personal.linkedin) || hasText(content.personal.portfolio), weight: 5, category: "FOUNDATION" },
    { id: "projects", title: "Projects or additional evidence are included", detail: "Projects are especially useful for students, graduates and career changers.", passed: projects.length > 0 || content.achievements.length > 0 || content.certifications.length > 0, weight: 6, category: "EXPERIENCE" },
    { id: "languages", title: "Languages are captured where relevant", detail: "Language capability can be important for international and customer-facing roles.", passed: content.languages.length > 0, weight: 5, category: "SKILLS" },
  ];

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const passedWeight = signals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0);
  const healthScore = clamp((passedWeight / totalWeight) * 100);

  const atsSignals = signals.filter((signal) => ["ATS", "TARGETING", "SKILLS"].includes(signal.category));
  const atsWeight = atsSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const atsPassed = atsSignals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0);
  const atsReadinessScore = clamp((atsPassed / atsWeight) * 100);

  const foundationSignals = signals.filter((signal) => signal.category === "FOUNDATION");
  const foundationWeight = foundationSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const foundationPassed = foundationSignals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0);
  const sectionCompletenessScore = clamp((foundationPassed / foundationWeight) * 100);

  const impactSignals = signals.filter((signal) => signal.category === "IMPACT");
  const impactScore = clamp((impactSignals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0) / Math.max(1, impactSignals.reduce((sum, signal) => sum + signal.weight, 0))) * 100);

  const targetingSignals = signals.filter((signal) => signal.category === "TARGETING");
  const targetingScore = clamp((targetingSignals.filter((signal) => signal.passed).reduce((sum, signal) => sum + signal.weight, 0) / Math.max(1, targetingSignals.reduce((sum, signal) => sum + signal.weight, 0))) * 100);

  const recommendations: ResumeRecommendation[] = [];
  if (!signals.find((s) => s.id === "target-role")?.passed) recommendations.push(recommendation("define-target", "Define one target role", "Without a target role, SOUP cannot meaningfully judge whether your wording and skills are focused enough.", "Add the exact role, internship, programme or career direction you are preparing for.", "HIGH", "Target role defined", 30));
  if (!signals.find((s) => s.id === "summary")?.passed) recommendations.push(recommendation("strengthen-summary", "Strengthen your opening summary", "Your opening should quickly explain who you are, what you can do, and what direction you are targeting.", "Rewrite the summary to roughly 35–110 words and connect it to your strongest evidence.", "HIGH", "Focused professional summary completed", 30));
  if (!signals.find((s) => s.id === "quantified-impact")?.passed) recommendations.push(recommendation("quantify-impact", "Add measurable outcomes", "Recruiters can evaluate evidence faster when achievements include scale, results or outcomes.", "Add numbers, percentages, volume, time saved, people reached or another truthful measure to at least two achievements.", "HIGH", "At least two achievements quantified", 30));
  if (!signals.find((s) => s.id === "action-language")?.passed) recommendations.push(recommendation("action-language", "Rewrite passive bullets as achievements", "Action-oriented bullets make your contribution easier to understand.", "Start more bullets with a clear action verb and describe the result rather than only listing duties.", "MEDIUM", "Major experience bullets rewritten", 30));
  if (!signals.find((s) => s.id === "skills")?.passed) recommendations.push(recommendation("skills-depth", "Build a focused skills section", "A short but relevant skills list supports both human scanning and role matching.", "List at least five genuine skills that are relevant to your target.", "MEDIUM", "Relevant skills section completed", 30));
  if (!signals.find((s) => s.id === "experience")?.passed) recommendations.push(recommendation("experience-evidence", "Add applied experience", "Employers need evidence that you have used your knowledge in real or project settings.", "Add employment, internship, volunteering, substantial projects or another truthful form of applied experience.", "HIGH", "Applied experience added", 90));
  if (!signals.find((s) => s.id === "projects")?.passed) recommendations.push(recommendation("project-evidence", "Add a project, achievement or certification", "Additional evidence helps early-career candidates show capability beyond formal employment.", "Add one substantial project, competition, certification or achievement that demonstrates relevant ability.", "MEDIUM", "Additional evidence added", 90));
  if (!signals.find((s) => s.id === "linkedin")?.passed) recommendations.push(recommendation("professional-link", "Add a professional profile or portfolio", "A relevant external professional profile can reinforce the information in your resume.", "Add LinkedIn, GitHub, Behance, a portfolio or another professional link if relevant.", "LOW", "Professional profile linked", 30));
  if (!signals.find((s) => s.id === "education")?.passed) recommendations.push(recommendation("education", "Complete education information", "Education is an important resume field for students, graduates and many professional roles.", "Add your most relevant qualification, institution and field of study.", "HIGH", "Education section completed", 30));

  const checkpoints: ResumeCheckpoint[] = recommendations.map((item) => ({
    id: item.id,
    label: item.checkpoint,
    description: item.action,
    status: "NOT_STARTED",
    targetDays: item.suggestedWindowDays,
    priority: item.priority,
  }));

  if (recommendations.length === 0) {
    checkpoints.push({ id: "maintain", label: "Keep your resume current", description: "Review your resume whenever you complete a new role, project, award or qualification.", status: "IN_PROGRESS", targetDays: 90, priority: "LOW" });
  }

  const strengths = signals.filter((signal) => signal.passed).sort((a, b) => b.weight - a.weight).slice(0, 5).map((signal) => signal.title);
  const missingSections: string[] = [];
  if (!experience.length) missingSections.push("Experience / applied work");
  if (!education.length) missingSections.push("Education");
  if (!projects.length) missingSections.push("Projects");
  if (!skills.length) missingSections.push("Skills");
  if (!content.certifications.length) missingSections.push("Certifications (if relevant)");
  if (!content.languages.length) missingSections.push("Languages (if relevant)");

  const summaryText = healthScore >= 85
    ? "Your resume has a strong structural foundation. The biggest gains now come from role-specific tailoring and maintaining evidence as your experience grows."
    : healthScore >= 65
      ? "Your resume has a workable foundation, with several clear opportunities to strengthen evidence, targeting and recruiter readability."
      : "Your resume has important gaps that can be improved systematically. Focus first on the highest-priority checkpoints rather than changing everything at once.";

  return {
    healthScore,
    atsReadinessScore,
    sectionCompletenessScore,
    impactScore,
    targetingScore,
    signals,
    recommendations,
    checkpoints,
    strengths,
    missingSections,
    summary: summaryText,
  };
}
