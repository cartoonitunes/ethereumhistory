import postgres from "postgres";
async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT address, etherscan_contract_name, verification_method, verification_proof_url, compiler_commit
    FROM contracts 
    WHERE address IN ('0xd2eccde805e888ae37646544d60185b842ff3d6b', '0xd2ec98c4459edab3df7fa28c67b40f15c42b7614')
  `;
  console.log(JSON.stringify(rows, null, 2));
  await sql.end();
}
main().catch(console.error);
