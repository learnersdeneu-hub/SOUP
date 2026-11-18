import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/guides/content";

// Signed-in areas redirect crawlers to /sign-in, so they're disallowed to
// keep crawl budget on the public pages. /sign-in itself is not
// disallowed: it is SOUP's public landing page. Draft previews live under /admin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account", "/dashboard", "/counselor", "/chat", "/applications", "/documents", "/profile", "/colleges", "/companion/", "/payments", "/auth/", "/recommend/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
