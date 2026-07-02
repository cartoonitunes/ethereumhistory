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
        // Note: /api/og/ must stay allowed so social crawlers (X, Discord,
        // Facebook, Slack) can fetch the dynamic share-card PNGs. A blanket
        // /api/ disallow silently breaks link previews. Allow entries are more
        // specific than the /api/ disallow, so they win.
        allow: ["/", "/contract/", "/browse", "/people/", "/api-docs", "/mcp-setup", "/this-week", "/api/og/"],
        disallow: ["/historian/", "/api/", "/api/analytics/"],
      },
      {
        // Social/link-preview crawlers need the OG image endpoint and page HTML.
        userAgent: ["Twitterbot", "facebookexternalhit", "Discordbot", "Slackbot", "TelegramBot", "WhatsApp", "LinkedInBot"],
        allow: ["/", "/contract/", "/browse", "/people/", "/api/og/"],
        disallow: ["/historian/", "/api/analytics/"],
      },
      {
        // Allow AI crawlers to index the public API docs and agent endpoints
        userAgent: ["Anthropic-AI", "GPTBot", "Google-Extended", "CCBot"],
        allow: ["/", "/contract/", "/browse", "/api-docs", "/api/agent/", "/api/og/", "/mcp"],
        disallow: ["/historian/", "/api/analytics/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
