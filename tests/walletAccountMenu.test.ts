import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/wallet/WalletConnectControl.tsx", "utf8");

test("connected wallet control exposes an accessible account menu", () => {
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
});

test("account menu supports copy, disconnect, outside click, and Escape", () => {
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /useDisconnect/);
  assert.match(source, /pointerdown/);
  assert.match(source, /event\.key === "Escape"/);
});

test("connected wallet no longer delegates to RainbowKit's account modal", () => {
  assert.doesNotMatch(source, /openAccountModal/);
});
