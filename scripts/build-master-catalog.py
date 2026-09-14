import csv, os, re
from collections import OrderedDict
root='/mnt/data/soup_v20'
base=os.path.join(root,'data/soup-network-universities.csv')
records=OrderedDict()

def norm(n):
    return re.sub(r'\s+',' ',n.replace('\u00a0',' ').strip()).strip()

def add(name,country,networks,relationship='INDIRECT_RECRUITMENT_PARTNER',source_type='PUBLIC_WEB',sources=None,program_families=None,managed=True,status='ACTIVE'):
    name=norm(name); key=(name.lower(),country.lower())
    nets=[x for x in networks if x]
    src=sources or []
    fam=program_families or []
    if key in records:
        r=records[key]
        for x in nets:
            if x not in r['networks']: r['networks'].append(x)
        for x in src:
            if x not in r['source_urls']: r['source_urls'].append(x)
        for x in fam:
            if x not in r['program_families']: r['program_families'].append(x)
        if r['source_type']!='USER_MASTERLIST' and source_type=='USER_MASTERLIST': r['source_type']='MIXED'
        elif r['source_type']!=source_type and r['source_type']!='MIXED': r['source_type']='MIXED'
        return
    records[key]=dict(name=name,country=country,networks=nets,relationship=relationship,source_type=source_type,source_urls=src,program_families=fam,application_management=managed,status=status)

# Existing v1.9 verified public network catalog
with open(base,encoding='utf-8') as f:
    for r in csv.DictReader(f):
        add(r['name'],r['country'],r['networks'].split('|'),r['relationship'],'PUBLIC_WEB',r['sourceUrls'].split('|'))

# User-provided masterlist (Aug 30 2026). Relationship routes kept explicit.
def batch(country,names,nets,rel='USER_CONFIRMED_NETWORK_ACCESS'):
    for n in names: add(n,country,nets,rel,'USER_MASTERLIST',['file-library:Masterlist Universities.docx'])

