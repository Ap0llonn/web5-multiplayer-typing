export function podiumTiming(count: number) {
  const places = Math.min(3, count);
  const search = Math.max(0, places - 1) * 2.4;
  return {
    search,
    winner: search + 3.6,
    place: (rank: number) => Math.max(0, places - rank) * 2.4,
  };
}
