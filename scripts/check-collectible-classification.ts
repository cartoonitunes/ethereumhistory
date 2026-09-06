/**
 * Classification cases for the collectibles / activity split.
 *
 *     npx tsx scripts/check-collectible-classification.ts
 *
 * Exits non zero on any disagreement, so it can gate a change to the rules.
 *
 * These are real rows, not invented ones, and each is here because it broke a
 * previous version of the classifier:
 *
 *   a name pattern alone rejected ChronoBankAssetProxy and InitializedProxy,
 *     which are Chronobank TIME and Feisty Doge NFT
 *   requiring a token identity rejected ayeAyeCoin, which has none recorded
 *   a description rescued wallet proxies that had been written up
 *   an already cleaned name made a proxy look like a well named token, which
 *     is the case the "cleaned" entries below cover
 *
 * The CJK, emoji and at sign rows are the ones an over eager rule breaks, so
 * they are here to stay broken loudly rather than quietly.
 */
import { isCollectibleContract } from "../src/lib/token-display";
const GARBLED_SYM = "\u0095\u00d8\u009bA";
const cases: [string, Parameters<typeof isCollectibleContract>[0], boolean][] = [
  ["f22f raw",        { tokenName: "\u00fd\u00de", tokenSymbol: GARBLED_SYM, contractName: null, hasDescription: false }, false],
  ["f22f cleaned",    { tokenName: "0xf22f...d058", tokenSymbol: null, contractName: null, hasDescription: false }, false],
  ["d2f0 cleaned+doc",{ tokenName: "0xd2f0...e89b", tokenSymbol: null, contractName: null, hasDescription: true }, false],
  ["f6ed WalletProxy",{ tokenName: "\u00fd\u00de", tokenSymbol: GARBLED_SYM, contractName: "WalletProxy", hasDescription: true }, false],
  ["MistCoin",        { tokenName: "MistCoin", tokenSymbol: "MC", contractName: "MistCoin", hasDescription: true }, true],
  ["ayeAyeCoin",      { tokenName: null, tokenSymbol: null, contractName: "ayeAyeCoin", hasDescription: true }, true],
  ["CJK token",       { tokenName: "\u5494\u5494", tokenSymbol: "KAKA", contractName: "token", hasDescription: true }, true],
  ["emoji ticker",    { tokenName: "Unicorn Meat", tokenSymbol: "\ud83c\udf56", contractName: null, hasDescription: true }, true],
  ["at sign token",   { tokenName: "@", tokenSymbol: "@", contractName: "MyToken", hasDescription: true }, true],
  ["token via proxy", { tokenName: "Chronobank TIME", tokenSymbol: "TIME", contractName: "ChronoBankAssetProxy", hasDescription: false }, true],
  ["Feisty Doge",     { tokenName: "Feisty Doge NFT", tokenSymbol: "NFD", contractName: "InitializedProxy", hasDescription: false }, true],
  ["Wallet",          { tokenName: null, tokenSymbol: null, contractName: "Wallet", hasDescription: true }, false],
  ["ProtoDAO",        { tokenName: null, tokenSymbol: null, contractName: "ProtoDAO_0x7931c901_Sep24", hasDescription: true }, false],
  ["BankWallet",      { tokenName: null, tokenSymbol: null, contractName: "BankWallet", hasDescription: true }, false],
];
let fail = 0;
for (const [label, input, expected] of cases) {
  const got = isCollectibleContract(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label.padEnd(18)} expected ${expected ? "collectible" : "activity"}, got ${got ? "collectible" : "activity"}`);
}
console.log(`\n  ${cases.length - fail}/${cases.length} passed`);
if (fail) process.exit(1);
