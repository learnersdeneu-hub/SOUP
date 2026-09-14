import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/resume/types";

const styles = StyleSheet.create({
  page: { paddingVertical: 50, paddingHorizontal: 52, color: "#1C1D1F", fontFamily: "Helvetica" },
  name: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#1E3A5F" },
  contact: { marginTop: 5, fontSize: 9, color: "#6B6E73" },
  divider: { marginTop: 16, marginBottom: 22, borderBottomWidth: 1, borderBottomColor: "#D9DDE2" },
  body: { fontSize: 10.5, lineHeight: 1.65 },
});

export async function renderCoverLetterPdf(content: ResumeContent, coverLetter: string) {
  const p = content.personal;
  const doc = <Document title={`${p.fullName} Cover Letter`} author={p.fullName}><Page size="A4" style={styles.page}><View><Text style={styles.name}>{p.fullName}</Text><Text style={styles.contact}>{[p.email, p.phone, p.location].filter(Boolean).join(" · ")}</Text><View style={styles.divider} /><Text style={styles.body}>{coverLetter}</Text></View></Page></Document>;
  return renderToBuffer(doc);
}
