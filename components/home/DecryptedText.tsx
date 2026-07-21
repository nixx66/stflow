"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DecryptedTextProps = {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: "view" | "hover" | "inViewHover" | "click";
  clickMode?: "once" | "toggle";
};

const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0
} as const;

export function DecryptedText({
  text,
  speed = 48,
  maxIterations = 10,
  sequential = false,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  className = "",
  parentClassName = "",
  encryptedClassName = "",
  animateOn = "hover",
  clickMode = "once"
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== "click");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const [direction, setDirection] = useState<"forward" | "reverse">("forward");

  const containerRef = useRef<HTMLSpanElement>(null);
  const orderRef = useRef<number[]>([]);
  const pointerRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableChars = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.split(""))).filter((char) => char !== " ")
      : characters.split("");
  }, [characters, text, useOriginalCharsOnly]);

  const shuffleText = useCallback(
    (originalText: string, currentRevealed: Set<number>) => {
      return originalText
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (currentRevealed.has(index)) return originalText[index];
          return availableChars[Math.floor(Math.random() * availableChars.length)] ?? char;
        })
        .join("");
    },
    [availableChars]
  );

  const computeOrder = useCallback(
    (length: number) => {
      if (revealDirection === "end") return Array.from({ length }, (_, index) => length - 1 - index);
      if (revealDirection === "center") {
        const middle = Math.floor(length / 2);
        const order: number[] = [];
        let offset = 0;
        while (order.length < length) {
          const index = offset % 2 === 0 ? middle + offset / 2 : middle - Math.ceil(offset / 2);
          if (index >= 0 && index < length) order.push(index);
          offset++;
        }
        return order;
      }
      return Array.from({ length }, (_, index) => index);
    },
    [revealDirection]
  );

  const fillAllIndices = useCallback(() => new Set(Array.from({ length: text.length }, (_, index) => index)), [text.length]);

  const triggerDecrypt = useCallback(() => {
    if (sequential) {
      orderRef.current = computeOrder(text.length);
      pointerRef.current = 0;
    }
    setRevealedIndices(new Set());
    setDirection("forward");
    setIsAnimating(true);
  }, [computeOrder, sequential, text.length]);

  const triggerReverse = useCallback(() => {
    if (sequential) {
      orderRef.current = computeOrder(text.length).slice().reverse();
      pointerRef.current = 0;
    }
    const allIndices = fillAllIndices();
    setRevealedIndices(allIndices);
    setDisplayText(shuffleText(text, allIndices));
    setDirection("reverse");
    setIsAnimating(true);
  }, [computeOrder, fillAllIndices, sequential, shuffleText, text]);

  const encryptInstantly = useCallback(() => {
    const emptySet = new Set<number>();
    setRevealedIndices(emptySet);
    setDisplayText(shuffleText(text, emptySet));
    setIsDecrypted(false);
  }, [shuffleText, text]);

  useEffect(() => {
    if (!isAnimating) return;

    let currentIteration = 0;

    intervalRef.current = setInterval(() => {
      setRevealedIndices((previous) => {
        if (sequential) {
          if (direction === "forward") {
            if (pointerRef.current < orderRef.current.length) {
              const next = orderRef.current[pointerRef.current++];
              const nextSet = new Set(previous);
              nextSet.add(next);
              setDisplayText(shuffleText(text, nextSet));
              return nextSet;
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsAnimating(false);
            setDisplayText(text);
            setIsDecrypted(true);
            return previous;
          }

          if (pointerRef.current < orderRef.current.length) {
            const next = orderRef.current[pointerRef.current++];
            const nextSet = new Set(previous);
            nextSet.delete(next);
            setDisplayText(shuffleText(text, nextSet));
            return nextSet;
          }
        } else if (direction === "forward") {
          setDisplayText(shuffleText(text, previous));
          currentIteration++;
          if (currentIteration >= maxIterations) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsAnimating(false);
            setDisplayText(text);
            setIsDecrypted(true);
          }
          return previous;
        }

        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsAnimating(false);
        setIsDecrypted(false);
        return previous;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [direction, isAnimating, maxIterations, sequential, shuffleText, speed, text]);

  useEffect(() => {
    if (animateOn !== "view" && animateOn !== "inViewHover") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            triggerDecrypt();
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.22 }
    );

    const current = containerRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [animateOn, hasAnimated, triggerDecrypt]);

  useEffect(() => {
    if (animateOn === "click") {
      encryptInstantly();
    } else {
      setDisplayText(text);
      setIsDecrypted(true);
    }
  }, [animateOn, encryptInstantly, text]);

  const hoverHandlers =
    animateOn === "hover" || animateOn === "inViewHover"
      ? {
          onMouseEnter: () => {
            if (!isAnimating) triggerDecrypt();
          },
          onMouseLeave: () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsAnimating(false);
            setDisplayText(text);
            setIsDecrypted(true);
          }
        }
      : {};

  const clickHandlers =
    animateOn === "click"
      ? {
          onClick: () => {
            if (clickMode === "once" && isDecrypted) return;
            if (clickMode === "toggle" && isDecrypted) {
              triggerReverse();
            } else {
              triggerDecrypt();
            }
          }
        }
      : {};

  return (
    <span className={parentClassName} ref={containerRef} style={{ display: "inline-block", whiteSpace: "pre-wrap" }} {...hoverHandlers} {...clickHandlers}>
      <span style={srOnly}>{displayText}</span>
      <span aria-hidden="true">
        {displayText.split("").map((char, index) => {
          const revealed = revealedIndices.has(index) || (!isAnimating && isDecrypted);
          return (
            <span className={revealed ? className : encryptedClassName} key={`${char}-${index}`}>
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
