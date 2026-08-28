"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import styles from "./chart-entry.module.css";

/**
 * Wraps a surface that fades in once its data arrives.
 *
 * Mount it only when the data is ready — the animation runs on mount, so
 * wrapping the skeleton too would mean the fade plays for the skeleton and not
 * for the numbers. Give it a `key` that changes with the selected period and
 * switching periods replays it.
 */
export function ChartEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const animation = prefersReducedMotion ? "" : styles.enter;

  return <div className={`${animation} ${className ?? ""}`.trim()}>{children}</div>;
}
