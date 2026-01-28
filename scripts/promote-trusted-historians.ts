#!/usr/bin/env node

/**
 * Promote historians to trusted status and run auto-trust check
 * 
 * Usage:
 *   npx tsx scripts/promote-trusted-historians.ts --email you@example.com
 *   npx tsx scripts/promote-trusted-historians.ts --auto-trust-all
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { eq, sql } from "drizzle-orm";

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

const email = arg("--email");
const autoTrustAll = hasFlag("--auto-trust-all");

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  if (email) {
    // Promote specific historian
    const [historian] = await db
      .select()
      .from(schema.historians)
      .where(eq(schema.historians.email, email.toLowerCase().trim()))
      .limit(1);

    if (!historian) {
      console.error(`ERROR: Historian with email ${email} not found`);
      process.exit(1);
    }

    await db
      .update(schema.historians)
      .set({
        trusted: true,
        trustedOverride: true, // Manual override
        updatedAt: new Date(),
      })
      .where(eq(schema.historians.id, historian.id));

    console.log(`✓ Promoted ${historian.name} (${historian.email}) to trusted status`);
  } else if (autoTrustAll) {
    // Run auto-trust check for all historians
    console.log("Running auto-trust check for all historians...");
    
    const allHistorians = await db.select().from(schema.historians);
    let promoted = 0;
    let alreadyTrusted = 0;
    let manuallyBlocked = 0;
    let belowThreshold = 0;

    for (const historian of allHistorians) {
      if (historian.trusted) {
        alreadyTrusted++;
        continue;
      }

      if (historian.trustedOverride === false) {
        manuallyBlocked++;
        continue;
      }

      // Get edit count
      const editCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.contractEdits)
        .where(eq(schema.contractEdits.historianId, historian.id));

      const count = editCount[0]?.count || 0;

      if (count >= 30) {
        await db
          .update(schema.historians)
          .set({
            trusted: true,
            trustedOverride: null, // Auto-managed
            updatedAt: new Date(),
          })
          .where(eq(schema.historians.id, historian.id));
        
        console.log(`✓ Auto-promoted ${historian.name} (${historian.email}) - ${count} edits`);
        promoted++;
      } else {
        belowThreshold++;
        console.log(`  ${historian.name} (${historian.email}): ${count} edits (needs 30)`);
      }
    }

    console.log("\nSummary:");
    console.log(`  Promoted: ${promoted}`);
    console.log(`  Already trusted: ${alreadyTrusted}`);
    console.log(`  Manually blocked: ${manuallyBlocked}`);
    console.log(`  Below threshold: ${belowThreshold}`);
  } else {
    console.error("Usage:");
    console.error("  npx tsx scripts/promote-trusted-historians.ts --email you@example.com");
    console.error("  npx tsx scripts/promote-trusted-historians.ts --auto-trust-all");
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    client.end();
  });
