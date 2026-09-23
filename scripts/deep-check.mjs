import fs from 'node:fs';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260829190000_soup_student_journey/migration.sql');
const env = read('.env.example');
const home = read('src/app/page.tsx');
const authActions = read('src/app/actions/auth.ts');
const authCallback = read('src/app/auth/callback/route.ts');
const header = read('src/components/Header.tsx');
const prompts = read('src/lib/conversation/prompts.ts');
const workspace = read('src/components/conversation/ConversationWorkspace.tsx');
const counselor = read('src/components/counselor/CounselorConversation.tsx');
const stream = read('src/app/api/conversation/stream/route.ts');
const rateLimiter = read('src/lib/ai/rateLimiter.ts');
const httpRateLimit = read('src/lib/ai/httpRateLimit.ts');
const gemini = read('src/lib/ai/providers/gemini.ts');
const studentContext = read('src/lib/context/studentContext.ts');
const studentCase = read('src/lib/student/case.ts');
const partnerRelevance = read('src/lib/partners/relevance.ts');
const planRoute = read('src/app/api/counselor/application-plan/route.ts');
const planPage = read('src/app/plans/[id]/page.tsx');
const planPdf = read('src/lib/pdf/applicationPlan.tsx');
const checklistRoute = read('src/app/api/counselor/checklist/route.ts');
const counselorChecklist = checklistRoute;
const journeyPage = read('src/app/journey/page.tsx');
const applicationRoute = read('src/app/api/applications/route.ts');
const applicationRequirements = read('src/lib/applications/requirements.ts');
const applicationAttach = read('src/app/api/journey/attach-document/route.ts');
const attachDocumentHelper = read('src/lib/journey/attachDocumentToItem.ts');
const requirementUploadRoute = read('src/app/api/applications/[id]/requirements/[itemId]/upload/route.ts');
const applicationDetailPage = read('src/app/applications/[id]/page.tsx');
const journeyReconcile = read('src/lib/journey/reconcile.ts');
const applicationStaffStatus = read('src/app/api/admin/applications/[id]/requirements/[itemId]/status/route.ts');
const applicationStatus = read('src/app/api/admin/applications/[id]/status/route.ts');
const adminApplicationDetail = read('src/app/admin/applications/[id]/page.tsx');
const applicationsPage = read('src/app/applications/page.tsx');
const evidenceRoute = read('src/app/api/evidence/process/route.ts');
const insuranceStart = read('src/app/api/services/insurance/start/route.ts');
const referralStart = read('src/app/api/services/referral/start/route.ts');
const serviceDirectory = read('src/components/services/ServicePartnerDirectory.tsx');
const serviceHistory = read('src/app/services/history/page.tsx');
const referralHelper = read('src/lib/services/referrals.ts');
const offerRoute = read('src/app/api/admin/applications/[id]/offer/route.ts');
const adminUser = read('src/app/admin/users/[profileId]/page.tsx');
const documentsPage = read('src/app/documents/page.tsx');
const referralAdmin = read('src/app/admin/referrals/page.tsx');
const referralAction = read('src/app/actions/referrals.ts');
const handoffAction = read('src/app/actions/handoff.ts');
const handoffPage = read('src/app/admin/users/[profileId]/conversations/[sessionId]/page.tsx');
const roles = read('src/lib/auth/roles.ts');
const roleAction = read('src/app/actions/userRoles.ts');
const adminDashboard = read('src/app/admin/page.tsx');
const dashboard = read('src/app/dashboard/page.tsx');
const historyRoute = read('src/app/api/conversation/history/route.ts');
const sessionsRoute = read('src/app/api/conversation/sessions/route.ts');
const conversationMessageRoute = read('src/app/api/conversation/message/route.ts');
const seedImport = read('scripts/import-soup-partners.mjs');
const catalogImport = read('scripts/import-soup-partner-catalog.mjs');
const partnerAdmin = read('src/app/admin/partners/page.tsx');
const partnerDetail = read('src/app/admin/partners/[id]/page.tsx');
const partnerActions = read('src/app/actions/partners.ts');
const doctor = read('scripts/doctor.mjs');
const preflight = read('scripts/preflight.mjs');
const healthRoute = read('src/app/api/health/route.ts');
const nextConfig = read('next.config.mjs');
const safeUrls = read('src/lib/security/urls.ts');
const conversationTrust = read('src/lib/conversation/trust.ts');
const journeyChecklistHelpers = read('src/lib/journey/checklists.ts');
const storageSetup = read('docs/SUPABASE_STORAGE_SETUP.sql');
const adminDocuments = read('src/app/actions/adminDocuments.ts');
const currentUser = read('src/lib/auth/currentUser.ts');
const provision = read('src/lib/auth/provision.ts');
const resumeConversation = read('src/components/resume/ResumeConversation.tsx');
const resumeAi = read('src/lib/resume/ai.ts');
const resumeGenerateRoute = read('src/app/api/resume/generate/route.ts');
const resumeGenerateConversation = read('src/app/api/resume/generate-conversation/route.ts');
const resumeImportRoute = read('src/app/api/resume/import/route.ts');
const studentAlerts = read('src/lib/student/alerts.ts');
const homeAiEntry = read('src/components/home/HomeAIEntry.tsx');
const legacyPages = ['src/app/report/page.tsx','src/app/financial/page.tsx','src/app/learn/page.tsx','src/app/opportunities/page.tsx','src/app/chat/page.tsx'].map(read).join('\n');
const disabledLegacyApis = ['src/app/api/report/finalize/route.ts','src/app/api/financial/finalize/route.ts','src/app/api/financial/preference/route.ts','src/app/api/export/report/route.ts','src/app/api/export/report-snapshot/route.ts','src/app/api/export/financial-snapshot/route.ts','src/app/api/chat/stream/route.ts'].map(read).join('\n');

