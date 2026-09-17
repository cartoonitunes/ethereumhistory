import assert from "node:assert/strict";
import test from "node:test";
import { combineProviderHoldings } from "./collector-card";

test("an NFT returned by both provider APIs is counted once", () => {
  const address = "0x4b1705c75fde41e35e454ddd14e5d0a0eac06280";
  assert.deepEqual(
    combineProviderHoldings(
      [{ contractAddress: address.toUpperCase(), balance: "1" }],
      [{ contractAddress: address, balance: "1", tokenType: "erc721" }]
    ),
    [{ contractAddress: address, balance: "1", tokenType: "erc721" }]
  );
});

test("distinct direct and wrapped contracts remain distinct", () => {
  const direct = "0xe468d26721b703d224d05563cb64746a7a40e1f4";
  const wrapper = "0x4b1705c75fde41e35e454ddd14e5d0a0eac06280";
  assert.deepEqual(
    combineProviderHoldings(
      [{ contractAddress: direct, balance: "1" }],
      [{ contractAddress: wrapper, balance: "1", tokenType: "erc721" }]
    ).map((holding) => holding.contractAddress),
    [direct, wrapper]
  );
});

test("the token balance remains available when the NFT API has no match", () => {
  const token = "0x59bfd39ce27839287e946692f92153d4aa0950d3";
  assert.deepEqual(
    combineProviderHoldings([{ contractAddress: token, balance: "42" }], []),
    [{ contractAddress: token, balance: "42", tokenType: "erc20" }]
  );
});
