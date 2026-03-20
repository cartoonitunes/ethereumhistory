-- Migration 044: Fix runtime_bytecode_hash for standalone Greeter contracts
-- These Greeters were indexed after self-destruct so their runtime_bytecode_hash
-- doesn't match HelloWorld (0xfea8c4afb88575cd89a2d7149ab366e7328b08eb), which was
-- indexed before self-destruct and correctly groups 52 identical deployments.
-- Setting these to match HelloWorld's hash groups them with their siblings on the /proofs page.

UPDATE contracts
  SET runtime_bytecode_hash = (
    SELECT runtime_bytecode_hash FROM contracts
    WHERE address = '0xfea8c4afb88575cd89a2d7149ab366e7328b08eb'
    LIMIT 1
  )
  WHERE address IN (
    '0xcde4de4d3baa9f2cb0253de1b86271152fbf7864',
    '0xda0c1c188213f92dd32b44796b4313ae267a68eb',
    '0x838e90a2f735276d8c7824c3858b7ceb3aa6b110',
    '0x76173df7aceeeb990839dc0c359c4a3ec1e01da7',
    '0x3d26e176a2d25d3ae98f67c9f1086704be816e5e'
  );
