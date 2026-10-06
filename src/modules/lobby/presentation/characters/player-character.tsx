import type { LobbyCharacter } from "../../public";

const colors = {
  cobalt: { face: "#7397ff", edge: "#4164c6", top: "#b5c8ff" },
  coral: { face: "#ffab98", edge: "#d4796b", top: "#ffdbcc" },
  mint: { face: "#92ddbd", edge: "#5aa78e", top: "#cdf4df" },
  butter: { face: "#ffdb7e", edge: "#d2a64d", top: "#fff0bc" },
} satisfies Record<LobbyCharacter, { face: string; edge: string; top: string }>;

export function PlayerCharacter({
  character,
  className = "",
}: {
  character: LobbyCharacter;
  className?: string;
}) {
  const color = colors[character];

  return (
    <svg
      viewBox="0 0 128 136"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-character={character}
      className={`player-character ${className}`}
    >
      <ellipse cx="64" cy="125" rx="39" ry="6" fill="#202944" opacity="0.1" />
      <path
        d="M43 105v11m40-11v11"
        stroke="#263553"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M34 120h13m34 0h13"
        stroke="#263553"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M17 43 25 22a12 12 0 0 1 11-8h56a12 12 0 0 1 11 8l8 21v50a15 15 0 0 1-15 15H32a15 15 0 0 1-15-15Z"
        fill={color.edge}
        stroke="#263553"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="21"
        y="16"
        width="86"
        height="82"
        rx="19"
        fill={color.face}
        stroke="#263553"
        strokeWidth="3"
      />
      <path
        d="M36 27h54"
        stroke={color.top}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse cx="48" cy="56" rx="5" ry="8" fill="#263553" />
      <ellipse cx="80" cy="56" rx="5" ry="8" fill="#263553" />
      <path
        d="M55 73q9 10 18 0"
        stroke="#263553"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="36" cy="69" rx="6" ry="3" fill="#fff" opacity="0.4" />
      <ellipse cx="92" cy="69" rx="6" ry="3" fill="#fff" opacity="0.4" />
    </svg>
  );
}
