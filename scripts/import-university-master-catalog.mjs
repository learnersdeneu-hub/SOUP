import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const root = process.cwd();
const universityFile = path.resolve(root, 'data/soup-university-master-catalog.csv');
const programFile = path.resolve(root, 'data/soup-program-master-catalog.csv');

function parseCsv(text) {
  const rows=[]; let row=[], val='', quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"' && text[i+1]==='"') { val+='"'; i++; }
      else if (c==='"') quoted=false;
      else val+=c;
    } else if (c==='"') quoted=true;
    else if (c===',') { row.push(val); val=''; }
    else if (c==='\n') { row.push(val.replace(/\r$/, '')); rows.push(row); row=[]; val=''; }
    else val+=c;
  }
  if (val.length || row.length) { row.push(val); rows.push(row); }
  const header=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim());
  return rows.filter(r=>r.some(x=>String(x||'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,String(r[i]||'').trim()])));
}
function slugify(v){return v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,110)}
function bool(v){return ['1','true','yes'].includes(String(v||'').toLowerCase())}
function split(v){return String(v||'').split('|').map(x=>x.trim()).filter(Boolean)}
function number(v){const s=String(v||'').trim(); if(!s) return null; const n=Number(s.replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:null}

async function main(){
  if(!fs.existsSync(universityFile) || !fs.existsSync(programFile)) throw new Error('Master catalog CSV files are missing.');
  const universities=parseCsv(fs.readFileSync(universityFile,'utf8'));
  const programs=parseCsv(fs.readFileSync(programFile,'utf8'));
  const universityMap=new Map();
  let universityCount=0, programCount=0, activePrograms=0, historicalPrograms=0;

  for(const r of universities){
    const networks=split(r.networks);
    const sourceUrls=split(r.source_urls);
    const programFamilies=split(r.program_families);
    const status=(r.status||'ACTIVE').toUpperCase();
    const metadata={
      source:'SOUP master university catalog',
      relationship:r.relationship||'INDIRECT_RECRUITMENT_PARTNER',
      networks,
      sourceType:r.source_type||null,
      sourceUrls,
      programFamilies,
      managedBy:'LearnersDen/SOUP',
      applicationManagement:bool(r.application_management),
      studentVisiblePartnerLabel:r.student_visible_label||'SOUP Application Network',
      catalogVersion:'2026-09-12-v1',
    };
    const slug=`university-${slugify(r.name)}`;
    const partner=await prisma.partner.upsert({
      where:{slug},
      update:{name:r.name,type:'UNIVERSITY',status,country:r.country,internalPriority:status==='ACTIVE'?60:500,publicMetadata:metadata},
      create:{name:r.name,slug,type:'UNIVERSITY',status,country:r.country,internalPriority:status==='ACTIVE'?60:500,publicMetadata:metadata},
    });
    const university=await prisma.university.upsert({
      where:{name_country:{name:r.name,country:r.country}},
      update:{partnerId:partner.id,sourceUrl:sourceUrls.find(x=>/^https?:\/\//.test(x))||null,sourceCheckedAt:sourceUrls.some(x=>/^https?:\/\//.test(x))?new Date():undefined,publicMetadata:metadata},
      create:{partnerId:partner.id,name:r.name,country:r.country,sourceUrl:sourceUrls.find(x=>/^https?:\/\//.test(x))||null,sourceCheckedAt:sourceUrls.some(x=>/^https?:\/\//.test(x))?new Date():null,publicMetadata:metadata},
    });
    universityMap.set(`${r.name.toLowerCase()}|${r.country.toLowerCase()}`,university);
    universityCount++;
  }

  const aliases=new Map([
    ['esdes university|france','esdes business school|france'],
    ['paris business school|france','paris school of business|france'],
    ['higher institute of economics & innovation wsei poland|poland','wsei university|poland'],
    ['collegium da vinci poland|poland','collegium da vinci|poland'],
    ['international european university poland|poland','international european university poland|poland'],
    ['singidunum university serbia|serbia','singidunum university|serbia'],
    ['doba business school slovenia|slovenia','doba business school|slovenia'],
    ['algebra university college croatia|croatia','algebra university college|croatia'],
    ['gisma university for applied sciences|germany','gisma university of applied sciences|germany'],
    ['la trobe college|australia','la trobe college australia|australia'],
  ]);

  for(const r of programs){
    let key=`${r.university.toLowerCase()}|${r.country.toLowerCase()}`;
    key=aliases.get(key)||key;
    const university=universityMap.get(key);
    if(!university){
      console.warn(`Skipping program; institution not in master catalog: ${r.university} (${r.country})`);
      continue;
    }
    const isActive=bool(r.active) && r.data_status==='CURRENT_PUBLIC_VERIFIED';
    const existing=await prisma.universityProgram.findFirst({where:{universityId:university.id,title:r.title,level:r.level||'Unknown'}});
    const data={
      field:r.field||null,
      duration:r.duration||null,
      tuitionAmount:number(r.tuition_amount),
      tuitionCurrency:r.tuition_currency||null,
      intake:r.intake||null,
      applicationDeadline:r.deadline||null,
      sourceUrl:/^https?:\/\//.test(r.source_url||'')?r.source_url:null,
      sourceCheckedAt:r.source_checked_at?new Date(`${r.source_checked_at}T00:00:00Z`):null,
      requirements:{catalogDataStatus:r.data_status||'UNKNOWN',sourceReference:r.source_url||null,doNotUseWithoutRefresh:!isActive},
      active:isActive,
    };
    if(existing) await prisma.universityProgram.update({where:{id:existing.id},data});
    else await prisma.universityProgram.create({data:{universityId:university.id,title:r.title,level:r.level||'Unknown',...data}});
    programCount++; if(isActive) activePrograms++; else historicalPrograms++;
  }

  console.log(`SOUP master catalog import complete: ${universityCount} institutions, ${programCount} program rows (${activePrograms} current public-verified, ${historicalPrograms} historical/refresh-required).`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
