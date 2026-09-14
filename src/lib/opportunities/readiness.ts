import type { CareerGoal } from "@prisma/client";
import type { ResumeContent } from "@/lib/resume/types";
import { analyzeResume } from "@/lib/resume/intelligence";

export type GoalReadinessItem = { label: string; detail: string; ready: boolean; href: string };

export function buildGoalReadiness(goal: CareerGoal, resume?: ResumeContent | null): GoalReadinessItem[] {
  const analysis = resume ? analyzeResume(resume) : null;
  return [
    { label: "Career direction", detail: `${goal.targetTitle}${goal.targetOrganization ? ` · ${goal.targetOrganization}` : ""}`, ready: Boolean(goal.targetTitle), href: "/opportunities" },
    { label: "Target location", detail: goal.targetCountry || "Add a target country if geography matters to this goal.", ready: Boolean(goal.targetCountry), href: "/opportunities" },
    { label: "Resume foundation", detail: analysis ? `Resume Health ${analysis.healthScore}% — based on explainable resume checks.` : "Create or import a resume so GCI can assess your application foundation.", ready: Boolean(resume && analysis && analysis.healthScore >= 60), href: "/resume/intelligence" },
    { label: "Role targeting", detail: analysis ? `Role Targeting ${analysis.targetingScore}%` : "No resume targeting data yet.", ready: Boolean(analysis && analysis.targetingScore >= 60), href: "/resume/intelligence" },
    { label: "Evidence and impact", detail: analysis ? `Evidence & Impact ${analysis.impactScore}%` : "No resume evidence analysis yet.", ready: Boolean(analysis && analysis.impactScore >= 50), href: "/resume/intelligence" },
  ];
}
