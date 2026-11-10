import { expect, it } from "vitest";
import { podiumTiming } from "@/modules/lobby/presentation/race/podium-timing";
it("gives bronze and silver their own reveal before the winner's spotlight", () => {
  const timing = podiumTiming(10);
  expect(timing.place(3)).toBe(0);
  expect(timing.place(2)).toBe(2.4);
  expect(timing.search).toBe(4.8);
  expect(timing.winner).toBe(8.4);
});
it("keeps a two-racer reveal paced without a missing bronze delay", () => {
  const timing = podiumTiming(2);
  expect(timing.place(2)).toBe(0);
  expect(timing.search).toBe(2.4);
  expect(timing.winner).toBe(6);
});