check('Package is a separate SOUP application', pkg.name === 'soup-app' && /SOUP/.test(header) && !/GCI\.ai/.test(home));
check('GCI visual shell is retained as chat-first product', /ConversationSidebar/.test(workspace) && /rounded-\[28px\]/.test(workspace) && /bg-navy/.test(workspace) && /Message SOUP/.test(workspace));
check('Home exposes Ask SOUP plus agreed service entry points', ['Ask Noodles','Universities & Programs','Accommodation','Student Insurance','Student Finance','Resume & Cover Letter','University network'].every((label) => (home + homeAiEntry).includes(label)));
check('Counselor is a first-class workflow', /COUNSELOR/.test(schema) && /workflow="COUNSELOR"/.test(counselor) && /COUNSELOR/.test(stream));
check('Counselor establishes geography before serious university search', /preferred region\/country scope/.test(prompts) && /worldwide/.test(prompts) && /narrow/.test(prompts));
check('Saved university plans enforce the server-owned geography scope', /inferSearchCountries\(studentCase\)/.test(planRoute) && /countryMatchesScope/.test(planRoute) && /studentCase\.searchScope \|\| clean\(result\.regionScope/.test(planRoute) && /COUNTRY_EQUIVALENTS/.test(partnerRelevance));
check('Single-country scopes are enforced without duplicated preferredCountries', /knownCountries/.test(partnerRelevance) && /exactCountry/.test(partnerRelevance));
check('Student-facing university percentages are prohibited', /NEVER show percentage match scores/.test(prompts) && /does not display university match percentages/.test(planPage) && !/matchScore|matchPercentage/.test(planPage));
check('University match percentages are runtime-sanitized as well as prompt-prohibited', /stripUniversityMatchPercentages/.test(conversationTrust) && /stripUniversityMatchPercentages/.test(workspace) && /stripUniversityMatchPercentages/.test(planRoute));
check('University match fractions and out-of-ten scores are runtime-sanitized', /out\\s\+of/.test(conversationTrust) && /\\s\*\\\/\\s\*/.test(conversationTrust));
check('University shortlist size is dynamic rather than padded', /TARGET ABOUT 10/.test(prompts) && /Ten is a target, never padding/.test(prompts) && /Do not pad the list/.test(planRoute));
check('Partner priority is separate from academic suitability', /hard constraints are non-negotiable/.test(prompts) && /Partner status may improve the ranking of an already-suitable option/.test(prompts) && /Independent Recommendation/.test(planPage));
check('Student Case persists academic, English and funding context', /academicBackgroundSummary/.test(schema) && /englishProficiencySummary/.test(schema) && /fundingSummary/.test(schema) && /fields\.academic/.test(studentCase));
check('Partner retrieval combines geography, subject and degree without OR leakage', /combine as AND conditions/.test(partnerRelevance) && /academicProgramWhere/.test(partnerRelevance) && /where\.OR =/.test(partnerRelevance) && /where\.level =/.test(partnerRelevance) && /programs: \{ some: programWhere \}/.test(partnerRelevance) && /universities: \{ some: universityWhere \}/.test(partnerRelevance));
check('AI Counselor context excludes internal partner priority and referral financials', !/internalPriority: true/.test(partnerRelevance) && /compactReferrals/.test(studentContext) && !/serviceReferrals: referrals/.test(studentContext) && !/profileCompletenessPct/.test(studentContext));
check('AI Counselor checklist context omits staff reviewer identities and internal notes', /compactChecklists/.test(studentContext) && /checklists: compactChecklists/.test(studentContext) && !/admissionsDecisionByUserId/.test(studentContext) && !/admissionsDecisionAt/.test(studentContext));
check('Counselor context retrieves a bounded partner subset', /getRelevantUniversityPartners\(studentCase, 24\)/.test(studentContext) && /relevantSoupUniversityPartners/.test(studentContext));
check('Application Plan uses live grounded research', /tools: \{ googleSearch: true \}/.test(planRoute) && /OFFICIAL university\/program pages/.test(planRoute));
check('Plan and checklist finalizers bind to the exact open Counselor thread', /sessionId: activeSessionId/.test(counselor) && /requestedSessionId/.test(planRoute) && /id: requestedSessionId/.test(planRoute) && /requestedSessionId/.test(checklistRoute) && /id: requestedSessionId/.test(checklistRoute));
check('Finalizers use the newest bounded messages instead of truncating the end of long threads', /createdAt: \"desc\"/.test(planRoute) && /sessionMessages = \[\.\.\.session\.messages\]\.reverse\(\)/.test(planRoute) && /createdAt: \"desc\"/.test(checklistRoute) && /sessionMessages = \[\.\.\.session\.messages\]\.reverse\(\)/.test(checklistRoute) && /createdAt: \"desc\"/.test(resumeGenerateConversation) && /sessionMessages = \[\.\.\.session\.messages\]\.reverse\(\)/.test(resumeGenerateConversation));
check('Research finalizers use the live-chat trust boundary for imported history', /buildTrustedConversationTranscript/.test(conversationTrust) && /GUEST_IMPORT/.test(conversationTrust) && /Untrusted pre-signup assistant bubble/.test(conversationTrust) && /buildTrustedConversationTranscript\(sessionMessages/.test(planRoute) && /buildTrustedConversationTranscript\(sessionMessages/.test(checklistRoute));
check('Application Plan persists grounded source metadata', /groundingSources/.test(planRoute) && /researchSummary/.test(schema));
check('Research-generated plans and checklists refuse source-less official guidance', /officialUniversityUrl/.test(planRoute) && /safeHttpUrl/.test(planRoute) && /!sourceUrl && !groundingSources\.length/.test(checklistRoute) && /!sourceUrl && !groundingSources\.length/.test(applicationRequirements));
check('Application Plan is versioned and downloadable as PDF', /version = \(latest\?\.version \|\| 0\) \+ 1/.test(planRoute) && /application\/pdf/.test(read('src/app/api/export/application-plan/route.ts')) && /ApplicationPlanPDF/.test(read('src/app/api/export/application-plan/route.ts')) && /Download PDF/.test(planPage));
check('Only saved genuine partner recommendations can start SOUP-managed applications', /SOUP_MANAGED/.test(applicationRoute) && /shortlistItemId/.test(applicationRoute) && /isPartnerAtGeneration: true/.test(applicationRoute) && /shortlist: \{ profileId: profile\.id \}/.test(applicationRoute) && /partner/.test(applicationRoute) && /SOUP Partner/.test(planPage));
check('Independent university recommendations cannot become SOUP-managed applications', /independent recommendation/.test(applicationRoute) && /cannot submit this application through the platform/.test(applicationRoute) && /Independent Recommendation/.test(planPage));
check('Managed applications have source-backed per-application requirements', /Google Search grounding/.test(applicationRequirements) && /applicationId/.test(applicationRequirements) && /const groundingSources = safeResearchSources\(research\.sources\)/.test(applicationRequirements) && /groundingSources,/.test(applicationRequirements) && /kind: "ADMISSION"/.test(applicationRequirements));
// studentApplicationDocument.upsert now lives in the shared
// attachDocumentToChecklistItem helper (see attachDocumentHelper below),
// used by both the Noodles-driven attach-document route and the direct,
// AI-independent per-requirement upload route — not duplicated between them.
// "Upload with Counselor" was intentionally removed from the application
// page (replaced with a direct upload that never depends on AI/Counselor);
// this check now asserts its absence, not its presence.
check('Application documents bind to the exact application requirement', /checklistItemId/.test(applicationAttach) && /attachDocumentToChecklistItem/.test(applicationAttach) && /studentApplicationDocument\.upsert/.test(attachDocumentHelper) && /requestItem/.test(counselor) && !/Upload with Counselor/.test(applicationDetailPage) && /RequirementUploadButton/.test(applicationDetailPage));
// Matches actual AI-call code patterns (imports/functions), not prose —
// the route's own comments legitimately name "Gemini" while explaining why
// this path deliberately avoids it, which a bare word match would wrongly
// flag.
check('Application requirement uploads never depend on AI/Counselor succeeding', /export async function POST/.test(requirementUploadRoute) && !/collectAIText\(|collectAIResult\(|getAIProvider\(|googleSearch:|from "@\/lib\/ai\//.test(requirementUploadRoute) && /attachDocumentToChecklistItem/.test(requirementUploadRoute));
check('Admissions staff controls application-file completion', /Accept for file/.test(read('src/components/admin/ApplicationRequirementOperations.tsx')) && /admissionsDecisionByUserId/.test(applicationStaffStatus) && /READY_TO_SUBMIT/.test(applicationStaffStatus) && /Staff acceptance here means/.test(adminApplicationDetail));
check('Admissions readiness is calculated from the current checklist only', /where: \{ checklistId: item\.checklistId, required: true \}/.test(applicationStaffStatus));
check('Staff can refresh official application requirements', /generatedBy: "STAFF"/.test(read('src/app/api/admin/applications/[id]/requirements/route.ts')) && /Refresh official requirements/.test(adminApplicationDetail) && /supersedesChecklistId/.test(applicationRequirements));
check('Requirement refresh atomically retires the prior checklist', /prisma\.\$transaction/.test(applicationRequirements) && /supersededByChecklistId/.test(applicationRequirements) && /journeyChecklistItem\.updateMany/.test(applicationRequirements) && /NOT_APPLICABLE/.test(applicationRequirements));
check('Superseded checklists cannot keep driving journey operations', /isSupersededChecklist/.test(journeyChecklistHelpers) && /isSupersededChecklist/.test(applicationAttach) && /isSupersededChecklist/.test(journeyReconcile) && /isSupersededChecklist/.test(journeyPage) && /isSupersededChecklist/.test(studentContext));
check('Exact requested checklist item is not lost behind a global query cap', /id: checklistItemId/.test(applicationAttach) && /journeyChecklistItem\.findFirst/.test(applicationAttach));
check('Submission is blocked until required application items are complete', /status === "SUBMITTED"/.test(applicationStatus) && /submissionGuardError/.test(applicationStatus) && /incompleteRequiredItems/.test(read('src/lib/applications/statusPolicy.ts')) && /still incomplete/.test(read('src/lib/applications/statusPolicy.ts')));
check('Documents are requested contextually in chat', /DOCUMENT_REQUEST/.test(prompts) && /Do not request documents pre-emptively/.test(prompts) && /documentLabel/.test(counselor) && /Upload document/.test(counselor));
check('Uploaded evidence enters the persistent document vault', /tx\.document\.create/.test(evidenceRoute) && /sourceWorkflow/.test(evidenceRoute) && /document vault/.test(counselor));
check('Grounded chat sources are stored and restored with history', /metadata  Json\?/.test(schema) && /groundingMetadata/.test(gemini) && /sources/.test(stream) && /metadata: message\.metadata/.test(sessionsRoute) && /Source ·/.test(workspace));
check('Visa/pre-departure checklist uses current official-source research', /official embassy, consulate, immigration authority/.test(checklistRoute) && /tools: \{ googleSearch: true \}/.test(checklistRoute));
check('Journey checklist persists sources and one-by-one status', /const groundingSources = safeResearchSources\(research\.sources\)/.test(checklistRoute) && /groundingSources,/.test(checklistRoute) && /WAITING_FOR_DOCUMENT/.test(checklistRoute) && /supplied \/ completed/.test(journeyPage));
check('SOUP never equates uploaded documents with authority approval', /not a statement of university, embassy or authority approval/.test(journeyPage) && /does not mean an embassy, university or other authority has formally accepted it/.test(counselor));
check('Automatic document reuse is limited to stable identity/academic evidence', /AUTO_REUSABLE_CLASSES/.test(journeyReconcile) && /PASSPORT/.test(journeyReconcile) && /ACADEMIC_TRANSCRIPT/.test(journeyReconcile) && !/AUTO_REUSABLE_CLASSES[\s\S]*BANK_STATEMENT[\s\S]*\]\);/.test(journeyReconcile));
check('Official visa/pre-departure checklists persist document classes for safe reconciliation', /documentClass/.test(counselorChecklist) && /authorityApproved: false/.test(counselorChecklist) && /expectedClass === normalizedClass/.test(journeyReconcile));
check('Ambiguous document labels cannot silently bind across applications', /selectAttachmentCandidate/.test(applicationAttach) && /selection\.kind === "ambiguous"/.test(applicationAttach) && /ambiguous: true/.test(applicationAttach) && /matches\.length > 1/.test(read('src/lib/journey/attachmentMatching.ts')));
check('Insurance purchase route requires active SOUP partner inventory', /status: "ACTIVE"/.test(insuranceStart) && /INSURANCE/.test(insuranceStart) && /transactionUrl/.test(insuranceStart));
check('Other service transactions also require active partner inventory', /status: "ACTIVE"/.test(referralStart) && /partnerId/.test(referralStart) && /authorized online transaction\/referral route/.test(referralStart));
check('Service directories prioritize partners relevant to the saved journey', /latestDestination/.test(serviceDirectory) && /preferredCountries/.test(serviceDirectory) && /Relevant to your saved journey/.test(serviceDirectory));
check('Student partner-service history is persistent but hides commercial internals', /Services & partner activity/.test(serviceHistory) && /serviceReferral\.findMany/.test(serviceHistory) && !/commissionAmount|revenueAmount/.test(serviceHistory) && /Services & partner activity/.test(dashboard));
check('Repeated partner clicks reuse a recent open referral instead of polluting history', /24 \* 60 \* 60 \* 1000/.test(referralHelper) && /serviceReferral\.findFirst/.test(referralHelper) && /lastOpenedAt/.test(referralHelper));
check('Insuremart launch channel is seeded from verified partner identity', /Hellenic Sun Insurance Brokers \/ insuremart/.test(seedImport) && /https:\/\/insuremart\.pk\//.test(seedImport));
check('Full partner network has a normalized bulk-import path', /PARTNER_TYPES/.test(catalogImport) && /UniversityProgram/.test(schema) && /import:soup-catalog/.test(JSON.stringify(pkg.scripts)) && exists('data/SOUP_PARTNER_IMPORT_TEMPLATE.csv'));
check('Full catalog is validated before database writes and active services require a transaction route', /validationErrors/.test(catalogImport) && /Nothing was imported/.test(catalogImport) && /active non-university partners require transaction_url/.test(catalogImport) && /processedPartners\.size/.test(catalogImport));
check('Replit seed importer reports malformed or unmapped partner rows', /embeddedHeaders/.test(seedImport) && /unknownUniversities/.test(seedImport) && /process\.exitCode = 2/.test(seedImport));
check('Partner operations paginate beyond the first 500 records', /PAGE_SIZE = 100/.test(partnerAdmin) && /skip: \(page - 1\) \* PAGE_SIZE/.test(partnerAdmin) && /prisma\.partner\.count/.test(partnerAdmin));
check('Only Admin roles can mutate partner commercial inventory', /requireRole\(ADMIN_ROLES\)/.test(partnerActions) && /canManage/.test(partnerAdmin) && /updatePartner/.test(partnerDetail));
check('Active service partners require a controlled transaction route', /active service partner needs a transaction\/referral URL/i.test(partnerActions) && /service partner needs a transaction\/referral URL/i.test(partnerActions));
check('Resume and cover-letter experience is SOUP-native while retaining GCI conversation mechanics', /soup:conversation-append/.test(resumeConversation) && /soup_conversation_resume_v1/.test(resumeConversation) && /SOUP's professional resume and cover-letter editor/.test(resumeAi) && !/SOUP Passport/.test(resumeAi));
check('Resume AI routes share the distributed production rate limiter', /aiRateLimitResponse/.test(resumeGenerateRoute) && /aiRateLimitResponse/.test(resumeGenerateConversation) && /aiRateLimitResponse/.test(resumeImportRoute) && !/new Map/.test(resumeGenerateRoute) && !/new Map/.test(resumeImportRoute));
check('Final resume generation binds to the exact server-owned resume thread', /onSessionChange=\{setActiveSessionId\}/.test(resumeConversation) && /sessionId: activeSessionId/.test(resumeConversation) && /workflow: "RESUME"/.test(resumeGenerateConversation) && /buildTrustedAIConversationMessages/.test(resumeGenerateConversation));
check('Offer upload is restricted to SOUP-managed applications', /ownership !== "SOUP_MANAGED"/.test(offerRoute));
check('Offer uploads enforce non-empty size plus MIME and extension allowlists', /file\.size <= 0/.test(offerRoute) && /allowedExtensions/.test(offerRoute) && /\["pdf", "png", "jpg", "jpeg"\]/.test(offerRoute));
check('Offer upload writes vault document, application state and journey stage', /document\.create/.test(offerRoute) && /OFFER_LETTER/.test(offerRoute) && /offerDocumentId/.test(offerRoute) && /stage: "OFFER_RECEIVED"/.test(offerRoute));
check('Offer and enrolment states require an offer document', /OFFER_RECEIVED", "CONDITIONAL_OFFER", "ENROLLED/.test(applicationStatus) && /offerDocumentId/.test(applicationStatus));
check('Offer event creates notification and optional email', /notification\.create/.test(offerRoute) && /sendTransactionalEmail/.test(offerRoute));
check('Application operations preserve a chronological event ledger', /model StudentApplicationEvent/.test(schema) && /student_application_events/.test(read('prisma/migrations/20260829203500_soup_application_events/migration.sql')) && /studentApplicationEvent\.create/.test(applicationRoute) && /studentApplicationEvent\.create/.test(applicationStatus) && /studentApplicationEvent\.create/.test(offerRoute));
check('Student application documents and admissions reviews enter the event ledger', /DOCUMENT_SUPPLIED/.test(attachDocumentHelper) && /REQUIREMENT_REVIEWED/.test(applicationStaffStatus) && /Application history/.test(applicationDetailPage) && /Operational history/.test(adminApplicationDetail));
check('Customer dashboard is a persistent student journey workspace', /Current journey stage/.test(dashboard) && /Applications/.test(dashboard) && /Documents/.test(dashboard) && /Application Plans/.test(dashboard));
check('Admin customer view acts as case-level CRM', /Applications/.test(adminUser) && /Documents/.test(adminUser) && /Journey/.test(adminUser) && /Conversation/.test(adminUser));
check('Conversation history supports create/open/rename/delete', /method: "POST"/.test(workspace) && /method: "PATCH"/.test(workspace) && /method: "DELETE"/.test(workspace) && /updatedAt: "desc"/.test(sessionsRoute));
check('Guest conversation can migrate into authenticated history', /normalizeIncoming/.test(historyRoute) && /createMany/.test(historyRoute) && /metadata/.test(historyRoute));
check('Legacy GCI product pages redirect into SOUP', /redirect\("\/counselor/.test(legacyPages));
check('Legacy GCI report/financial APIs are disabled', (disabledLegacyApis.match(/status: 410/g) || []).length >= 7);
check('SOUP uses separate server-side environment names', /SOUP_ADMIN_EMAILS/.test(env) && /SUPABASE_SECRET_KEY=""/.test(env) && /NEXT_PUBLIC_SUPABASE_URL/.test(env));
check('SOUP runtime has no inherited GCI admin environment fallback', !/GCI_ADMIN_EMAILS/.test(env) && !/GCI_ADMIN_EMAILS/.test(currentUser) && !/GCI_ADMIN_EMAILS/.test(provision));
check('SOUP doctor validates the SOUP package rather than the GCI fork name', /pkg\.name !== "soup-app"/.test(doctor) && /SOUP doctor/.test(doctor) && !/gci-app/.test(doctor));
check('Preflight validates required SOUP environment and Supabase project consistency', /SOUP preflight FAILED/.test(preflight) && /NEXT_PUBLIC_SUPABASE_URL/.test(preflight) && /projectRef/.test(preflight) && /SOUP_RATE_LIMIT_SALT/.test(preflight) && /check:preflight/.test(JSON.stringify(pkg.scripts)));
check('Deployment health endpoint checks database reachability without exposing secrets', /SELECT 1/.test(healthRoute) && /database: "reachable"/.test(healthRoute) && /status: 503/.test(healthRoute) && !/process\.env/.test(healthRoute));
check('Baseline browser security headers are configured globally', /X-Content-Type-Options/.test(nextConfig) && /X-Frame-Options/.test(nextConfig) && /Referrer-Policy/.test(nextConfig) && /Permissions-Policy/.test(nextConfig) && /Strict-Transport-Security/.test(nextConfig));
check('Private document storage policies scope users to their own auth folder', /bucket_id = 'documents'/.test(storageSetup) && /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/.test(storageSetup));
check('Staff signed document access uses the server admin client after app authorization', /createAdminClient/.test(adminDocuments) && /createSignedUrl/.test(adminDocuments));
check('Student evidence upload enforces size, MIME and extension limits before storage', /file\.size <= 0/.test(evidenceRoute) && /allowedTypes/.test(evidenceRoute) && /allowedExtensions/.test(evidenceRoute));
check('Document ingestion cleans orphaned storage and isolates non-critical follow-up failures', /prisma\.\$transaction/.test(evidenceRoute) && /EVIDENCE_ORPHAN_CLEANUP_ERROR/.test(evidenceRoute) && /SOUP_CONTEXT_REFRESH_ERROR/.test(evidenceRoute) && /SOUP_DOCUMENT_NOTIFICATION_ERROR/.test(evidenceRoute) && /must never rewrite a good document as AI_FAILED/.test(evidenceRoute));
check('Gemini remains provider-default and Google Search grounding is enabled', /process\.env\.AI_PROVIDER \|\| "gemini"/.test(read('src/lib/ai/registry.ts')) && /google_search/.test(gemini));
check('Gemini retries transient stream-start failures without replaying partial output', /attempt < 3/.test(gemini) && /retryableStatus\(response\.status\)/.test(gemini) && /retry-after/.test(gemini) && /response\.body/.test(gemini));
check('Anthropic runtime is not present', !exists('src/lib/ai/providers/anthropic.ts') && !pkg.dependencies?.['@anthropic-ai/sdk']);
check('AI/provider failures remain customer-neutral', /(?:SOUP Counselor|Noodles) was interrupted/.test(stream) && !/Gemini request failed/.test(stream));
check('Conversation endpoint has distributed rate limiting and bounded transcript input', /checkRateLimit\(request, profile\?\.id\)/.test(stream) && /Retry-After/.test(stream) && /MAX_HISTORY_MESSAGES = 28/.test(stream) && /MAX_HISTORY_CHARS = 42_000/.test(stream) && /compactConversation/.test(stream));
check('Authenticated Counselor history is reconstructed from server-owned messages', /prisma\.chatMessage\.findMany/.test(stream) && /server-owned ChatMessage/.test(stream) && /persisted\.reverse\(\)/.test(stream) && /clientMessages\[clientMessages\.length - 1\]/.test(stream));
check('Browser UI events cannot write arbitrary trusted assistant history', /trustedEvent/.test(conversationMessageRoute) && /SYSTEM_EVENT/.test(conversationMessageRoute) && !/body\?\.content/.test(conversationMessageRoute) && /persistableSystemEvent/.test(workspace));
// Regression guard for a confirmed live incident: GUEST_IMPORT downgrading
// used to apply only to ASSISTANT-role imported messages, so a USER-role
// imported message (a different, previous person's own typed text on a
// shared device) flowed through untouched as an ordinary trusted "user"
// turn — including that person's name, which is how one student's Noodles
// conversation ended up addressing them by an unrelated student's name. The
// fix removed the role restriction; this check fails again if it is ever
// reintroduced.
check('System events and imported guest text (either role) cannot masquerade as trusted model history', /source === \"SYSTEM_EVENT\"/.test(stream) && /source === \"GUEST_IMPORT\"/.test(stream) && /Untrusted pre-signup/.test(stream) && !/source === \"GUEST_IMPORT\" && message\.role === \"ASSISTANT\"/.test(stream));
check('Legacy GCI conversation workflows cannot be invoked through SOUP APIs', /new Set<SoupWorkflow>\(\[\"RESUME\", \"COUNSELOR\"\]\)/.test(stream) && /new Set\(\[\"RESUME\", \"COUNSELOR\"\]\)/.test(historyRoute) && /new Set\(\[\"RESUME\", \"COUNSELOR\"\]\)/.test(sessionsRoute));
check('AI rate limits are database-backed and guest IPs are pseudonymized', /model AiRateLimitCounter/.test(schema) && /ON CONFLICT \("subject"\)/.test(rateLimiter) && /createHash\("sha256"\)/.test(rateLimiter) && /SOUP_RATE_LIMIT_SALT/.test(env));
check('All expensive Counselor/document research routes use the shared AI limit', /aiRateLimitResponse/.test(planRoute) && /aiRateLimitResponse/.test(checklistRoute) && /aiRateLimitResponse/.test(evidenceRoute) && /aiRateLimitResponse/.test(read('src/app/api/applications/[id]/requirements/route.ts')) && /aiRateLimitResponse/.test(read('src/app/api/admin/applications/[id]/requirements/route.ts')) && /Retry-After/.test(httpRateLimit));
check('Persisted assistant messages capture provider usage metadata', /aiUsage: (?:event|result)\.usage/.test(stream) && /provider: provider\.name/.test(stream) && /groundedSearch/.test(stream));
check('Document validity metadata supports expiry warnings without claiming authority approval', /documentIssuedAt/.test(schema) && /validUntil/.test(schema) && /documentIssuedAt/.test(evidenceRoute) && /validUntil/.test(evidenceRoute) && /Expires/.test(documentsPage) && /authority acceptance/.test(documentsPage));

// Regression guard for a confirmed live incident: a brand-new student
// account saw another, unrelated account's real documents (with real past
// upload dates) in /documents. Root cause traced to Next.js's client-side
// Router Cache serving a previously-rendered page from one authenticated
// user to the next user in the same browser tab after a soft
// redirect()-based sign-in/sign-up/sign-out — this app is explicitly used
// on shared/school devices, so that transition happens routinely, not as
// an edge case. Every server-side Document query was independently traced
// and confirmed correctly scoped by profileId; the leak was never a query
// bug. Fix: revalidatePath("/", "layout") before every redirect that
// follows an auth state change, plus explicit force-dynamic on every
// per-user page as a second, independent layer of defense. This check
// fails if either layer is ever quietly removed.
check('Auth state changes invalidate the client router cache (cross-account leak fix)', /revalidatePath\(\s*"\/",\s*"layout"\s*\)/.test(authActions) && (authActions.match(/invalidateAuthenticatedPages\(\)/g) || []).length >= 4 && /revalidatePath/.test(authCallback));
check('Per-user pages force dynamic rendering explicitly, not only implicitly via cookies()', /export const dynamic = "force-dynamic"/.test(documentsPage) && /export const dynamic = "force-dynamic"/.test(dashboard));
check('Dashboard refresh creates bounded deadline and document-validity reminders', /syncStudentAlerts/.test(read('src/app/dashboard/page.tsx')) && /ninetyDays/.test(studentAlerts) && /fourteenDays/.test(studentAlerts) && /recentCutoff/.test(studentAlerts));
check('Partner referrals preserve Counselor attribution and future revenue fields', /sourceSessionId/.test(schema) && /revenueAmount/.test(schema) && /commissionAmount/.test(schema) && /resolveReferralAttribution/.test(referralStart) && /Partner referrals & attribution/.test(referralAdmin));
check('Commercial referral reconciliation is role-scoped', /requireRole\(COMMERCIAL_ROLES\)/.test(referralAction) && /ACCOMMODATION/.test(referralAction) && /FINANCE/.test(referralAction) && /convertedAt/.test(referralAction) && /commissionAmount/.test(referralAction));
check('SOUP staff roles are explicit and least-privilege oriented', ['COUNSELOR','ADMISSIONS','FINANCE','ACCOMMODATION','SUPPORT','ADMIN','SUPER_ADMIN'].every((role) => roles.includes(role)) && /APPLICATION_ROLES/.test(roles) && /APPLICATION_OPERATIONS_ROLES/.test(roles) && /DOCUMENT_ROLES/.test(roles) && /COMMERCIAL_ROLES/.test(roles));
check('Counselor/support can view applications but only admissions/admin can operate them', /APPLICATION_ROLES[^\n]+COUNSELOR[^\n]+SUPPORT/.test(roles) && /APPLICATION_OPERATIONS_ROLES[^\n]+ADMISSIONS[^\n]+ADMIN[^\n]+SUPER_ADMIN/.test(roles) && !/APPLICATION_OPERATIONS_ROLES[^\n]+COUNSELOR/.test(roles) && /getApiStaff\(APPLICATION_OPERATIONS_ROLES\)/.test(applicationStatus) && /canOperate/.test(adminApplicationDetail));
check('Admin role assignment reserves privileged roles for Super Admin', /Only a Super Admin/.test(roleAction) && /ADMIN_ASSIGNABLE/.test(roleAction) && /SUPER_ADMIN/.test(roleAction));
check('Internal dashboard hides operations outside the current staff role', /Role-scoped operations/.test(adminDashboard) && /operations =/.test(adminDashboard) && /COMMERCIAL_ROLES/.test(adminDashboard));
check('Human Counselor handoff is same-thread, explicit and reversible', /model ChatSession[\s\S]*humanHandoffActive/.test(schema) && /setCounselorHandoff\(profileId: string, sessionId: string/.test(handoffAction) && /chatSession\.update/.test(handoffAction) && /Return conversation to AI/.test(handoffPage) && /session\.humanHandoffActive/.test(stream));
check('AI pauses only the exact human-managed Counselor thread', /HUMAN_HANDOFF_HOLD/.test(stream) && /session\.humanHandoffActive/.test(stream) && /in this thread/.test(stream) && /HUMAN_STAFF/.test(workspace));
check('AI-generated external URLs are restricted to credential-free HTTP(S)', /parsed\.protocol !== "https:"/.test(safeUrls) && /parsed\.username \|\| parsed\.password/.test(safeUrls) && /safeHttpUrl/.test(planRoute) && /safeHttpUrl/.test(checklistRoute) && /safeHttpUrl/.test(applicationRequirements));
check('Saved plans and journey checklists surface persisted research sources', /Research sources/.test(planPage) && /groundingSources/.test(journeyPage));

const nextMajor = Number(String(pkg.dependencies?.next || '0').match(/\d+/)?.[0] || 0);
checks.push({ name: 'Next.js production security gate', ok: true, detail: nextMajor >= 15 ? '' : `WARNING: current benchmark line is ${pkg.dependencies?.next}; perform the controlled supported-LTS upgrade only after SOUP regression QA.` });

let failed = 0;
for (const item of checks) {
  if (!item.ok) failed++;
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\n${checks.length - failed}/${checks.length} SOUP deep invariants passed.`);
if (failed) process.exitCode = 1;
