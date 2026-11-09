import type { OperationResult } from "@/shared/contracts/operation-result";
export interface RaceTextRepository {
  findCorpus(
    language: "fr" | "en",
  ): Promise<OperationResult<{ content: string; source: string }[]>>;
  findDictionary(language: "fr" | "en"): Promise<OperationResult<string[]>>;
}
