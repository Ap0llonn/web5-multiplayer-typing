import type { ComponentProps, ReactNode } from "react";

const paths = {
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  enter: <path d="M20 5v8a3 3 0 0 1-3 3H4m5-5-5 5 5 5" />,
  plus: <path d="M12 4v16M4 12h16" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  spark: <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7Z" />,
} satisfies Record<string, ReactNode>;

export function Icon({
  name,
  className = "",
  ...props
}: Omit<ComponentProps<"svg">, "children"> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`h-5 w-5 shrink-0 ${className}`}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
