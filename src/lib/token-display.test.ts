import assert from "node:assert/strict";
import test from "node:test";
import { isCollectibleContract } from "./token-display";

test("documented wallet proxies stay out of the collectibles list", () => {
  assert.equal(
    isCollectibleContract({
      tokenName: "yÞ",
      tokenSymbol: "\u0080",
      contractName: "WalletProxy",
      hasDescription: true,
    }),
    false
  );
});

test("a named historical token remains collectible", () => {
  assert.equal(
    isCollectibleContract({
      tokenName: "NoCoin",
      tokenSymbol: "NC",
      contractName: null,
      hasDescription: true,
    }),
    true
  );
});
