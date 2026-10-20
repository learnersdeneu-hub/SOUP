import Link from "next/link";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";

// Floating "Chat with Noodles" shortcut on the redesigned home and
// dashboard pages (see the "SOUP Homepage Redesign" design canvas) — a
// static link is enough here since /counselor owns the real chat state;
// this just gets the student there from anywhere on the page.
export function ChatWithNoodlesFab() {
  return (
    <Link
      href="/counselor"
      className="fixed bottom-6 right-6 z-30 flex h-14 items-center gap-2.5 rounded-full bg-teal pl-2 pr-[22px] text-[15px] font-bold text-white no-underline shadow-[0_8px_24px_rgba(11,107,80,0.3)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF4CC] text-[#8A6A00]"><NoodlesLoader size={20} active={false}/></span>
      Chat with Noodles
    </Link>
  );
}
