import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

type ApplicationPlanData = Prisma.UniversityShortlistGetPayload<{
  include: { items: { include: { university: true; program: true } } };
}>;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 46, paddingHorizontal: 44, fontSize: 9.5, color: "#1C1D1F", lineHeight: 1.5 },
  brand: { fontSize: 9, color: "#6B6E73", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 8 },
  meta: { fontSize: 9, color: "#6B6E73", marginBottom: 14 },
  summary: { fontSize: 10.5, lineHeight: 1.65, marginBottom: 14 },
  h2: { fontSize: 12, fontWeight: 700, color: "#1E3A5F", marginTop: 10, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 8, padding: 10, marginBottom: 9 },
  row: { display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  name: { fontSize: 11, fontWeight: 700, color: "#1C1D1F", maxWidth: "78%" },
  partner: { fontSize: 8, color: "#0F7B6C", fontWeight: 700 },
  independent: { fontSize: 8, color: "#6B6E73", fontWeight: 700 },
  detail: { fontSize: 9, marginTop: 3, color: "#1C1D1F" },
  muted: { fontSize: 8.5, marginTop: 3, color: "#6B6E73" },
  url: { fontSize: 7.5, marginTop: 3, color: "#1E3A5F" },
  note: { marginTop: 12, padding: 10, backgroundColor: "#F4F7F8", fontSize: 8, color: "#65727D" },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, fontSize: 7.5, color: "#7C8994" },
});

export function ApplicationPlanPDF({ shortlist }: { shortlist: ApplicationPlanData }) {
  const summary = asRecord(shortlist.researchSummary);
  return (
    <Document title={`${shortlist.title} v${shortlist.version}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.brand}>SOUP · Students Online University Portal</Text>
        <Text style={styles.title}>{shortlist.title}</Text>
        <Text style={styles.meta}>Version {shortlist.version} · Generated {new Date(shortlist.generatedAt).toLocaleDateString()} · Search scope: {shortlist.regionScope || "As discussed with Noodles"}</Text>
        {summary.studentSummary ? <Text style={styles.summary}>{String(summary.studentSummary)}</Text> : null}
        <Text style={styles.h2}>Recommended universities</Text>
        {shortlist.items.map((item, index) => {
          const program = item.program;
          const sources = stringArray(item.sourceUrls);
          const cautions = stringArray(item.cautions);
          return (
            <View key={item.id} style={styles.card} wrap={false}>
              <View style={styles.row}><Text style={styles.name}>{index + 1}. {item.university.name}</Text><Text style={item.isPartnerAtGeneration ? styles.partner : styles.independent}>{item.isPartnerAtGeneration ? "SOUP PARTNER" : "INDEPENDENT"}</Text></View>
              <Text style={styles.detail}>{item.university.country}{item.university.city ? ` · ${item.university.city}` : ""}</Text>
              {program ? <Text style={styles.detail}>{program.title} · {program.level}</Text> : null}
              {program?.tuitionAmount ? <Text style={styles.muted}>Tuition: {program.tuitionCurrency || ""} {String(program.tuitionAmount)}{program.intake ? ` · Intake: ${program.intake}` : ""}</Text> : program?.intake ? <Text style={styles.muted}>Intake: {program.intake}</Text> : null}
              {item.eligibilityStatus ? <Text style={styles.muted}>Status: {item.eligibilityStatus.replaceAll("_", " ")}</Text> : null}
              {item.rationale ? <Text style={styles.detail}>Why it is on your list: {item.rationale}</Text> : null}
              {cautions.length ? <Text style={styles.muted}>Important: {cautions.join(" · ")}</Text> : null}
              {sources.slice(0, 3).map((source: string, i: number) => <Text key={i} style={styles.url}>{source}</Text>)}
            </View>
          );
        })}
        {stringArray(summary.researchNotes).length ? <><Text style={styles.h2}>Research notes</Text>{stringArray(summary.researchNotes).map((note, i) => <Text key={i} style={styles.muted}>• {note}</Text>)}</> : null}
        <View style={styles.note}><Text>This plan is advisory and based on the information available when generated. University requirements, fees and deadlines can change. SOUP-managed applications are available only where a valid SOUP partner relationship/service exists; independent recommendations must be handled externally unless SOUP explicitly confirms otherwise. No percentage match scores are used or shown.</Text></View>
        <Text style={styles.footer}>SOUP University Application Plan · Always re-check critical requirements on the cited official source before submission.</Text>
      </Page>
    </Document>
  );
}
