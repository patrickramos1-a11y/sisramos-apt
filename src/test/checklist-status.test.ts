import { describe, expect, it } from "vitest";
import {
  getChecklistStatusOption,
  isChecklistMonthlyAvulsoResolved,
  isChecklistStatusFinal,
  normalizeChecklistStatus,
} from "@/lib/checklist-status";

describe("checklist status", () => {
  it("normalizes legacy outcomes", () => {
    expect(normalizeChecklistStatus("concluido")).toBe("feito");
    expect(normalizeChecklistStatus("nao_realizado")).toBe("nao_feito");
  });

  it("treats all four outcomes as final", () => {
    expect(isChecklistStatusFinal("feito")).toBe(true);
    expect(isChecklistStatusFinal("nao_feito")).toBe(true);
    expect(isChecklistStatusFinal("nao_relevante")).toBe(true);
    expect(isChecklistStatusFinal("nao_consegui")).toBe(true);
    expect(isChecklistStatusFinal("pendente")).toBe(false);
  });

  it("only closes a monthly avulso with a definitive outcome", () => {
    expect(isChecklistMonthlyAvulsoResolved("feito")).toBe(true);
    expect(isChecklistMonthlyAvulsoResolved("nao_feito")).toBe(true);
    expect(isChecklistMonthlyAvulsoResolved("nao_relevante")).toBe(false);
    expect(isChecklistMonthlyAvulsoResolved("nao_consegui")).toBe(false);
    expect(isChecklistMonthlyAvulsoResolved("pendente")).toBe(false);
  });

  it("falls back to pending for unknown values", () => {
    expect(normalizeChecklistStatus("valor-invalido")).toBe("pendente");
    expect(getChecklistStatusOption("valor-invalido").label).toBe("Pendente");
  });
});
