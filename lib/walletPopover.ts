type DismissReason = "escape" | "outside";

type EventSource = {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

export function listenForPopoverDismiss(
  source: EventSource,
  contains: (target: EventTarget | null) => boolean,
  dismiss: (reason: DismissReason) => void
) {
  const onPointerDown: EventListener = (event) => {
    if (!contains(event.target)) dismiss("outside");
  };
  const onKeyDown: EventListener = (event) => {
    if ((event as KeyboardEvent).key === "Escape") dismiss("escape");
  };

  source.addEventListener("pointerdown", onPointerDown);
  source.addEventListener("keydown", onKeyDown);

  return () => {
    source.removeEventListener("pointerdown", onPointerDown);
    source.removeEventListener("keydown", onKeyDown);
  };
}
