import type { ComponentProps } from "react";

type ButtonVariant = "ink" | "pink" | "paper" | "blue";
type ButtonSize = "default" | "small";

export function buttonStyles({
  variant = "ink",
  size = "default",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `arcade-button arcade-button--${variant} ${size === "small" ? "arcade-button--small" : ""} ${className}`;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
