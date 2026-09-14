import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 42, paddingHorizontal: 46, fontSize: 10, color: "#1A2733", lineHeight: 1.55 },
  brand: { fontSize: 9, color: "#557080", marginBottom: 18 },
  title: { fontSize: 20, fontWeight: 700, color: "#173B5E", marginBottom: 14 },
  h2: { marginTop: 12, marginBottom: 6, fontSize: 11, fontWeight: 700, color: "#173B5E" },
  body: { fontSize: 10.5, lineHeight: 1.65 },
  item: { marginBottom: 5, fontSize: 9.5, lineHeight: 1.5 },
  note: { marginTop: 18, padding: 10, backgroundColor: "#F4F7F8", fontSize: 8.5, color: "#65727D" },
  footer: { position: "absolute", bottom: 24, left: 46, right: 46, display: "flex", flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#7C8994" },
});

function List({ items }: { items?: unknown[] }) {
  const safe = Array.isArray(items) ? items.map(String).filter(Boolean) : [];
  return <View>{safe.length ? safe.map((item, i) => <Text key={i} style={styles.item}>• {item}</Text>) : <Text style={styles.item}>No additional supported findings recorded.</Text>}</View>;
}

type SnapshotInput = { version: number; content: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asUnknownArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function GciReportSnapshotPDF({ snapshot }: { snapshot: SnapshotInput }) {
  const content = asRecord(snapshot.content);
  const outputs = asRecord(content.outputs);
  const report = asRecord(outputs.gciReport);
  const narrative = asRecord(report.narrative);
  const score = report.overallScore;
  return (
    <Document title={`Complete GCI Report v${snapshot.version}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>GCI.ai · Complete GCI Report</Text>
        <Text style={styles.title}>Credibility overview</Text>
        <Text style={styles.body}>{String(narrative.executiveSummary || "This report summarizes the evidence and profile information available to GCI at finalization.")}</Text>
        <Text style={styles.h2}>Current GCI score</Text>
        <Text style={styles.body}>{score == null ? "Not yet scored" : String(score)}</Text>
        <Text style={styles.h2}>Evidence reviewed</Text>
        <List items={asUnknownArray(narrative.evidenceSummary)} />
        <View style={styles.note}><Text>GCI separates customer claims, AI-extracted evidence, and formal verification. A report snapshot does not convert AI analysis into legal or institutional verification.</Text></View>
        <View style={styles.footer}><Text>Snapshot v{snapshot.version}</Text><Text>Page 1 of 3</Text></View>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>GCI.ai · Complete GCI Report</Text>
        <Text style={styles.title}>Evidence & verification</Text>
        <Text style={styles.h2}>Verified findings</Text>
        <List items={asUnknownArray(narrative.verifiedFindings)} />
        <Text style={styles.h2}>Unresolved or incomplete items</Text>
        <List items={asUnknownArray(narrative.unresolvedItems)} />
        <View style={styles.note}><Text>Only findings backed by the recorded evidence and verification state should be treated as supported. Unresolved items remain explicitly unresolved.</Text></View>
        <View style={styles.footer}><Text>Snapshot v{snapshot.version}</Text><Text>Page 2 of 3</Text></View>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>GCI.ai · Complete GCI Report</Text>
        <Text style={styles.title}>Next actions & package status</Text>
        <Text style={styles.h2}>Recommended next actions</Text>
        <List items={asUnknownArray(narrative.recommendedNextActions)} />
        <Text style={styles.h2}>Included customer outputs</Text>
        <Text style={styles.item}>Resume: {String(asRecord(outputs.resume).status || "NOT_AVAILABLE")}</Text>
        <Text style={styles.item}>Cover letter: {String(asRecord(outputs.coverLetter).status || "NOT_AVAILABLE")}</Text>
        <Text style={styles.item}>Complete GCI Report: AVAILABLE</Text>
        <View style={styles.note}><Text>This PDF is generated from a versioned GCI snapshot so the evidence set used for this report can be traced later.</Text></View>
        <View style={styles.footer}><Text>Snapshot v{snapshot.version}</Text><Text>Page 3 of 3</Text></View>
      </Page>
    </Document>
  );
}
