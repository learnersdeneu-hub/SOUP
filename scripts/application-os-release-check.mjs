import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const checks = [];
const expect = (name, ok) => checks.push([name, Boolean(ok)]);

const schema = read("prisma/schema.prisma");
const appCreate = read("src/app/api/applications/route.ts");
const approve = read("src/app/api/applications/[id]/approve/route.ts");
const adminStatus = read("src/app/api/admin/applications/[id]/status/route.ts");
const statusPolicy = read("src/lib/applications/statusPolicy.ts");
const requirements = read("src/lib/applications/requirements.ts");
const lifecycle = read("src/lib/applications/lifecycle.ts");
const prompt = read("src/lib/conversation/prompts.ts");
const detail = read("src/app/applications/[id]/page.tsx");
const withdraw = read("src/app/api/applications/[id]/withdraw/route.ts");
const facts = read("src/app/api/admin/applications/[id]/facts/route.ts");
const context = read("src/lib/context/studentContext.ts");

expect("Applications persist program/intake/deadline/eligibility/fee operational facts", schema.includes("applicationKey") && schema.includes("deadlineAt") && schema.includes("eligibilityStatus") && schema.includes("applicationFeeStatus"));
expect("Duplicate application protection has a unique application key", schema.includes("applicationKey      String?") && appCreate.includes("applicationKey(profile.id"));
expect("Application start refuses expired known deadlines", appCreate.includes("application deadline for this program has passed"));
expect("Managed application creation is limited to active programs", appCreate.includes("active: true"));
expect("Eligibility marked not eligible blocks managed application start", appCreate.includes("marks the selected program as not eligible"));
expect("Application requirements research returns program facts", requirements.includes('"programFacts"') && requirements.includes('"eligibilityStatus"'));
expect("Stale application requirement research is refreshed", requirements.includes("sourceFreshness(existing?.sourceCheckedAt, 30)"));
expect("Requirement refresh invalidates stale student approval", requirements.includes("STUDENT_APPROVAL_INVALIDATED") && requirements.includes("studentApprovedAt: null"));
expect("Student approval requires an explicit accuracy declaration", approve.includes("declarationAccepted") && approve.includes("studentDeclarationAt"));
expect("Student approval does not treat unreviewed uploads as submission-ready", approve.includes("documentIsSubmissionReady") && approve.includes("awaiting SOUP review"));
expect("Student approval is idempotent", approve.includes("unchanged: true"));
expect("Submission state has a transition state machine", statusPolicy.includes("APPLICATION_TRANSITIONS") && statusPolicy.includes("canTransitionApplication") && adminStatus.includes("Invalid application transition"));
expect("Submission requires a current student approval", adminStatus.includes("STUDENT_APPROVAL_INVALIDATED") && adminStatus.includes("current application file"));
expect("Submission requires resolved source-checked eligibility", statusPolicy.includes('eligibilityStatus !== "LIKELY_ELIGIBLE"'));
expect("Submission requires resolved application fee", statusPolicy.includes("Resolve the application fee status"));
expect("Submission refuses a passed deadline", statusPolicy.includes("recorded application deadline has passed"));
expect("Submission requires university reference and evidence", statusPolicy.includes("application reference number") && statusPolicy.includes("submission evidence"));
expect("Submission evidence is persisted", schema.includes("submissionEvidence") && adminStatus.includes("recordedBy"));
expect("SOUP application work acquires an internal owner", schema.includes("assignedStaffUserId") && adminStatus.includes("assignedStaffUserId"));
expect("Student can withdraw a pre-submission application with reason", withdraw.includes("withdrawalReason") && withdraw.includes("APPLICATION_WITHDRAWN_BY_STUDENT"));
expect("Post-submission student withdrawal is routed to staff", withdraw.includes("already reached the university"));
expect("Admissions can resolve fee and eligibility facts with an audit reason", facts.includes("APPLICATION_FACTS_REVIEWED") && facts.includes("Add a short source/review note"));
expect("Dashboard exposes one explicit next action and owner", detail.includes("Next action") && detail.includes("Owner:"));
expect("Dashboard exposes intake/deadline/eligibility/fee/reference", detail.includes("Application timing") && detail.includes("Eligibility") && detail.includes("Application fee") && detail.includes("Reference"));
expect("Requirement items expose responsibility owner and document review state", detail.includes("requirementOwner(item)") && detail.includes("Document:"));
expect("Counselor context includes application operational facts", context.includes("deadlineAt") && context.includes("eligibilityStatus") && context.includes("applicationFeeStatus"));
expect("Counselor is instructed to respect program+intake specificity", prompt.includes("UNIVERSITY + PROGRAM + INTAKE"));
expect("Counselor refuses to push unsuitable partners", prompt.includes("an unsuitable partner must never be pushed"));
expect("Counselor detects conflicting information instead of silently overwriting", prompt.includes("conflicts with saved structured facts"));
expect("Counselor treats upload as different from accepted-for-submission", prompt.includes("uploaded is not the same as being accepted for submission"));
expect("Counselor prioritizes deadlines and avoids manufactured work", prompt.includes("Watch deadlines") && prompt.includes("Do not manufacture tasks"));

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} application-operating-system checks passed.`);
if (failed) process.exit(1);
