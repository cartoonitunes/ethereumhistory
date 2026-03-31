import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { connect_timeout: 10 });
  // Check columns
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='contracts' AND column_name LIKE '%rank%' OR column_name LIKE '%order%' OR column_name LIKE '%score%'`;
  console.log('Rank-like cols:', cols.map((c:any)=>c.column_name).join(', '));
  
  // Try completeness_score or ordering
  const sample = await sql`SELECT completeness_score, deployment_rank, ordering, deployment_ordering FROM contracts LIMIT 3` 
    .catch(() => sql`SELECT completeness_score FROM contracts LIMIT 1`);
  console.log('Sample:', JSON.stringify(sample[0]));
  await sql.end();
}
main().catch(e => console.error(e.message));
