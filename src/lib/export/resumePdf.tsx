import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/resume/types";

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 34, paddingHorizontal: 38, fontSize: 9.5, color: "#1C1D1F", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 1, borderBottomColor: "#D8DDE3", paddingBottom: 12, marginBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  photo: { width: 58, height: 58, borderRadius: 4, objectFit: "cover" },
  headerBody: { flexGrow: 1 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1E3A5F" },
  headline: { marginTop: 3, fontSize: 10.5, color: "#34495E" },
  contact: { marginTop: 6, fontSize: 8.5, color: "#656A70", lineHeight: 1.35 },
  summary: { marginTop: 8, fontSize: 9.3, lineHeight: 1.45 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1E3A5F", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 7 },
  item: { marginBottom: 9 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", flexGrow: 1 },
  itemDate: { fontSize: 8.2, color: "#6B6E73" },
  itemSub: { marginTop: 2, fontSize: 8.6, color: "#5E646A" },
  bullet: { marginTop: 2, marginLeft: 8, fontSize: 8.8, lineHeight: 1.35 },
  twoCol: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: { fontSize: 8.3, paddingVertical: 3, paddingHorizontal: 5, backgroundColor: "#F0F3F6", borderRadius: 3 },
  plain: { fontSize: 8.8, lineHeight: 1.4 },
  footer: { position: "absolute", left: 38, right: 38, bottom: 18, fontSize: 7.5, color: "#8A8E93", textAlign: "right" },
});

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ExperienceSection({ items }: { items: ResumeContent["experience"] }) {
  if (!items.length) return null;
  return <View style={styles.section}><SectionTitle>Experience</SectionTitle>{items.map((x, i) => <View key={i} style={styles.item} wrap={false}><View style={styles.itemHeader}><Text style={styles.itemTitle}>{x.title} · {x.employer}</Text><Text style={styles.itemDate}>{[x.startDate, x.endDate].filter(Boolean).join(" – ")}</Text></View>{x.location ? <Text style={styles.itemSub}>{x.location}</Text> : null}{x.bullets.map((b, j) => <Text key={j} style={styles.bullet}>• {b}</Text>)}</View>)}</View>;
}

function EducationSection({ items }: { items: ResumeContent["education"] }) {
  if (!items.length) return null;
  return <View style={styles.section}><SectionTitle>Education</SectionTitle>{items.map((e, i) => <View key={i} style={styles.item} wrap={false}><View style={styles.itemHeader}><Text style={styles.itemTitle}>{e.qualification}{e.field ? `, ${e.field}` : ""}</Text><Text style={styles.itemDate}>{[e.startDate, e.endDate].filter(Boolean).join(" – ")}</Text></View><Text style={styles.itemSub}>{e.institution}{e.location ? ` · ${e.location}` : ""}</Text>{e.details?.map((d, j) => <Text key={j} style={styles.bullet}>• {d}</Text>)}</View>)}</View>;
}

export async function renderResumePdf(content: ResumeContent) {
  const p = content.personal;
  const contact = [p.email, p.phone, p.location, p.linkedin, p.portfolio].filter(Boolean).join(" · ");
  const doc = <Document title={`${p.fullName} Resume`} author={p.fullName} subject="Professional resume">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}><View style={styles.headerRow}>{p.photoDataUrl ? <Image src={p.photoDataUrl} style={styles.photo} /> : null}<View style={styles.headerBody}><Text style={styles.name}>{p.fullName}</Text><Text style={styles.headline}>{p.headline}</Text><Text style={styles.contact}>{contact}</Text></View></View><Text style={styles.summary}>{p.summary}</Text></View>
      <ExperienceSection items={content.experience} />
      {content.projects.length > 0 ? <View style={styles.section}><SectionTitle>Selected Projects</SectionTitle>{content.projects.map((x, i) => <View key={i} style={styles.item} wrap={false}><Text style={styles.itemTitle}>{x.name}</Text><Text style={styles.plain}>{x.description}</Text>{x.link ? <Text style={styles.itemSub}>{x.link}</Text> : null}</View>)}</View> : null}
      <Text style={styles.footer}>1 / 2</Text>
    </Page>
    <Page size="A4" style={styles.page}>
      <EducationSection items={content.education} />
      <View style={styles.twoCol}>
        <View style={styles.col}>{content.skills.length > 0 ? <View style={styles.section}><SectionTitle>Skills</SectionTitle><View style={styles.tagWrap}>{content.skills.map((s) => <Text key={s} style={styles.tag}>{s}</Text>)}</View></View> : null}{content.certifications.length > 0 ? <View style={styles.section}><SectionTitle>Certifications</SectionTitle>{content.certifications.map((x, i) => <Text key={i} style={styles.plain}>• {x}</Text>)}</View> : null}</View>
        <View style={styles.col}>{content.achievements.length > 0 ? <View style={styles.section}><SectionTitle>Achievements</SectionTitle>{content.achievements.map((x, i) => <Text key={i} style={styles.plain}>• {x}</Text>)}</View> : null}{content.languages.length > 0 ? <View style={styles.section}><SectionTitle>Languages</SectionTitle><Text style={styles.plain}>{content.languages.join(" · ")}</Text></View> : null}</View>
      </View>
      <Text style={styles.footer}>2 / 2</Text>
    </Page>
  </Document>;
  return renderToBuffer(doc);
}
