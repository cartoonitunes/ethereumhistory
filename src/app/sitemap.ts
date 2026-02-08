import { MetadataRoute } from "next";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import * as schema from "@/lib/schema";
import { isNotNull, ne, desc, eq } from "drizzle-orm";
import { ERAS } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.ethereumhistory.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mcp-setup`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/this-week`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Era landing pages
    {
      url: `${baseUrl}/eras`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...Object.keys(ERAS).map((eraId) => ({
      url: `${baseUrl}/eras/${eraId}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // Contract type landing pages
    ...["token", "multisig", "crowdsale", "exchange", "wallet", "registry", "dao", "game", "unknown"].map((type) => ({
      url: `${baseUrl}/types/${type}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  if (!isDatabaseConfigured()) {
    return staticPages;
  }

  try {
    const db = getDb();

    // Get all documented contracts (those with descriptions — highest priority)
    const documentedContracts = await db
      .select({
        address: schema.contracts.address,
        updatedAt: schema.contracts.updatedAt,
        featured: schema.contracts.featured,
      })
      .from(schema.contracts)
      .where(
        isNotNull(schema.contracts.shortDescription)
      )
      .orderBy(desc(schema.contracts.updatedAt));

    // Get undocumented contracts (still indexable, lower priority)
    const undocumentedContracts = await db
      .select({
        address: schema.contracts.address,
        updatedAt: schema.contracts.updatedAt,
      })
      .from(schema.contracts)
      .where(
        eq(schema.contracts.shortDescription, "")
      )
      .orderBy(desc(schema.contracts.updatedAt))
      .limit(500); // Cap at 500 undocumented for sitemap size

    // Get all people pages
    const people = await db
      .select({
        slug: schema.people.slug,
        updatedAt: schema.people.updatedAt,
      })
      .from(schema.people);

    // Build contract page entries
    const contractPages: MetadataRoute.Sitemap = documentedContracts.map(
      (contract) => ({
        url: `${baseUrl}/contract/${contract.address}`,
        lastModified: contract.updatedAt || new Date(),
        changeFrequency: "weekly" as const,
        priority: contract.featured ? 0.9 : 0.8,
      })
    );

    const undocumentedPages: MetadataRoute.Sitemap = undocumentedContracts.map(
      (contract) => ({
        url: `${baseUrl}/contract/${contract.address}`,
        lastModified: contract.updatedAt || new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })
    );

    // Build people page entries
    const peoplePages: MetadataRoute.Sitemap = people.map((person) => ({
      url: `${baseUrl}/people/${person.slug}`,
      lastModified: person.updatedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...contractPages, ...undocumentedPages, ...peoplePages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
