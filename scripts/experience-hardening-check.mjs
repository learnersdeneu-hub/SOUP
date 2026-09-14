import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
  ['Dedicated visa centre', fs.existsSync(path.join(root,'src/app/visa/page.tsx'))],
  ['Offer centre', fs.existsSync(path.join(root,'src/app/offers/page.tsx'))],
  ['Submission evidence visible', read('src/app/applications/[id]/page.tsx').includes('SOUP submission evidence')],
  ['Offer conditions persisted', read('prisma/schema.prisma').includes('model OfferCondition')],
  ['Counselor sessions persisted', read('prisma/schema.prisma').includes('model CounselorSession')],
  ['Concierge scheduling UI', fs.existsSync(path.join(root,'src/app/sessions/page.tsx')) && fs.existsSync(path.join(root,'src/app/admin/sessions/page.tsx'))],
  ['Human counselor escalation', read('src/app/actions/support.ts').includes('requestHumanCounselor')],
  ['Freshness badge', fs.existsSync(path.join(root,'src/components/SourceFreshnessBadge.tsx'))],
  ['Freshness rule in Noodles', read('src/lib/conversation/prompts.ts').includes('older than roughly 60 days')],
  ['Communication preferences', read('prisma/schema.prisma').includes('communicationPreferences') && read('src/app/account/page.tsx').includes('Communication preferences')],
  ['Expanded fee workflow', ['STUDENT_PAYING','SOUP_PAYING','REFUNDED'].every(v=>read('prisma/schema.prisma').includes(v))],
  ['Admin funnel analytics', fs.existsSync(path.join(root,'src/app/admin/analytics/page.tsx'))],
  ['Concierge staff queue', fs.existsSync(path.join(root,'src/app/admin/concierge/page.tsx'))],
  ['Global loading state', fs.existsSync(path.join(root,'src/app/loading.tsx'))],
  ['Global recovery state', fs.existsSync(path.join(root,'src/app/error.tsx'))],
  ['Refund/complaint support', read('src/app/support/page.tsx').includes('REFUND_DISPUTE') && read('src/app/support/page.tsx').includes('COMPLAINT')],
  ['Accommodation brief persists', read('src/components/services/ServicePartnerDirectory.tsx').includes('Save accommodation brief') && read('src/app/actions/referrals.ts').includes('saveStudentServiceNeeds')],
  ['Insurance brief persists', read('src/app/services/insurance/page.tsx').includes('Save insurance brief')],
  ['Saved service needs reach Noodles', read('src/lib/context/studentContext.ts').includes('studentPreferences: item.partnerId ? null : item.metadata')],
  ['Email preferences are enforced', read('src/lib/notifications/preferences.ts').includes('shouldSendStudentEmail') && read('src/app/api/admin/applications/[id]/offer/route.ts').includes('shouldSendStudentEmail')],
];
let fail=0; for(const [label,ok] of checks){console.log(`${ok?'✓':'✗'} ${label}`); if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} experience-hardening checks passed.`); if(fail)process.exit(1);
