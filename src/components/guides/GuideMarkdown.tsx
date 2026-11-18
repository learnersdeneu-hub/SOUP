import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Tailwind has no typography plugin in this project, so the article styles
// are mapped element by element here, kept close to the redesigned pages'
// tokens (ink/mute/teal/hair) and readable at phone width.
const components: Components = {
  h2: ({ children }) => <h2 className="mt-10 text-xl font-semibold leading-snug text-ink sm:text-2xl">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-7 text-base font-semibold text-ink sm:text-lg">{children}</h3>,
  p: ({ children }) => <p className="mt-4 text-[15px] leading-7 text-mute">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-mute marker:text-teal">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-mute marker:text-teal">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="mt-6 rounded-2xl border border-hair bg-white px-5 py-1 [&_p]:text-sm [&_p]:leading-6">{children}</blockquote>,
  hr: () => <hr className="my-10 border-hair" />,
  table: ({ children }) => <div className="mt-5 overflow-x-auto rounded-2xl border border-hair bg-white"><table className="w-full min-w-[520px] border-collapse text-left text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border-b border-hair bg-paper/60 px-4 py-3 text-xs font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-hair px-4 py-3 align-top text-[13px] leading-6 text-mute">{children}</td>,
  a: ({ href = "", children }) => {
    const className = "font-semibold text-teal underline decoration-teal/30 underline-offset-2 hover:decoration-teal";
    if (href.startsWith("/")) return <Link href={href} className={className}>{children}</Link>;
    return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

export function GuideMarkdown({ body }: { body: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{body}</ReactMarkdown>;
}
