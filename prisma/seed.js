const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCredentialTypes() {
  const rows = [
    { code: 'IDENTITY', label: 'Identity', isStructured: true, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'EDUCATION', label: 'Education', isStructured: true, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'EMPLOYMENT', label: 'Employment', isStructured: true, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'FINANCIAL', label: 'Financial', isStructured: true, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'LANGUAGE', label: 'Language', isStructured: false, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'PORTFOLIO', label: 'Portfolio', isStructured: false, requiresMakerChecker: false, defaultSlaDays: 14 },
    { code: 'IMMIGRATION', label: 'Immigration', isStructured: false, requiresMakerChecker: false, defaultSlaDays: 14 },
  ];
  for (const row of rows) {
    await prisma.credentialType.upsert({
      where: { code: row.code },
      update: { label: row.label, isStructured: row.isStructured },
      create: row,
    });
  }
}

async function seedScoreCategories() {
  const rows = [
    ['IDENTITY_CONFIDENCE', 'Identity Confidence'],
    ['EDUCATION_CREDIBILITY', 'Education Credibility'],
    ['EMPLOYMENT_CREDIBILITY', 'Employment Credibility'],
    ['FINANCIAL_CREDIBILITY', 'Financial Credibility'],
    ['REFERENCE_CREDIBILITY', 'Reference Credibility'],
  ];

  for (const [code, label] of rows) {
    const category = await prisma.scoreCategory.upsert({
      where: { code },
      update: { label },
      create: { code, label },
    });
    await prisma.scoringRuleVersion.upsert({
      where: { categoryId_versionNumber: { categoryId: category.id, versionNumber: 1 } },
      update: {},
      create: {
        categoryId: category.id,
        versionNumber: 1,
        weightsConfig: {
          placeholder: true,
          method: 'verified_ratio_linear_0_to_9',
          note: 'Sprint 1 provisional deterministic scoring. Replace only through a reviewed scoring-rule version.',
        },
      },
    });
  }
}

async function seedOrganizationTypes() {
  const rows = [
    ['UNIVERSITY', 'University'],
    ['BANK', 'Bank'],
    ['INSURER', 'Insurer'],
    ['EMPLOYER', 'Employer'],
    ['RECRUITER', 'Recruiter'],
    ['LICENSING_BODY', 'Licensing Body'],
  ];
  for (const [code, label] of rows) {
    await prisma.organizationType.upsert({ where: { code }, update: { label }, create: { code, label } });
  }
}

async function seedCaseTypes() {
  const rows = [
    'ADMISSIONS', 'EMPLOYMENT', 'RECRUITMENT', 'INSURANCE', 'LOAN', 'HOUSING',
    'SCHOLARSHIP', 'PROFESSIONAL_LICENSING', 'VISA', 'BACKGROUND_VERIFICATION', 'OTHER',
  ];
  for (const code of rows) {
    const label = code.split('_').map((p) => p[0] + p.slice(1).toLowerCase()).join(' ');
    await prisma.caseType.upsert({ where: { code }, update: { label }, create: { code, label } });
  }
}

async function seedSoupCorePartners() {
  await prisma.partner.upsert({
    where: { slug: 'hellenic-sun-insuremart' },
    update: { type: 'INSURANCE', status: 'ACTIVE', name: 'Hellenic Sun Insurance Brokers / insuremart', country: 'Pakistan', city: 'Lahore', websiteUrl: 'https://insuremart.pk/', transactionUrl: 'https://insuremart.pk/' },
    create: {
      type: 'INSURANCE',
      name: 'Hellenic Sun Insurance Brokers / insuremart',
      slug: 'hellenic-sun-insuremart',
      status: 'ACTIVE',
      country: 'Pakistan',
      city: 'Lahore',
      websiteUrl: 'https://insuremart.pk/',
      transactionUrl: 'https://insuremart.pk/',
      internalPriority: 1,
      publicMetadata: { role: 'SOUP insurance transaction channel', transactionMode: 'DIRECTORY_REDIRECT' },
      commercialMetadata: { exclusiveSoupTransactionChannelAtLaunch: true },
    },
  });
  await prisma.partner.upsert({
    where: { slug: 'mcb-islamic-bank' },
    update: { type: 'STUDENT_FINANCE', status: 'ACTIVE', name: 'MCB Islamic Bank', country: 'Pakistan', websiteUrl: 'https://www.mcbislamicbank.com/', transactionUrl: 'https://www.mcbislamicbank.com/', internalPriority: 2, publicMetadata: { role: 'SOUP banking partner' } },
    create: { type: 'STUDENT_FINANCE', name: 'MCB Islamic Bank', slug: 'mcb-islamic-bank', status: 'ACTIVE', country: 'Pakistan', websiteUrl: 'https://www.mcbislamicbank.com/', transactionUrl: 'https://www.mcbislamicbank.com/', internalPriority: 2, publicMetadata: { role: 'SOUP banking partner' } },
  });
  await prisma.partner.upsert({
    where: { slug: 'learnersden-application-management' },
    update: { type: 'OTHER', status: 'ACTIVE', name: 'LearnersDen.eu', country: 'International', websiteUrl: 'https://learnersden.eu/', transactionUrl: 'https://learnersden.eu/', internalPriority: 3, publicMetadata: { role: 'SOUP counselling and application management partner' } },
    create: { type: 'OTHER', name: 'LearnersDen.eu', slug: 'learnersden-application-management', status: 'ACTIVE', country: 'International', websiteUrl: 'https://learnersden.eu/', transactionUrl: 'https://learnersden.eu/', internalPriority: 3, publicMetadata: { role: 'SOUP counselling and application management partner' } },
  });

}

async function main() {
  await seedCredentialTypes();
  await seedScoreCategories();
  await seedOrganizationTypes();
  await seedCaseTypes();
  await seedSoupCorePartners();
  console.log('SOUP foundation seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