batch('France',['KEDGE Business School'],['DIRECT_SOUP'])
batch('Croatia',['Algebra University College'],['DIRECT_SOUP'])
batch('Poland',['Collegium Da Vinci','International European University Poland'],['DIRECT_SOUP'])
batch('Hungary',['Wekerle Business School','International Business School Budapest'],['DIRECT_SOUP'])
batch('Hungary',['University of Debrecen'],['ABN_GLOBAL'])
batch('Austria',['International Business School Vienna'],['DIRECT_SOUP'])
batch('Germany',['New European College'],['DIRECT_SOUP'])
batch('Germany',['University of Europe for Applied Sciences','GISMA University of Applied Sciences','Berlin School of Business and Innovation','htk academy'],['GUS'])
batch('Germany',['Arden University Berlin','IU International University of Applied Sciences','SRH University Berlin','Steinbeis School of Management and Innovation'],['ABN_GLOBAL'])
ireland=['Trinity College Dublin','University College Dublin','University College Cork','University of Galway','Dublin City University','University of Limerick','Maynooth University','RCSI University of Medicine and Health Sciences','Technological University Dublin','Atlantic Technological University','Technological University of the Shannon','Munster Technological University','South East Technological University','Dundalk Institute of Technology','National College of Ireland','Dublin Business School','Griffith College Ireland','Shannon College of Hotel Management','CCT College Dublin','Dublin International Foundation College','City Education Group','Dorset College','Galway Business School','Holmes Institute Dublin','Independent College','ICD Business School','IBAT College Dublin']
batch('Ireland',ireland,['IEO','GUS','ABN_GLOBAL'])
batch('Netherlands',['University of Applied Sciences Europe Amsterdam'],['GUS'])
batch('Cyprus',['Cyprus International University','University of Nicosia'],['ABN_GLOBAL'])
uk=['Aberystwyth University','Anglia Ruskin University','Amity University London','Arden University','Arts University Bournemouth','Aston University','Bangor University','Birkbeck, University of London','Birmingham City University','Bloomsbury Institute','BPP University','Brunel University London','Buckinghamshire New University','Canterbury Christ Church University','Cardiff Metropolitan University','Coventry University','Cranfield University','De Montfort University','Edge Hill University','Edinburgh Napier University','Falmouth University','Glasgow Caledonian University','Harper Adams University','Heriot-Watt University','Keele University','Kingston University London','Lancaster University','Leeds Trinity University','Liverpool John Moores University','London Metropolitan University','London School of Business and Finance','London College of Contemporary Arts','London South Bank University','Loughborough University','Manchester Metropolitan University','Middlesex University','Northeastern University London','Northumbria University','Norwich University of the Arts','Nottingham Trent University','Oxford International Education Group','Queen Mary University of London','Queen’s University Belfast','Ravensbourne University London','Regent College London','Richmond American University London','Robert Gordon University','University of Roehampton','Sheffield Hallam University','Solent University','St George’s, University of London','Staffordshire University','Swansea University','Teesside University','The University of Law','Ulster University','University Academy 92','University College Birmingham','University for the Creative Arts','University of Aberdeen','University of Bedfordshire','University of Birmingham','University of Bolton','University of Bradford','University of Brighton','University of Bristol','University of Buckingham','University of Central Lancashire','University of Chester','University of Derby','University of Dundee','University of East Anglia','University of East London','University of Essex','University of Gloucestershire','University of Greenwich','University of Hertfordshire','University of Huddersfield','University of Hull','University of Kent','University of Leicester','University of Lincoln','University of Northampton','University of Plymouth','University of Portsmouth','University of Reading','University of Salford','University of South Wales','University of Stirling','University of Strathclyde','University of Suffolk','University of Sunderland','University of Surrey','University of Sussex','University of Westminster','University of Wolverhampton','University of Worcester','University of York','UWE Bristol','Wrexham University']
batch('United Kingdom',uk,['GUS','ABN_GLOBAL','AHZ','CONNECTEDHE'])
# Russia/Belarus user network
batch('Russia',['Pirogov Russian National Research Medical University','Peoples’ Friendship University of Russia (RUDN)','Kazan State Medical University','I.M. Sechenov First Moscow State Medical University','Saint Petersburg State Pediatric Medical University','Moscow Aviation Institute','Moscow Power Engineering Institute','National University of Science and Technology MISIS','Tomsk Polytechnic University','Siberian Federal University','Saint Petersburg State University','Lomonosov Moscow State University'],['EEUA'])
batch('Belarus',['Gomel State Medical University','Yanka Kupala State University of Grodno','International University MITSO'],['EEUA'])
usa=['American University','Auburn University','Baylor University','Colorado State University','Florida International University','George Mason University','Gonzaga University','Hofstra University','Illinois State University','Johns Hopkins University','Louisiana State University','Oregon State University','Pepperdine University','Rutgers University','Saint Louis University','University of Arizona','University of Central Florida','University of Illinois Chicago','University of Kansas','University of Massachusetts Boston','University of South Carolina','University of Utah','University of Wisconsin']
batch('United States',usa,['ABN_GLOBAL','GUS'])
canada=['University Canada West','University of Niagara Falls Canada','Toronto School of Management','Canadian College of Technology and Business','Trebas Institute','Niagara College - Toronto','Fleming College Toronto','Fraser International College','International College of Manitoba','Toronto Metropolitan University International College','Wilfrid Laurier International College']
batch('Canada',canada,['GUS','ABN_GLOBAL'])
aus=['Bond University','Charles Darwin University','CQUniversity','Curtin University','Deakin University','Edith Cowan University','Federation University Australia','Flinders University','Griffith University','La Trobe University','Macquarie University','Monash University','Murdoch University','University of Newcastle Australia','University of Southern Queensland','University of Tasmania','UTS College','Western Sydney University']
batch('Australia',aus,['ABN_GLOBAL'])
uae=['University of Europe for Applied Sciences Dubai','University of Birmingham Dubai','Heriot-Watt University Dubai','University of Wollongong in Dubai','Curtin University Dubai','Murdoch University Dubai','Canadian University Dubai','De Montfort University Dubai','Ajman University']
batch('United Arab Emirates',uae,['GUS','ABN_GLOBAL'])
mal=['Monash University Malaysia','University of Nottingham Malaysia','Heriot-Watt University Malaysia','Swinburne University of Technology Sarawak Campus','Curtin University Malaysia','Taylor’s University','Sunway University','Asia Pacific University of Technology & Innovation']
batch('Malaysia',mal,['ABN_GLOBAL'])
batch('Singapore',['London School of Business and Finance Singapore'],['GUS'])
batch('India',['UPES','Pearl Academy'],['GUS'])
batch('Caribbean',['Saba University School of Medicine','Medical University of the Americas','St. Matthew’s University School of Medicine'],['GUS'])

