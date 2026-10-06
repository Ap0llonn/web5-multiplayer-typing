import Image from "next/image";

const illustrations = {
  keyboard: {
    src: "/illustrations/keyboard-playground.png",
    width: 1536,
    height: 1024,
  },
  friends: {
    src: "/illustrations/keycap-friends.png",
    width: 1254,
    height: 1254,
  },
} as const;

/** Decorative art never carries information needed to use a form. */
export function DecorativeImage({
  kind,
  className = "",
  eager = false,
}: {
  kind: keyof typeof illustrations;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      {...illustrations[kind]}
      alt=""
      aria-hidden="true"
      data-testid={`${kind}-illustration`}
      className={`decorative-image ${className}`}
      sizes={
        kind === "keyboard"
          ? "(max-width: 760px) 90vw, 600px"
          : "(max-width: 760px) 220px, 380px"
      }
      loading={eager ? "eager" : "lazy"}
    />
  );
}
