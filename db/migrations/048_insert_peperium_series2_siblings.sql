-- Insert all 13 Peperium Series 2 factory-created contracts
INSERT INTO contracts (address, deployer_address, deployment_block, deployment_timestamp, era_id, contract_type, short_description) VALUES
('0x5921f43985a027ba74ee110b77dce09b96de943e', '0xb4e34890034a13325363b3226dce8eeec292d626', 4210431, to_timestamp(1503863519), 'spurious', 'token', 'RARE Pepe collectible card token (Series 2). Factory-deployed by the Peperium platform.'),
('0x60e762fa4fcb2ba472b055d64febbfcca000ed6c', '0xb4e34890034a13325363b3226dce8eeec292d626', 4329462, to_timestamp(1506918342), 'spurious', 'token', NULL),
('0x6160a19ec62392adf43cc22c89c0193432216417', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351696, to_timestamp(1507586285), 'spurious', 'token', NULL),
('0x4b5cf00ae4d5b1a8dc4e0d81f28e373aadbe59d3', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351698, to_timestamp(1507586323), 'spurious', 'token', NULL),
('0xba7101b0aaf0f1cf655240ed519c4ecac3394022', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351778, to_timestamp(1507589323), 'spurious', 'token', NULL),
('0xdaa9cecfe002536574d7958c50950f8f545a9bd4', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351785, to_timestamp(1507589553), 'spurious', 'token', NULL),
('0xf10e9228221777920d413e74aa40a54b33886ac4', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351789, to_timestamp(1507589620), 'spurious', 'token', NULL),
('0x11266bf3498fabe08707c16f3ba7fbf526cf9f98', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351792, to_timestamp(1507589699), 'spurious', 'token', NULL),
('0xa9ddec7e4b31d63aa9feaf77190b242070483b24', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351793, to_timestamp(1507589725), 'spurious', 'token', NULL),
('0x5443f7d80875afd18737f2a5322161582373ce5e', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351796, to_timestamp(1507589804), 'spurious', 'token', NULL),
('0x0273b0846a9877af88b3f080fb963d8f51679996', '0xb4e34890034a13325363b3226dce8eeec292d626', 4351801, to_timestamp(1507589872), 'spurious', 'token', NULL),
('0xc8a1464d5936c9dcb033daa7fc198215e7538292', '0xb4e34890034a13325363b3226dce8eeec292d626', 4388194, to_timestamp(1508399308), 'spurious', 'token', NULL),
('0x7469580d483e9832b9c68676b5ea17141be97df2', '0xb4e34890034a13325363b3226dce8eeec292d626', 4397506, to_timestamp(1508528469), 'spurious', 'token', NULL)
ON CONFLICT (address) DO UPDATE SET
  deployer_address = EXCLUDED.deployer_address,
  deployment_block = EXCLUDED.deployment_block,
  deployment_timestamp = EXCLUDED.deployment_timestamp,
  era_id = EXCLUDED.era_id,
  contract_type = EXCLUDED.contract_type;