# Current ApplyBoard public institution surface (checked 2026-09-12)
ab='https://www.applyboard.com/institution'
applyboard=[
('Western University','Canada'),('Laurentian University','Canada'),('Lakehead University','Canada'),
('Southern New Hampshire University','United States'),('Northeastern University','United States'),('California State University, Northridge','United States'),
('Bournemouth University','United Kingdom'),('University of Greenwich','United Kingdom'),('University of Edinburgh','United Kingdom'),
('Hochschule Fresenius','Germany'),('Mediadesign Hochschule','Germany'),('University of Europe for Applied Sciences','Germany'),
('Griffith University','Australia'),('Federation University Australia','Australia'),('Deakin University','Australia'),
('Dublin Business School','Ireland'),('University College Cork','Ireland'),('Trinity College Dublin','Ireland'),
('Global College Malta','Malta'),('GBS Malta','Malta'),("Saint Martin's Institute of Higher Education",'Malta'),
('UDIT, University of Design, Innovation and Technology','Spain'),('C3S Business School','Spain'),('LCI Barcelona','Spain'),
('TETR College of Business','United Arab Emirates'),('De Montfort University Dubai','United Arab Emirates'),('University of Birmingham Dubai','United Arab Emirates'),
('Brock University','Canada'),('Cape Breton University','Canada'),('Thompson Rivers University','Canada'),('Conestoga College','Canada'),('University of Manitoba','Canada'),
('Arizona State University','United States'),('University at Buffalo','United States'),('University of North Florida','United States'),('Oral Roberts University','United States'),('NAIT','Canada'),
('Maynooth University','Ireland'),('University of Limerick','Ireland')]
for n,c in applyboard: add(n,c,['APPLYBOARD'],'INDIRECT_RECRUITMENT_PARTNER','PUBLIC_WEB',[ab])

# Current InUni additions and program-family info
gus='https://www.globaluniversitysystems.com/network/partners'
for n,c,fams in [
('Concordia University Chicago','United States',[]),('Avila University','United States',['Undergraduate','Graduate','Liberal Arts','Professional Studies']),
('Herzing University','United States',['Business','Technology','Healthcare','Public Safety']),('LIM College','United States',['Fashion Business','Lifestyle Business']),
('Penn State Dickinson Law','United States',['JD','LLM','Law']),('University of Akron','United States',['STEM','Polymer Science','Engineering']),
('Canterbury Christ Church University','United Kingdom',['Education','Health','Business','Sciences']),('Hartpury University','United Kingdom',['Agriculture','Animal','Equine','Sport','Business','Veterinary Nursing'])]:
    add(n,c,['GUS_INUNI'],'INDIRECT_RECRUITMENT_PARTNER','PUBLIC_WEB',[gus],fams)
add('San Diego State University','United States',['GUS_INUNI'],'INDIRECT_RECRUITMENT_PARTNER','PUBLIC_WEB',['https://www.globaluniversitysystems.com/news/institutions/inuni-global-welcomes-san-diego-state-university-to-its-network'])
add('Rensselaer Polytechnic Institute','United States',['GUS_INUNI'],'INDIRECT_RECRUITMENT_PARTNER','PUBLIC_WEB',['https://www.globaluniversitysystems.com/news/group/inuni-global-partners-with-rensselaer-polytechnic-institute-rpi-to-lead-exclusive-international-recruitment'])

