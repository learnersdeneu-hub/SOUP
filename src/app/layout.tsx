import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "SOUP — Students Online University Portal",
  description: "Your AI-powered international student journey, from university discovery to departure.",
  icons: {
    icon: "/brand/soup-mark.png",
    shortcut: "/brand/soup-mark.png",
    apple: "/brand/soup-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}</ToastProvider></body></html>;
}
