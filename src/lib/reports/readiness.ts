type AnalysisRecord = Record<string, unknown>;
type EvidenceDoc = { documentType: string; aiAnalysis: unknown; reviewStatus?: string };
type PropertyFact = { field?: unknown; value?: unknown };
type PropertyItem = { addressText?: string | null; ownershipNames?: unknown; documentStatedValue?: string | null; extractedFacts?: unknown };

function asRecord(value: unknown): AnalysisRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnalysisRecord : {};
}

function analysisOf(doc: EvidenceDoc) {
  const a = asRecord(doc.aiAnalysis);
  return {
    confidence: String(a.confidence || "").toUpperCase(),
    inconsistencies: Array.isArray(a.possibleInconsistencies) ? a.possibleInconsistencies.filter(Boolean) : [],
    missing: Array.isArray(a.missingOrUnclear) ? a.missingOrUnclear.filter(Boolean) : [],
  };
}

function propertyCoreSupport(items: PropertyItem[]) {
  const values = { location: false, owner: false, statedValue: false };
  for (const item of items) {
    if (String(item.addressText || "").trim()) values.location = true;
    if (String(item.documentStatedValue || "").trim()) values.statedValue = true;
    if (Array.isArray(item.ownershipNames) && item.ownershipNames.some(Boolean)) values.owner = true;

    const facts: PropertyFact[] = Array.isArray(item.extractedFacts)
      ? item.extractedFacts.filter((fact): fact is PropertyFact => Boolean(fact && typeof fact === "object" && !Array.isArray(fact)))
      : [];
    for (const fact of facts) {
      const field = String(fact.field || "");
      const value = String(fact.value || "").trim();
      if (!value) continue;
      if (/(property.*(address|location|description)|address|location|situated)/i.test(field)) values.location = true;
      if (/(owner|registered.*name|proprietor|title.*holder|asset.*holder|subject.*name)/i.test(field)) values.owner = true;
      if (/(document.*stated.*value|declared.*(value|cost)|stated.*value|consideration|purchase.*price|property.*value)/i.test(field)) values.statedValue = true;
    }
  }
  return { ...values, count: Number(values.location) + Number(values.owner) + Number(values.statedValue) };
}

export function assessFullGciReadiness(documents: EvidenceDoc[]) {
  const classes = new Set(documents.map((d) => d.documentType.trim().toLowerCase()).filter(Boolean));
  const analyses = documents.map(analysisOf);
  const highOrMedium = analyses.filter((a) => a.confidence === "HIGH" || a.confidence === "MEDIUM").length;
  const unresolved = analyses.flatMap((a) => [...a.inconsistencies, ...a.missing]);
  const reasons: string[] = [];
  if (documents.length < 2) reasons.push("At least two independently processed supporting documents are required before a Complete GCI package can be finalized.");
  if (classes.size < 2) reasons.push("The current evidence is too narrow. Add a different type of supporting document so GCI can cross-check more than one area of the profile.");
  if (documents.length && highOrMedium === 0) reasons.push("The processed evidence is still low-confidence. Add a clearer document or resolve the unreadable information first.");
  return {
    status: reasons.length ? "NOT_READY" as const : unresolved.length ? "READY_WITH_GAPS" as const : "READY_FOR_FINALIZATION" as const,
    canFinalize: reasons.length === 0,
    reasons,
    unresolved: unresolved.slice(0, 8),
    evidenceCount: documents.length,
    distinctEvidenceTypes: classes.size,
  };
}

export function assessFinancialReadiness(args: { documents: EvidenceDoc[]; propertyEvidence: PropertyItem[]; mode: "FINANCIAL_ONLY" | "INTEGRATED"; hasBroaderContext: boolean }) {
  const { documents, propertyEvidence, mode, hasBroaderContext } = args;
  const analyses = documents.map(analysisOf);
  const reasons: string[] = [];
  if (!documents.length) reasons.push("Process at least one financial or property document before finalizing the report.");
  const propertyFlow = propertyEvidence.length > 0 || documents.some((d) => /(property|properties|real estate|land|immovable(?: asset)?|assets? and properties|title|deed|registry|lease)/i.test(d.documentType));
  if (propertyFlow) {
    const support = propertyCoreSupport(propertyEvidence);
    if (documents.length < 2) reasons.push("A property-focused final report needs a second independent piece of evidence so GCI can cross-check the property record rather than relying on one document alone.");
    if (support.count < 2) {
      const missing = [!support.location ? "address/location" : "", !support.owner ? "ownership name" : "", !support.statedValue ? "document-stated value" : ""].filter(Boolean);
      reasons.push(`The processed property evidence still lacks enough normalized core facts${missing.length ? ` (${missing.join(", ")})` : ""}.`);
    }
  }
  if (mode === "INTEGRATED" && !hasBroaderContext) reasons.push("Integrated Financial & Valuation requires saved Resume or Full GCI context. Choose Financial-only or complete broader GCI context first.");
  if (documents.length && analyses.every((a) => a.confidence === "LOW")) reasons.push("The current evidence is low-confidence. Add a clearer document before producing a final report.");
  const unresolved = analyses.flatMap((a) => [...a.inconsistencies, ...a.missing]);
  return {
    status: reasons.length ? "NOT_READY" as const : unresolved.length ? "READY_WITH_GAPS" as const : "READY_FOR_FINALIZATION" as const,
    canFinalize: reasons.length === 0,
    reasons,
    unresolved: unresolved.slice(0, 8),
    evidenceCount: documents.length,
    propertyFlow,
  };
}
