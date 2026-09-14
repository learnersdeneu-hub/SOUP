import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const home = read('src/app/page.tsx');
const counselor = read('src/components/counselor/CounselorConversation.tsx');
const journey = read('src/components/counselor/ApplicationJourneyPanel.tsx');
const status = read('src/app/api/counselor/status/route.ts');
const workspace = read('src/components/conversation/ConversationWorkspace.tsx');
const stream = read('src/app/api/conversation/stream/route.ts');
const dashboard = read('src/app/dashboard/page.tsx');
const universityIndex = read('src/app/universities/page.tsx');
const universityDetail = read('src/app/universities/[id]/page.tsx');
const approval = read('src/app/api/applications/[id]/approve/route.ts');
const seed = read('prisma/seed.js');
const resumeConversation = read('src/components/resume/ResumeConversation.tsx');
const resumeImport = read('src/components/resume/ResumeImport.tsx');
const serviceDirectory = read('src/components/services/ServicePartnerDirectory.tsx');
const prompts = read('src/lib/conversation/prompts.ts');
const readiness = read('src/lib/applications/readiness.ts');
const itemStatus = read('src/app/api/journey/item-status/route.ts');
const appDetail = read('src/app/applications/[id]/page.tsx');
const caseLogic = read('src/lib/student/case.ts');
const adminReqStatus = read('src/app/api/admin/applications/[id]/requirements/[itemId]/status/route.ts');
const adminAppStatus = read('src/app/api/admin/applications/[id]/status/route.ts');

const checks = [
  ['Homepage routes service cards to dedicated service modules', /\/services\/accommodation/.test(home) && /\/services\/insurance/.test(home) && /\/services\/finance/.test(home)],
  ['University cards are clickable', /href=\{`\/universities\/\$\{university\.id\}`\}/.test(home) && /SOUP university network/.test(universityIndex)],
  ['University detail view includes programs and Counselor handoff', /Programs in SOUP/.test(universityDetail) && /Ask SOUP about this university/.test(universityDetail)],
  ['University/service logo treatment exists', /PartnerLogo/.test(home) && /PartnerLogo/.test(universityIndex)],
  ['Confirmed partner roles are present', /MCB Islamic Bank/.test(home) && /LearnersDen\.eu/.test(home) && /Hellenic Sun/.test(home)],
  ['Core partners are seedable', /mcb-islamic-bank/.test(seed) && /learnersden-application-management/.test(seed)],
  ['Counselor status exposes SOUP work, student action and applications', /whatSoupIsDoing/.test(status) && /pendingDocument/.test(status) && /applicationSummaries/.test(status)],
  ['Journey UI shows command-center context', /What SOUP is doing/.test(journey) && /What you need to do/.test(journey) && /SOUP-managed/.test(journey)],
  ['Pending application document drives contextual Counselor upload', /pendingRequirement/.test(counselor) && /effectiveChecklistItemId/.test(counselor) && /effectiveApplicationId/.test(counselor)],
  ['Counselor action card stays above composer', /bottomAction \? <div/.test(workspace) && /min-h-0 min-w-0 flex-1/.test(workspace)],
  ['Student application approval route requires core facts and outstanding student actions to be complete', /STUDENT_APPROVED_FOR_SUBMISSION/.test(approval) && /missingCoreApplicationInformation/.test(approval) && /student action/.test(approval) && /READY_TO_SUBMIT/.test(approval)],
  ['Dashboard has journey tracker and application command centre', /JOURNEY_STAGES/.test(dashboard) && /Application command centre/.test(dashboard)],
  ['AI stream retries without grounded search when grounding fails before output', /retrying once against the/.test(stream) && /runAttempt\(false\)/.test(stream)],
  ['AI errors are logged server-side but student message is provider-neutral', /console\.error\("\[SOUP AI\]/.test(stream) && /Your message is saved/.test(stream) && !/Gemini request failed/.test(stream)],
  ['Guest private resume upload is login-gated', /Create account to upload/.test(resumeImport) && /sign-up\?next/.test(resumeImport) && /Sign up to attach a resume/.test(resumeConversation)],
  ['Resume/CV generation is login-gated before file creation', /Create free account & generate/.test(resumeConversation) && /if \(!signedIn\).*sign-up/.test(resumeConversation)],
  ['Counselor prompt is concise, anti-repetitive and partner-decision oriented', /60-140 words/.test(prompts) && /never repeat the same question/.test(prompts) && /Would you like me to start an application/.test(prompts)],
  ['Counselor runtime carries explicit anti-repeat guard', /RESPONSE DISCIPLINE/.test(stream) && /maxTokens: workflow === "COUNSELOR" \? 1100/.test(stream)],
  ['Counselor journey is compact by default with clickable detail controls', /View details/.test(journey) && /href=\{href\}/.test(journey) && /Hide details/.test(journey)],
  ['Homepage service cards expose partner previews', /partnerPreview/.test(home) && /PartnerLogo/.test(home)],
  ['Service pages show partners directly and keep chat optional', /Partner options are shown directly below; chat is optional/.test(serviceDirectory) && /Ask SOUP for guidance/.test(serviceDirectory)],
  ['Managed application core identity and academic readiness is enforced', /date of birth/.test(readiness) && /nationality/.test(readiness) && /academic background/.test(readiness) && /Core application information/.test(appDetail)],
  ['Counselor can persist core applicant identity facts', /fullName/.test(caseLogic) && /nationality/.test(caseLogic) && /currentCountry/.test(caseLogic) && /dateOfBirth/.test(caseLogic)],
  ['Student can complete non-document admission actions but not SOUP operations', /studentReportedComplete/.test(itemStatus) && /SOUP admissions operation/.test(itemStatus)],
  ['Application requirements separate student work from SOUP submission operations', /responsibleParty/.test(readiness) && /approvalBlocking/.test(readiness) && /SOUP handling/.test(appDetail)],
  ['Staff review cannot create student approval implicitly', /READY_TO_SUBMIT is reserved for explicit student approval/.test(adminReqStatus) && !/checklistReady \? "READY_TO_SUBMIT"/.test(adminReqStatus)],
  ['Submission requires recorded student approval plus completed admissions checklist', /STUDENT_APPROVED_FOR_SUBMISSION/.test(adminAppStatus) && /status === "SUBMITTED"/.test(adminAppStatus) && /still incomplete/.test(adminAppStatus)],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}
console.log(`\n${checks.length - failed}/${checks.length} investor-beta release checks passed.`);
if (failed) process.exitCode = 1;
