import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";

export default async function NotificationsPage() {
  const { profile } = await requireProfile();
  const notifications = await prisma.notification.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = notifications.filter((n) => !n.readAt).length;
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold text-ink">Notifications</h1><p className="mt-2 text-sm text-mute">Applications, documents, journey deadlines, partner services and support updates in one place.</p></div>{unread?<form action={markAllNotificationsRead}><button className="inline-flex items-center gap-1 rounded-xl border border-hair bg-white px-3 py-2 text-xs font-semibold text-ink"><CheckCheck size={14}/>Mark all read</button></form>:null}</div><div className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white">{notifications.length===0?<div className="px-6 py-12 text-center"><Bell className="mx-auto text-mute"/><p className="mt-3 text-sm text-mute">No notifications yet.</p></div>:notifications.map((n)=><div key={n.id} className={`border-b border-hair p-5 last:border-0 ${n.readAt?"":"bg-[#FBFCFD]"}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="text-sm font-semibold text-ink">{n.title}</span>{!n.readAt?<span className="h-2 w-2 rounded-full bg-teal"/>:null}</div><p className="mt-1 text-xs leading-5 text-mute">{n.body}</p><div className="mt-2 text-[11px] text-mute">{n.createdAt.toLocaleString()}</div></div><div className="flex shrink-0 gap-2">{n.href?<Link href={n.href} className="rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-ink">Open</Link>:null}{!n.readAt?<form action={markNotificationRead.bind(null,n.id)}><button className="rounded-lg border border-hair px-3 py-2 text-xs text-mute">Read</button></form>:null}</div></div></div>)}</div></main></div>;
}
