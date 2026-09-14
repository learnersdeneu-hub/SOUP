import type { ResumeContent } from "@/lib/resume/types";

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, file.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + file.data.length;
  }
  const centralStart = offset;
  const centralData = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralData, end]);
}

function paragraph(text: string, style?: string) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function bullets(items: string[]) {
  return items.filter(Boolean).map((item) => `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr><w:r><w:t>• ${xml(item)}</w:t></w:r></w:p>`).join("");
}

function documentPackage(body: string) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/></w:rPr><w:pPr><w:spacing w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr><w:pPr><w:spacing w:after="120"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr></w:style></w:styles>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`;
  return zipStored([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes) },
    { name: "_rels/.rels", data: Buffer.from(rels) },
    { name: "word/_rels/document.xml.rels", data: Buffer.from(docRels) },
    { name: "word/styles.xml", data: Buffer.from(styles) },
    { name: "word/document.xml", data: Buffer.from(document) },
  ]);
}

export function renderResumeDocx(content: ResumeContent) {
  const p = content.personal;
  const contact = [p.email, p.phone, p.location, p.linkedin, p.portfolio].filter(Boolean).join(" | ");
  let body = paragraph(p.fullName || "Resume", "Title");
  if (p.headline) body += paragraph(p.headline);
  if (contact) body += paragraph(contact);
  if (p.summary) body += paragraph("Professional Summary", "Heading1") + paragraph(p.summary);
  if (content.experience?.length) {
    body += paragraph("Experience", "Heading1");
    for (const item of content.experience) {
      body += paragraph([item.title, item.employer].filter(Boolean).join(" — "));
      body += paragraph([item.location, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" | "));
      body += bullets(item.bullets || []);
    }
  }
  if (content.education?.length) {
    body += paragraph("Education", "Heading1");
    for (const item of content.education) {
      body += paragraph([item.qualification, item.field].filter(Boolean).join(" — "));
      body += paragraph([item.institution, item.location, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" | "));
      body += bullets(item.details || []);
    }
  }
  if (content.projects?.length) body += paragraph("Projects", "Heading1") + content.projects.map((item) => paragraph(`${item.name}${item.link ? ` — ${item.link}` : ""}`) + paragraph(item.description)).join("");
  if (content.skills?.length) body += paragraph("Skills", "Heading1") + paragraph(content.skills.join(" • "));
  if (content.achievements?.length) body += paragraph("Achievements", "Heading1") + bullets(content.achievements);
  if (content.certifications?.length) body += paragraph("Certifications", "Heading1") + bullets(content.certifications);
  if (content.languages?.length) body += paragraph("Languages", "Heading1") + paragraph(content.languages.join(" • "));
  return documentPackage(body);
}

export function renderCoverLetterDocx(content: ResumeContent, coverLetter: string) {
  const p = content.personal;
  let body = paragraph(p.fullName || "Cover Letter", "Title");
  const contact = [p.email, p.phone, p.location].filter(Boolean).join(" | ");
  if (contact) body += paragraph(contact);
  body += paragraph("");
  for (const line of coverLetter.split(/\n+/).map((item) => item.trim()).filter(Boolean)) body += paragraph(line);
  return documentPackage(body);
}
