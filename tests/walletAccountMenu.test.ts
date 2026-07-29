import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const control = readFileSync("components/wallet/WalletConnectControl.tsx", "utf8");

test("valid connected accounts mount an isolated account popover", () => {
  assert.match(control, /<WalletAccountPopover/);
  assert.match(control, /key=\{account\.address\}/);
  assert.doesNotMatch(control, /useState|useEffect|useRef|useDisconnect/);
});

test("account popover uses grouped buttons without claiming ARIA menu behavior", () => {
  const popover = readFileSync("components/wallet/WalletAccountPopover.tsx", "utf8");

  assert.match(popover, /aria-expanded=\{open\}/);
  assert.match(popover, /aria-label="Wallet account actions"/);
  assert.match(popover, /role="group"/);
  assert.doesNotMatch(popover, /role="menu"|role="menuitem"|aria-haspopup="menu"/);
  assert.match(popover, /copyButtonRef\.current\?\.focus/);
  assert.match(popover, /triggerRef\.current\?\.focus/);
  assert.match(popover, /setCopied\(false\)/);
});

test("clipboard guard reactivates when StrictMode replays the mount effect", () => {
  const popover = readFileSync("components/wallet/WalletAccountPopover.tsx", "utf8");
  const setup = popover.indexOf("active.current = true");
  const cleanup = popover.indexOf("active.current = false");

  assert.notEqual(setup, -1);
  assert.notEqual(cleanup, -1);
  assert.ok(setup < cleanup);
});
