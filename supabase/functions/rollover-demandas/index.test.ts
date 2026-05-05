import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

// ---------- Helpers ----------

async function getResponsavelId(): Promise<string> {
  const r = await fetch(`${REST_URL}/profiles?select=user_id&limit=1`, { headers: HEADERS });
  const data = await r.json();
  return data[0].user_id;
}

async function insertDemandas(rows: Record<string, unknown>[]): Promise<void> {
  const r = await fetch(`${REST_URL}/demandas`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Insert failed: ${r.status} ${txt}`);
  }
  await r.text();
}

async function fetchDemandasByPrefix(prefix: string) {
  const r = await fetch(
    `${REST_URL}/demandas?select=id,descricao,mes,ano,grupo_id,observacoes,prioritaria,semana_limite&descricao=like.${encodeURIComponent(prefix + "%")}`,
    { headers: HEADERS },
  );
  return await r.json() as Array<{
    id: string;
    descricao: string;
    mes: number;
    ano: number;
    grupo_id: string | null;
    observacoes: string | null;
    prioritaria: boolean;
    semana_limite: number[];
  }>;
}

async function deleteByPrefix(prefix: string): Promise<void> {
  const r = await fetch(
    `${REST_URL}/demandas?descricao=like.${encodeURIComponent(prefix + "%")}`,
    { method: "DELETE", headers: HEADERS },
  );
  await r.text();
}

async function callRollover(body: Record<string, unknown>) {
  const r = await fetch(`${FUNCTIONS_URL}/rollover-demandas`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await r.json();
  return { status: r.status, json };
}

async function patchDemanda(id: string, patch: Record<string, unknown>) {
  const r = await fetch(`${REST_URL}/demandas?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  await r.text();
  return r.ok;
}

async function patchByGrupo(grupoId: string, patch: Record<string, unknown>) {
  const r = await fetch(`${REST_URL}/demandas?grupo_id=eq.${grupoId}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  await r.text();
  return r.ok;
}

async function deleteByGrupo(grupoId: string) {
  const r = await fetch(`${REST_URL}/demandas?grupo_id=eq.${grupoId}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  await r.text();
  return r.ok;
}

function uniqPrefix() {
  return `ZZTEST_${crypto.randomUUID().slice(0, 8)}`;
}

// Use a far-future test year to keep isolated from real data
const TEST_YEAR = 2099;

// ===================================================================
// TEST 1 — Single-month demand (no grupo_id) IS rolled over
// ===================================================================
Deno.test("rollover: demanda sem grupo_id é copiada para mes seguinte", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  try {
    await insertDemandas([
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_simple`,
        mes: 1, ano: TEST_YEAR,
        semana_limite: [1],
        semanas_repeticao: 1,
        ativa: true,
      },
    ]);

    const { status, json } = await callRollover({
      sourceMes: 1, sourceAno: TEST_YEAR,
      targetMes: 2, targetAno: TEST_YEAR,
      dryRun: true,
    });

    assertEquals(status, 200);
    const ours = (json.preview ?? []).filter((d: any) =>
      d.descricao?.startsWith(prefix)
    );
    assertEquals(ours.length, 1, "Deveria copiar a demanda single-month");
    assertEquals(ours[0].mes, 2);
    assertEquals(ours[0].ano, TEST_YEAR);
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 2 — Multi-month group (mai + set) is SKIPPED on jun rollover
// (the leakage bug we just fixed)
// ===================================================================
Deno.test("rollover: grupo multi-mês NÃO vaza para mês não planejado", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_recorrente`,
        mes: 1, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoId, ativa: true,
      },
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_recorrente`,
        mes: 5, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoId, ativa: true,
      },
    ]);

    // Rolling jan -> fev should SKIP (because group also exists in mai)
    const { status, json } = await callRollover({
      sourceMes: 1, sourceAno: TEST_YEAR,
      targetMes: 2, targetAno: TEST_YEAR,
      dryRun: true,
    });

    assertEquals(status, 200);
    const ours = (json.preview ?? []).filter((d: any) =>
      d.descricao?.startsWith(prefix)
    );
    assertEquals(ours.length, 0, "Demanda multi-mês NÃO deveria vazar para fev");
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 3 — Rollover doesn't duplicate when target already has signature
// ===================================================================
Deno.test("rollover: não duplica quando demanda já existe no destino", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  try {
    await insertDemandas([
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_dup`,
        mes: 1, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1, ativa: true,
      },
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_dup`, // mesma descricao+responsavel
        mes: 2, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1, ativa: true,
      },
    ]);

    const { status, json } = await callRollover({
      sourceMes: 1, sourceAno: TEST_YEAR,
      targetMes: 2, targetAno: TEST_YEAR,
      dryRun: true,
    });

    assertEquals(status, 200);
    const ours = (json.preview ?? []).filter((d: any) =>
      d.descricao?.startsWith(prefix)
    );
    assertEquals(ours.length, 0, "Não deve duplicar demanda já existente no destino");
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 4 — Rollover skips when target already has a sibling of same grupo_id
// (pre-scheduled multi-month group, jan -> mai exact pre-scheduled month)
// ===================================================================
Deno.test("rollover: pula se grupo_id já tem ocorrência no destino", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_pre`,
        mes: 1, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoId, ativa: true,
      },
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_pre`,
        mes: 5, ano: TEST_YEAR,
        semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoId, ativa: true,
      },
    ]);

    // Tenta copiar jan -> mai (mai já tem pré-agendada)
    const { status, json } = await callRollover({
      sourceMes: 1, sourceAno: TEST_YEAR,
      targetMes: 5, targetAno: TEST_YEAR,
      dryRun: true,
    });

    assertEquals(status, 200);
    const ours = (json.preview ?? []).filter((d: any) =>
      d.descricao?.startsWith(prefix)
    );
    assertEquals(ours.length, 0, "Não deve duplicar grupo já presente no destino");
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 5 — Group edit: PATCH by grupo_id updates ALL siblings across months
// ===================================================================
Deno.test("edit: editar por grupo_id atualiza todas as irmãs em todos os meses", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([1, 3, 5].map((mes) => ({
      responsavel_id: responsavelId,
      descricao: `${prefix}_edit`,
      observacoes: "obs original",
      mes, ano: TEST_YEAR,
      semana_limite: [1], semanas_repeticao: 1,
      grupo_id: grupoId, ativa: true,
      prioritaria: false,
    })));

    const before = await fetchDemandasByPrefix(prefix);
    assertEquals(before.length, 3);

    const ok = await patchByGrupo(grupoId, {
      observacoes: "obs editada",
      prioritaria: true,
    });
    assert(ok, "PATCH por grupo_id deveria suceder");

    const after = await fetchDemandasByPrefix(prefix);
    assertEquals(after.length, 3);
    for (const d of after) {
      assertEquals(d.observacoes, "obs editada", `mes ${d.mes}: observacoes não atualizada`);
      assertEquals(d.prioritaria, true, `mes ${d.mes}: prioritaria não atualizada`);
    }
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 6 — "Apenas esta": PATCH by id NÃO afeta as irmãs
// ===================================================================
Deno.test("edit: editar 'apenas esta' (PATCH por id) não afeta irmãs do mesmo grupo", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([1, 3].map((mes) => ({
      responsavel_id: responsavelId,
      descricao: `${prefix}_single_edit`,
      observacoes: "compartilhada",
      mes, ano: TEST_YEAR,
      semana_limite: [1], semanas_repeticao: 1,
      grupo_id: grupoId, ativa: true,
    })));

    const all = await fetchDemandasByPrefix(prefix);
    const target = all.find((d) => d.mes === 1)!;
    const sibling = all.find((d) => d.mes === 3)!;

    const ok = await patchDemanda(target.id, { observacoes: "só esta mudou" });
    assert(ok);

    const after = await fetchDemandasByPrefix(prefix);
    const targetAfter = after.find((d) => d.id === target.id)!;
    const siblingAfter = after.find((d) => d.id === sibling.id)!;
    assertEquals(targetAfter.observacoes, "só esta mudou");
    assertEquals(siblingAfter.observacoes, "compartilhada", "Irmã não deve mudar");
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 7 — Group delete: DELETE by grupo_id removes ALL siblings
// ===================================================================
Deno.test("delete: deletar por grupo_id remove todas as irmãs", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([1, 2, 3, 4].map((mes) => ({
      responsavel_id: responsavelId,
      descricao: `${prefix}_del_all`,
      mes, ano: TEST_YEAR,
      semana_limite: [1], semanas_repeticao: 1,
      grupo_id: grupoId, ativa: true,
    })));

    const before = await fetchDemandasByPrefix(prefix);
    assertEquals(before.length, 4);

    const ok = await deleteByGrupo(grupoId);
    assert(ok);

    const after = await fetchDemandasByPrefix(prefix);
    assertEquals(after.length, 0, "Todas irmãs deveriam ter sido removidas");
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 8 — "Apenas esta" delete: remove só uma, mantém grupo_id nas demais
// ===================================================================
Deno.test("delete: deletar 'apenas esta' não remove irmãs", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoId = crypto.randomUUID();
  try {
    await insertDemandas([1, 2, 3].map((mes) => ({
      responsavel_id: responsavelId,
      descricao: `${prefix}_del_one`,
      mes, ano: TEST_YEAR,
      semana_limite: [1], semanas_repeticao: 1,
      grupo_id: grupoId, ativa: true,
    })));

    const all = await fetchDemandasByPrefix(prefix);
    const victim = all.find((d) => d.mes === 2)!;

    const r = await fetch(`${REST_URL}/demandas?id=eq.${victim.id}`, {
      method: "DELETE", headers: HEADERS,
    });
    await r.text();
    assert(r.ok);

    const after = await fetchDemandasByPrefix(prefix);
    assertEquals(after.length, 2);
    assertEquals(after.filter((d) => d.mes === 2).length, 0);
    // Restantes mantêm grupo_id
    for (const d of after) {
      assertEquals(d.grupo_id, grupoId, "Irmãs devem manter o grupo_id");
    }
  } finally {
    await deleteByPrefix(prefix);
  }
});

// ===================================================================
// TEST 9 — Mixed scenario: rollover preserves multi-mês groups but copies
// regular demands in the same call
// ===================================================================
Deno.test("rollover: cenário misto — copia normais e pula multi-mês", async () => {
  const prefix = uniqPrefix();
  const responsavelId = await getResponsavelId();
  const grupoMulti = crypto.randomUUID();
  try {
    await insertDemandas([
      // Normal — deve copiar
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_normal`,
        mes: 1, ano: TEST_YEAR, semana_limite: [1], semanas_repeticao: 1, ativa: true,
      },
      // Multi-mês — NÃO deve copiar para fev
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_multi`,
        mes: 1, ano: TEST_YEAR, semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoMulti, ativa: true,
      },
      {
        responsavel_id: responsavelId,
        descricao: `${prefix}_multi`,
        mes: 4, ano: TEST_YEAR, semana_limite: [1], semanas_repeticao: 1,
        grupo_id: grupoMulti, ativa: true,
      },
    ]);

    const { status, json } = await callRollover({
      sourceMes: 1, sourceAno: TEST_YEAR,
      targetMes: 2, targetAno: TEST_YEAR,
      dryRun: true,
    });

    assertEquals(status, 200);
    const ours = (json.preview ?? []).filter((d: any) =>
      d.descricao?.startsWith(prefix)
    );
    const normais = ours.filter((d: any) => d.descricao.endsWith("_normal"));
    const multi = ours.filter((d: any) => d.descricao.endsWith("_multi"));
    assertEquals(normais.length, 1, "Demanda normal deveria ser copiada");
    assertEquals(multi.length, 0, "Demanda multi-mês NÃO deveria ser copiada");
  } finally {
    await deleteByPrefix(prefix);
  }
});
