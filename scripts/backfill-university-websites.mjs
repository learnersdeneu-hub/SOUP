// Backfills University.websiteUrl for real, unambiguous official domains I
// have direct, confident knowledge of (mainly the well-known UK institutions
// making up the AHZ list, plus a handful of other clearly-identifiable
// entries) so PartnerLogo's existing favicon-fallback mechanism can show a
// real logo instead of initials — without running any external
// logo-extraction/scraping step, per instruction. Deliberately conservative:
// smaller/ambiguous institutions I am not confident about are left alone
// rather than guessing a domain that could be wrong.
//
// Idempotent: only ever fills a currently-null websiteUrl; never overwrites
// an existing value.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KNOWN_WEBSITES = {
  "Abertay University": "https://www.abertay.ac.uk/",
  "Aberystwyth University": "https://www.aber.ac.uk/",
  "Anglia Ruskin University": "https://aru.ac.uk/",
  "Arden University": "https://arden.ac.uk/",
  "Arts University Bournemouth": "https://aub.ac.uk/",
  "Aston University Birmingham": "https://www.aston.ac.uk/",
  "Bangor University": "https://www.bangor.ac.uk/",
  "Bath Spa University": "https://www.bathspa.ac.uk/",
  "Birkbeck University London": "https://www.bbk.ac.uk/",
  "Birmingham City University": "https://www.bcu.ac.uk/",
  "Bournemouth University": "https://www.bournemouth.ac.uk/",
  "BPP University": "https://www.bpp.com/",
  "Brunel University London": "https://www.brunel.ac.uk/",
  "Buckinghamshire New University": "https://bucks.ac.uk/",
  "Canterbury Christ Church University": "https://www.canterbury.ac.uk/",
  "Cardiff Metropolitan University": "https://www.cardiffmet.ac.uk/",
  "Cardiff University": "https://www.cardiff.ac.uk/",
  "City University of London": "https://www.city.ac.uk/",
  "Coventry University": "https://www.coventry.ac.uk/",
  "Cranfield University": "https://www.cranfield.ac.uk/",
  "De Montfort University": "https://www.dmu.ac.uk/",
  "Durham University": "https://www.durham.ac.uk/",
  "Edge Hill University": "https://www.edgehill.ac.uk/",
  "Edinburgh Napier University": "https://www.napier.ac.uk/",
  "Falmouth University": "https://www.falmouth.ac.uk/",
  "Glasgow Caledonian University": "https://www.gcu.ac.uk/",
  "Goldsmiths University of London": "https://www.gold.ac.uk/",
  "Harper Adams University": "https://www.harper-adams.ac.uk/",
  "Heriot-Watt University": "https://www.hw.ac.uk/",
  "Imperial College London": "https://www.imperial.ac.uk/",
  "Keele University": "https://www.keele.ac.uk/",
  "King’s College London": "https://www.kcl.ac.uk/",
  "Kingston University": "https://www.kingston.ac.uk/",
  "Lancaster University": "https://www.lancaster.ac.uk/",
  "Leeds Beckett University": "https://www.leedsbeckett.ac.uk/",
  "Leeds Trinity University": "https://www.leedstrinity.ac.uk/",
  "Liverpool John Moores University": "https://www.ljmu.ac.uk/",
  "London Metropolitan University": "https://www.londonmet.ac.uk/",
  "London School of Economics and Political Science (LSE)": "https://www.lse.ac.uk/",
  "London South Bank University": "https://www.lsbu.ac.uk/",
  "Loughborough University": "https://www.lboro.ac.uk/",
  "Manchester Metropolitan University": "https://www.mmu.ac.uk/",
  "Middlesex University London": "https://www.mdx.ac.uk/",
  "Newcastle University": "https://www.ncl.ac.uk/",
  "Northumbria University": "https://www.northumbria.ac.uk/",
  "Norwich University of the Arts": "https://www.nua.ac.uk/",
  "Nottingham Trent University": "https://www.ntu.ac.uk/",
  "Oxford Brookes University": "https://www.brookes.ac.uk/",
  "Queen Margaret University": "https://www.qmu.ac.uk/",
  "Queen Mary University of London": "https://www.qmul.ac.uk/",
  "Queen’s University Belfast": "https://www.qub.ac.uk/",
  "Robert Gordon University": "https://www.rgu.ac.uk/",
  "Royal Holloway, University of London": "https://www.royalholloway.ac.uk/",
  "Sheffield Hallam University": "https://www.shu.ac.uk/",
  "Solent University": "https://www.solent.ac.uk/",
  "St. George's University": "https://www.sgu.edu/",
  "Staffordshire University": "https://www.staffs.ac.uk/",
  "Swansea University": "https://www.swansea.ac.uk/",
  "Teesside University": "https://www.tees.ac.uk/",
  "The University of Edinburgh": "https://www.ed.ac.uk/",
  "The University of Law": "https://www.law.ac.uk/",
  "Ulster University": "https://www.ulster.ac.uk/",
  "University College Birmingham": "https://www.ucb.ac.uk/",
  "University College London (UCL)": "https://www.ucl.ac.uk/",
  "University of Aberdeen": "https://www.abdn.ac.uk/",
  "University of Bath": "https://www.bath.ac.uk/",
  "University of Bedfordshire": "https://www.beds.ac.uk/",
  "University of Birmingham": "https://www.birmingham.ac.uk/",
  "University of Bolton": "https://www.bolton.ac.uk/",
  "University of Bradford": "https://www.bradford.ac.uk/",
  "University of Brighton": "https://www.brighton.ac.uk/",
  "University of Bristol": "https://www.bristol.ac.uk/",
  "University of Buckingham": "https://www.buckingham.ac.uk/",
  "University of Cambridge": "https://www.cam.ac.uk/",
  "University of Central Lancashire (UCLan)": "https://www.uclan.ac.uk/",
  "University of Chester": "https://www.chester.ac.uk/",
  "University of Chichester": "https://www.chi.ac.uk/",
  "University of Cumbria": "https://www.cumbria.ac.uk/",
  "University of Derby": "https://www.derby.ac.uk/",
  "University of Dundee": "https://www.dundee.ac.uk/",
  "University of East Anglia (UEA)": "https://www.uea.ac.uk/",
  "University of East London": "https://www.uel.ac.uk/",
  "University of Essex": "https://www.essex.ac.uk/",
  "University of Exeter": "https://www.exeter.ac.uk/",
  "University of Glasgow": "https://www.gla.ac.uk/",
  "University of Gloucestershire": "https://www.glos.ac.uk/",
  "University of Greenwich": "https://www.gre.ac.uk/",
  "University of Hertfordshire": "https://www.herts.ac.uk/",
  "University of Huddersfield": "https://www.hud.ac.uk/",
  "University of Hull": "https://www.hull.ac.uk/",
  "University of Kent": "https://www.kent.ac.uk/",
  "University of Leeds": "https://www.leeds.ac.uk/",
  "University of Leicester": "https://le.ac.uk/",
  "University of Lincoln": "https://www.lincoln.ac.uk/",
  "University of Liverpool": "https://www.liverpool.ac.uk/",
  "University of Manchester": "https://www.manchester.ac.uk/",
  "University of Northampton": "https://www.northampton.ac.uk/",
  "University of Nottingham": "https://www.nottingham.ac.uk/",
  "University of Oxford": "https://www.ox.ac.uk/",
  "University of Plymouth": "https://www.plymouth.ac.uk/",
  "University of Portsmouth": "https://www.port.ac.uk/",
  "University of Reading": "https://www.reading.ac.uk/",
  "University of Roehampton": "https://www.roehampton.ac.uk/",
  "University of Salford": "https://www.salford.ac.uk/",
  "University of Sheffield": "https://www.sheffield.ac.uk/",
  "University of South Wales": "https://www.southwales.ac.uk/",
  "University of Southampton": "https://www.southampton.ac.uk/",
  "University of St Andrews": "https://www.st-andrews.ac.uk/",
  "University of Stirling": "https://www.stir.ac.uk/",
  "University of Strathclyde": "https://www.strath.ac.uk/",
  "University of Suffolk": "https://www.uos.ac.uk/",
  "University of Sunderland": "https://www.sunderland.ac.uk/",
  "University of Surrey": "https://www.surrey.ac.uk/",
  "University of Sussex": "https://www.sussex.ac.uk/",
  "University of the Arts London": "https://www.arts.ac.uk/",
  "University of the West of Scotland": "https://www.uws.ac.uk/",
  "University of Warwick": "https://warwick.ac.uk/",
  "University of West London": "https://www.uwl.ac.uk/",
  "University of Westminster": "https://www.westminster.ac.uk/",
  "University of Winchester": "https://www.winchester.ac.uk/",
  "University of Wolverhampton": "https://www.wlv.ac.uk/",
  "University of Worcester": "https://www.worcester.ac.uk/",
  "University of York": "https://www.york.ac.uk/",
  "UWE Bristol": "https://www.uwe.ac.uk/",
  "Wrexham University": "https://www.wrexham.ac.uk/",
  "York St John University": "https://www.yorksj.ac.uk/",
  // Grandlink / other confirmed entries
  "Murdoch University": "https://www.murdoch.edu.au/",
  "Curtin University - Dubai": "https://www.curtindubai.ac.ae/",
  "Heriot Watt University": "https://www.hw.ac.uk/",
  "University of Europe for Applied Sciences": "https://www.ue-germany.com/",
  // Confirmed high-confidence masterlist entries
  "KEDGE Business School": "https://kedge.edu/",
  "Algebra University College": "https://www.algebra.hr/",
  "Collegium Da Vinci": "https://cdv.pl/",
  "University of Debrecen": "https://edu.unideb.hu/",
  "Hochschule Fresenius": "https://www.hs-fresenius.com/",
  "GISMA University for Applied Sciences": "https://www.gisma.com/",
  "Berlin School of Business and Innovation": "https://www.berlinsbi.com/",
};

async function main() {
  const universities = await prisma.university.findMany({ where: { websiteUrl: null }, select: { id: true, name: true } });
  let updated = 0;
  for (const university of universities) {
    const url = KNOWN_WEBSITES[university.name];
    if (!url) continue;
    await prisma.university.update({ where: { id: university.id }, data: { websiteUrl: url } });
    updated++;
  }
  console.log(`Backfilled websiteUrl for ${updated} universities (${universities.length} had none set).`);
}

main().catch((error) => { console.error("BACKFILL_FAILED", error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
