import { describe, it, expect, expectTypeOf } from "vitest";
import {
  success,
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
describe("operation results", () => {
  it("requires value on success and exposes only stable error codes", () => {
    expect(success(3)).toEqual({ ok: true, value: 3 });
    expect(failure("VALIDATION")).toEqual({
      ok: false,
      error: { code: "VALIDATION", messageKey: "errors.VALIDATION" },
    });
    expectTypeOf<OperationResult<number>>().toMatchTypeOf<
      | { ok: true; value: number }
      | { ok: false; error: { code: string; messageKey: string } }
    >();
    // @ts-expect-error Boolean results are forbidden.
    const bad: OperationResult<number> = false;
    // @ts-expect-error Unknown codes cannot expose provider details.
    failure("DATABASE_PASSWORD_LEAK");
    void bad;
  });
});
