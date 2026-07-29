import assert from "node:assert/strict";
import test from "node:test";
import { listenForPopoverDismiss } from "../lib/walletPopover.ts";

class FakeDocument {
  listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

test("dismisses for outside pointer events and Escape only", () => {
  const document = new FakeDocument();
  const reasons: string[] = [];
  const inside = {};

  listenForPopoverDismiss(
    document,
    (target) => target === inside,
    (reason) => reasons.push(reason)
  );

  document.dispatch("pointerdown", { target: inside } as unknown as Event);
  document.dispatch("pointerdown", { target: {} } as unknown as Event);
  document.dispatch("keydown", { key: "Enter" } as KeyboardEvent);
  document.dispatch("keydown", { key: "Escape" } as KeyboardEvent);

  assert.deepEqual(reasons, ["outside", "escape"]);
});

test("removes both listeners when the popover closes or unmounts", () => {
  const document = new FakeDocument();
  let closes = 0;
  const cleanup = listenForPopoverDismiss(document, () => false, () => {
    closes += 1;
  });

  cleanup();
  document.dispatch("pointerdown", { target: {} } as unknown as Event);
  document.dispatch("keydown", { key: "Escape" } as KeyboardEvent);

  assert.equal(closes, 0);
  assert.equal(document.listeners.get("pointerdown")?.size, 0);
  assert.equal(document.listeners.get("keydown")?.size, 0);
});
