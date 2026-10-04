import type { ComponentProps } from "react";

export function Badge({
  tone = "paper",
  className = "",
  ...props
}: ComponentProps<"span"> & {
  tone?: "paper" | "blue" | "pink" | "mint" | "yellow";
}) {
  return (
    <span
      className={`arcade-badge arcade-badge--${tone} ${className}`}
      {...props}
    />
  );
}
