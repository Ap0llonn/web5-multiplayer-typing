import type { ComponentProps } from "react";

export function Card({
  tone = "paper",
  className = "",
  ...props
}: ComponentProps<"section"> & { tone?: "paper" | "yellow" | "mint" }) {
  return (
    <section
      className={`arcade-card arcade-card--${tone} ${className}`}
      {...props}
    />
  );
}
