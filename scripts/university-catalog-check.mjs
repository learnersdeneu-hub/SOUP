import fs from 'node:fs';
function parseCsv(text){const rows=[];let row=[],v='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else v+=c;}if(v.length||row.length){row.push(v);rows.push(row);}const h=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim());return rows.filter(r=>r.some(x=>String(x||'').trim())).map(r=>Object.fromEntries(h.map((x,i)=>[x,String(r[i]||'').trim()])))}
const u=parseCsv(fs.readFileSync('data/soup-university-master-catalog.csv','utf8'));
const p=parseCsv(fs.readFileSync('data/soup-program-master-catalog.csv','utf8'));
const keys=new Set(); let dup=0;
for(const r of u){const k=`${r.name.toLowerCase()}|${r.country.toLowerCase()}`; if(keys.has(k))dup++; keys.add(k);}
const active=p.filter(r=>r.active==='true');
const stale=p.filter(r=>r.data_status==='HISTORICAL_REFRESH_REQUIRED');
const badActive=active.filter(r=>r.data_status!=='CURRENT_PUBLIC_VERIFIED');
const checks=[
 ['>=250 institutions',u.length>=250],
 ['no duplicate institution/country rows',dup===0],
 ['ApplyBoard network represented',u.some(r=>r.networks.split('|').includes('APPLYBOARD'))],
 ['AHZ network represented',u.some(r=>r.networks.split('|').includes('AHZ'))],
 ['GUS/InUni network represented',u.some(r=>r.networks.split('|').includes('GUS_INUNI'))],
 ['IEO network represented',u.some(r=>r.networks.split('|').includes('IEO'))],
 ['program catalog present',p.length>=250],
 ['historical program rows are not active',badActive.length===0],
 ['current public-verified program rows present',active.length>=10],
];
let failures=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failures++;}
console.log(`Institutions: ${u.length}; program rows: ${p.length}; current verified: ${active.length}; historical refresh-required: ${stale.length}.`);
if(failures)process.exit(1);
