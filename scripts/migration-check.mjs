import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const migrationRoot = path.join(root, 'prisma', 'migrations');
const errors = [];
const notes = [];

const schema = fs.readFileSync(schemaPath, 'utf8');
const migrationDirs = fs.readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const migrationFiles = migrationDirs
  .map((dir) => ({ dir, file: path.join(migrationRoot, dir, 'migration.sql') }))
  .filter(({ file }) => fs.existsSync(file));
const allSql = migrationFiles.map(({ file }) => fs.readFileSync(file, 'utf8')).join('\n');

if (!migrationFiles.length) errors.push('No Prisma migration SQL files were found.');
for (let i = 1; i < migrationDirs.length; i++) {
  if (migrationDirs[i] <= migrationDirs[i - 1]) errors.push(`Migration order is not strictly increasing: ${migrationDirs[i - 1]} then ${migrationDirs[i]}`);
}

function enumValues(name) {
  const match = schema.match(new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!match) { errors.push(`Schema enum ${name} is missing.`); return []; }
  return match[1].split('\n').map((line) => line.replace(/\/\/.*$/, '').trim()).filter((line) => /^[A-Z][A-Z0-9_]*$/.test(line));
}

const soupEnums = [
  'StudentJourneyStage',
  'PartnerType',
  'PartnershipStatus',
  'ApplicationOwnership',
  'StudentApplicationStatus',
  'ChecklistKind',
  'ChecklistItemStatus',
  'ServiceReferralType',
  'ServiceReferralStatus',
];
for (const name of soupEnums) {
  for (const value of enumValues(name)) {
    if (!allSql.includes(`'${value}'`)) errors.push(`Migration SQL does not contain enum value ${name}.${value}.`);
  }
}

for (const role of ['COUNSELOR', 'ADMISSIONS', 'FINANCE', 'ACCOMMODATION', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']) {
  if (!enumValues('AppRole').includes(role)) errors.push(`Schema AppRole is missing ${role}.`);
  if (!['SUPPORT', 'ADMIN'].includes(role) && !allSql.includes(`'${role}'`)) errors.push(`Migration SQL does not add SOUP staff role ${role}.`);
}
if (!allSql.includes(`ALTER TYPE "ChatWorkflow" ADD VALUE IF NOT EXISTS 'COUNSELOR'`)) errors.push('Migration SQL does not add the COUNSELOR chat workflow.');

const expectedTables = {
  student_cases: ['id','profileId','stage','targetDegreeLevel','targetSubject','preferredIntake','preferredRegions','preferredCountries','searchScope','academicBackgroundSummary','englishProficiencySummary','fundingSummary','budgetMin','budgetMax','budgetCurrency','studyLanguage','goals','constraints','nextAction','humanHandoffActive','assignedStaffUserId','handoffReason','handoffStartedAt','createdAt','updatedAt'],
  partners: ['id','type','name','slug','status','country','city','websiteUrl','transactionUrl','internalPriority','commercialMetadata','publicMetadata','createdAt','updatedAt'],
  universities: ['id','partnerId','name','country','city','websiteUrl','isPublic','sourceUrl','sourceCheckedAt','publicMetadata','createdAt','updatedAt'],
  university_programs: ['id','universityId','title','level','field','studyMode','language','duration','tuitionAmount','tuitionCurrency','intake','applicationDeadline','applicationUrl','sourceUrl','sourceCheckedAt','requirements','active','createdAt','updatedAt'],
  university_shortlists: ['id','profileId','studentCaseId','title','regionScope','version','generatedBy','researchSummary','generatedAt','updatedAt'],
  university_shortlist_items: ['id','shortlistId','universityId','programId','position','isPartnerAtGeneration','eligibilityStatus','rationale','cautions','sourceUrls','createdAt'],
  student_applications: ['id','profileId','studentCaseId','universityId','programId','ownership','status','externalApplicationUrl','externalReference','submittedAt','decisionAt','offerDocumentId','notes','createdAt','updatedAt'],
  student_application_documents: ['id','applicationId','documentId','documentRole','required','createdAt'],
  student_application_events: ['id','applicationId','actorUserId','eventType','fromStatus','toStatus','message','metadata','createdAt'],
  journey_checklists: ['id','profileId','studentCaseId','applicationId','kind','title','destinationCountry','authorityName','sourceUrl','sourceCheckedAt','sourceSnapshot','createdAt','updatedAt'],
  journey_checklist_items: ['id','checklistId','title','description','position','status','required','externalActionUrl','externalActionLabel','documentId','completedAt','dueAt','metadata','createdAt','updatedAt'],
  service_referrals: ['id','profileId','studentCaseId','type','partnerId','status','title','externalUrl','counselorRationale','sourceSessionId','sourceMessageId','partnerReference','convertedAt','revenueAmount','revenueCurrency','commissionAmount','commissionCurrency','metadata','createdAt','updatedAt'],
  ai_rate_limit_counters: ['subject','windowStart','count','updatedAt'],
};

function createTableBody(table) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return allSql.match(new RegExp(`CREATE TABLE "${escaped}" \\(([\\s\\S]*?)\\n\\);`, 'm'))?.[1] || '';
}

for (const [table, columns] of Object.entries(expectedTables)) {
  const body = createTableBody(table);
  if (!body) { errors.push(`Migration SQL does not create SOUP table ${table}.`); continue; }
  for (const column of columns) if (!body.includes(`"${column}"`)) errors.push(`Migration table ${table} is missing column ${column}.`);
  if (!schema.includes(`@@map("${table}")`)) errors.push(`Schema does not map a model to SOUP table ${table}.`);
}

const chatSessionBlock = schema.match(/model ChatSession\s*\{([\s\S]*?)\n\}/m)?.[1] || '';
for (const column of ['humanHandoffActive', 'assignedStaffUserId', 'handoffReason', 'handoffStartedAt']) {
  if (!chatSessionBlock.includes(column)) errors.push(`Schema ChatSession is missing ${column}.`);
  if (!allSql.includes(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "${column}"`)) errors.push(`Migration SQL does not add chat_sessions.${column}.`);
}


for (const column of ['documentIssuedAt', 'validUntil']) {
  if (!schema.match(new RegExp(`\\b${column}\\s+DateTime\\?`))) errors.push(`Schema Document model is missing ${column}.`);
  if (!allSql.includes(`"${column}"`)) errors.push(`Migration SQL does not add documents.${column}.`);
}

if (!schema.match(/model ChatMessage[\s\S]*?metadata\s+Json\?/m)) errors.push('Schema ChatMessage.metadata is missing.');
if (!allSql.includes('ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "metadata" JSONB')) errors.push('Migration SQL does not add chat_messages.metadata.');

const soupMigration = migrationFiles.find(({ dir }) => dir.includes('soup_student_journey'));
if (!soupMigration) errors.push('The canonical SOUP student-journey migration is missing.');
else notes.push(`SOUP foundation migration: ${soupMigration.dir}`);

if (errors.length) {
  console.error('SOUP migration consistency FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`SOUP migration consistency PASSED (${migrationFiles.length} migrations, ${Object.keys(expectedTables).length} SOUP tables, ${soupEnums.length} SOUP enums).`);
for (const note of notes) console.log(`- ${note}`);