out=os.path.join(root,'data/soup-university-master-catalog.csv')
with open(out,'w',encoding='utf-8',newline='') as f:
    w=csv.writer(f)
    w.writerow(['name','country','networks','relationship','source_type','source_urls','program_families','application_management','status','student_visible_label'])
    for r in sorted(records.values(), key=lambda x:(x['country'],x['name'])):
        w.writerow([r['name'],r['country'],'|'.join(r['networks']),r['relationship'],r['source_type'],'|'.join(r['source_urls']),'|'.join(r['program_families']),'true' if r['application_management'] else 'false',r['status'],'SOUP Application Network'])
print('institutions',len(records),out)

# Build a safe program catalog: historical rows are retained but not treated as current.
hist=os.path.join(root,'data/replit-partnered-university-programs.csv')
prog=[]
with open(hist,encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        u=norm(r.get('University Name',''))
        if not u or u.lower()=='university name': continue
        title=norm(r.get('Programe/Course',''))
        if not title: continue
        prog.append(dict(university=u,country='',title=title,level=norm(r.get('Level','')),field=norm(r.get('Category','')),duration=norm(r.get('Programme Duration','')),tuition_amount=norm(r.get('Tuition Fee/Per Year in EUR for Non-EU students','')),tuition_currency='EUR',intake='',deadline=norm(r.get('Deadline','')),source_url='internal:replit-partnered-university-programs.csv',source_checked_at='',data_status='HISTORICAL_REFRESH_REQUIRED',active='false'))

# Current, explicitly visible programs from ApplyBoard destination pages.
current=[
('Northeastern University','United States','Master of Professional Studies - Analytics','Masters','Analytics','','','','','https://www.applyboard.com/usa'),
('University at Buffalo','United States','Master of Science - Engineering Science - Artificial Intelligence','Masters','Artificial Intelligence','','','','','https://www.applyboard.com/usa'),
('Arizona State University','United States','Master of Science - Environmental Engineering','Masters','Environmental Engineering','','','','','https://www.applyboard.com/usa'),
('University of Arizona','United States','Master of Science - Agricultural and Resource Economics','Masters','Agricultural and Resource Economics','','','','','https://www.applyboard.com/usa'),
('University of Edinburgh','United Kingdom','Master of Laws - Corporate Law','Masters','Law','','','','','https://www.applyboard.com/uk'),
('University of Greenwich','United Kingdom','Master of Science - Global Public Health','Masters','Public Health','','','','','https://www.applyboard.com/uk'),
('Bournemouth University','United Kingdom','Bachelor of Science (Honours) - Forensic Science','Bachelors','Forensic Science','','','','','https://www.applyboard.com/uk'),
('Griffith University','Australia','Bachelor of Engineering (Honours)','Bachelors','Engineering','','','','','https://www.applyboard.com/australia'),
('La Trobe College','Australia','Bachelor of Health Science','Bachelors','Health Science','','','','','https://www.applyboard.com/australia'),
('Deakin University','Australia','Bachelor of Social Work','Bachelors','Social Work','','','','','https://www.applyboard.com/australia'),
('La Trobe University','Australia','Bachelor of Health Sciences','Bachelors','Health Sciences','','','','','https://www.applyboard.com/australia'),
]
for row in current:
    u,c,t,l,field,dur,fee,curr,intake,src=row
    prog.append(dict(university=u,country=c,title=t,level=l,field=field,duration=dur,tuition_amount=fee,tuition_currency=curr,intake=intake,deadline='',source_url=src,source_checked_at='2026-09-12',data_status='CURRENT_PUBLIC_VERIFIED',active='true'))

pout=os.path.join(root,'data/soup-program-master-catalog.csv')
with open(pout,'w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['university','country','title','level','field','duration','tuition_amount','tuition_currency','intake','deadline','source_url','source_checked_at','data_status','active'])
    w.writeheader(); w.writerows(prog)
print('program rows',len(prog),pout)
