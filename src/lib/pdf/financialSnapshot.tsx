import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 42, paddingHorizontal: 46, fontSize: 10, color: "#1A2733", lineHeight: 1.55 },
  brand: { fontSize: 9, color: "#557080", marginBottom: 18 },
  title: { fontSize: 20, fontWeight: 700, color: "#173B5E", marginBottom: 14 },
  body: { fontSize: 10.5, lineHeight: 1.65 },
  footer: { position: "absolute", bottom: 24, left: 46, right: 46, display: "flex", flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#7C8994" },
  note: { marginTop: 24, padding: 10, backgroundColor: "#F4F7F8", fontSize: 8.5, color: "#65727D" },
});

type SnapshotInput = { version: number; content: unknown };
type PagePlanItem = { page?: string | number; title?: unknown; body?: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function FinancialSnapshotPDF({ snapshot }: { snapshot: SnapshotInput }) {
  const content = asRecord(snapshot.content);
  const pages: PagePlanItem[] = Array.isArray(content.pagePlan)
    ? content.pagePlan.map(asRecord).map((page) => ({ page: typeof page.page === "string" || typeof page.page === "number" ? page.page : undefined, title: page.title, body: page.body }))
    : [];
  return (
    <Document title={`GCI Financial & Valuation v${snapshot.version}`}>
      {pages.map((page, index) => (
        <Page key={page.page || index} size="A4" style={styles.page}>
          <Text style={styles.brand}>GCI.ai · Financial & Valuation</Text>
          <Text style={styles.title}>{String(page.title || "Financial & valuation")}</Text>
          <Text style={styles.body}>{String(page.body || "No supported information available for this section.")}</Text>
          {index === pages.length - 1 && <View style={styles.note}><Text>AI document analysis and evidence consistency checks are not the same as legal title verification or an independent regulated valuation. The report should state the verification sources actually used.</Text></View>}
          <View style={styles.footer}><Text>Snapshot v{snapshot.version}</Text><Text>Page {index + 1} of {pages.length}</Text></View>
        </Page>
      ))}
    </Document>
  );
}
