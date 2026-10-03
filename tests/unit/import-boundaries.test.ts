import { expect, it } from "vitest";
import { checkImports } from "../../scripts/check-boundaries";
it("rejects cross-module and deep imports, and transitive client to server", () => {
  expect(
    checkImports({
      "src/modules/a/a.ts": "import type {B} from '@/modules/b/public';",
    }),
  ).toHaveLength(1);
  expect(
    checkImports({
      "src/shared/a.ts": "import {x} from '@/modules/a/server';",
    }),
  ).toHaveLength(1);
  expect(
    checkImports({
      "src/composition/a.ts": "import {x} from '@/modules/a/container';",
    }),
  ).toHaveLength(1);
  expect(
    checkImports({
      "src/composition/a.ts": "import {x} from '@/modules/a/server';",
    }),
  ).toEqual([]);
  expect(
    checkImports({
      "src/modules/a/presentation/x.tsx":
        "'use client'; import {x} from '../helper';",
      "src/modules/a/helper.ts": "import 'server-only';",
    }),
  ).toHaveLength(1);
});
it("rejects similarly named private entries and direct server packages in client files", () => {
  expect(
    checkImports({
      "src/composition/a.ts": "import {x} from '@/modules/a/server-secret';",
    }),
  ).toHaveLength(1);
  expect(
    checkImports({
      "src/modules/a/presentation/x.tsx":
        "'use client'; import {PrismaClient} from '@prisma/client';",
    }),
  ).toHaveLength(1);
});
