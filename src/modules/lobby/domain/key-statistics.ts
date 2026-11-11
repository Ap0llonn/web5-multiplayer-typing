import type { KeyStatistic } from "../contracts/key-statistics";

export function recordKeyStatistic(
  statistics: KeyStatistic[],
  key: string,
  correct: boolean,
) {
  const lowercase = key.toLowerCase().normalize("NFC");
  const normalized = [...lowercase].length === 1 ? lowercase : key;
  const entry = statistics.find((statistic) => statistic.key === normalized);
  if (entry) {
    entry.total++;
    if (!correct) entry.errors++;
  } else if (statistics.length < 256) {
    statistics.push({ key: normalized, total: 1, errors: correct ? 0 : 1 });
  }
}

export function mergeKeyStatistics(groups: KeyStatistic[][]): KeyStatistic[] {
  const merged = new Map<string, KeyStatistic>();
  for (const group of groups)
    for (const entry of group) {
      const previous = merged.get(entry.key);
      merged.set(entry.key, {
        key: entry.key,
        total: entry.total + (previous?.total ?? 0),
        errors: entry.errors + (previous?.errors ?? 0),
      });
    }
  return [...merged.values()].sort((a, b) => a.key.localeCompare(b.key));
}
