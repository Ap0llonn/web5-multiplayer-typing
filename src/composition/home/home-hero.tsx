import { Icon } from "@/shared/presentation/ui/icon";

export function HomeHero({
  eyebrow,
  title,
  description,
  sticker,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sticker: string;
}) {
  return (
    <div className="home-hero">
      <div className="hero-copy">
        <p className="hero-eyebrow">
          <span className="pixel-mark" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-description">{description}</p>
      </div>
      <div className="keyboard-scene" aria-hidden="true">
        <Icon name="spark" className="keyboard-spark keyboard-spark--mint" />
        <Icon name="spark" className="keyboard-spark keyboard-spark--pink" />
        <span className="keyboard-sticker">{sticker}</span>
        <svg
          className="keyboard-art"
          viewBox="0 0 440 230"
          fill="none"
          focusable="false"
        >
          <path
            d="M49 65 363 58l51 119q7 20-13 25L76 219q-20 1-23-15L27 94q-4-22 22-29Z"
            fill="#141414"
            stroke="#141414"
            strokeWidth="8"
          />
          <path
            d="M55 27 349 27q15 0 22 15l43 116q6 16-13 18L58 188q-21 1-25-16L11 56q-4-29 44-29Z"
            fill="#2463eb"
            stroke="#141414"
            strokeWidth="8"
          />
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: row === 3 ? 3 : 10 }, (_, col) => {
              const x =
                row === 3 ? [57, 91, 313][col] : 40 + col * 31 + row * 5;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x}
                  y={48 + row * 29}
                  width={row === 3 && col === 1 ? 213 : 25}
                  height={22}
                  rx={4}
                  fill={
                    row === 0 && col === 0
                      ? "#fa7497"
                      : row === 2 && col === 9
                        ? "#ffe264"
                        : "#fff9ea"
                  }
                  stroke="#141414"
                  strokeWidth="3"
                />
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}
