"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: string;
  className?: string;
};

function parseNumber(value: string) {
  return Number(value.replace(/,/g, ""));
}

function formatNumber(value: number, template: string) {
  const hasDecimal = template.includes(".");
  const fractionDigits = hasDecimal ? template.split(".")[1]?.length ?? 1 : 0;

  return value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  });
}

export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = parseNumber(value);
    const current = ref.current;
    if (!current || Number.isNaN(target)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimated) return;

        const duration = 850;
        const startedAt = performance.now();

        const tick = (time: number) => {
          const progress = Math.min((time - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(formatNumber(target * eased, value));

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            setDisplayValue(value);
            setHasAnimated(true);
          }
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.28 }
    );

    observer.observe(current);

    return () => observer.unobserve(current);
  }, [hasAnimated, value]);

  return (
    <span className={className} ref={ref}>
      {displayValue}
    </span>
  );
}
