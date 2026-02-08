import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.ethereumhistory.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contract/", "/browse", "/people/", "/api-docs", "/mcp-setup", "/this-week"],
        disallow: ["/historian/", "/api/", "/api/analytics/"],
      },
      {
        // Allow AI crawlers to index the public API docs and agent endpoints
        userAgent: ["Anthropic-AI", "GPTBot", "Google-Extended", "CCBot"],
        allow: ["/", "/contract/", "/browse", "/api-docs", "/api/agent/", "/mcp"],
        disallow: ["/historian/", "/api/analytics/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
