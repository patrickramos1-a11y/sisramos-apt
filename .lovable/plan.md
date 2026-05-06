
## Varredura concluída — 3 grupos suspeitos encontrados

Fiz uma busca completa no banco por demandas ativas que compartilham `(descricao, responsavel_id, mes, ano)` mas têm `grupo_id` divergente, nulo, ou misturado. Resultado:

### Caso 1 — Mai/2026 — "CONSUMO HÍDRICO" (4 demandas, 1 órfã)

| Nº | Semana | semanas_repeticao | grupo_id |
|---|---|---|---|
| 2286 | 1 | 4 | `e4c6c01e…` |
| 2423 | 4 | 4 | `e4c6c01e…` |
| 2435 | 3 | **1** | **NULL** ← órfã |
| 2640 | 2 | 4 | `e4c6c01e…` |

A #2435 deveria estar no grupo `e4c6c01e…` (cobre a semana 3 que falta no grupo). Provavelmente foi recriada manualmente sem agrupamento.

### Caso 2 — Abr/2026 — "CONSUMO HÍDRICO" (4 demandas, 2 grupos diferentes)

| Nº | Semana | semanas_repeticao | grupo_id |
|---|---|---|---|
| 1694 | 2 | 4 | `7284858e…` |
| 1762 | 1 | 4 | `7284858e…` |
| 1893 | 4 | 4 | `7284858e…` |
| 1894 | 3 | **1** | `b2fb2420…` ← grupo isolado |

A #1894 (semana 3) deveria estar no grupo `7284858e…` para completar 4 semanas distintas.

### Caso 3 — Mai/2026 — "Falar com o Patrick … LO e Alvará" (2 demandas sem grupo)

| Nº | Semana | semanas_repeticao | grupo_id |
|---|---|---|---|
| 2178 | 4 | **1** | NULL |
| 2184 | 5 | **1** | NULL |

**Este caso é ambíguo**: ambas têm `semanas_repeticao=1` (declaradas como demandas únicas), em semanas diferentes (4 e 5). Pode ter sido intencional — duas demandas separadas — ou erro de criação. **Não vou tocar sem confirmação.**

## Plano de correção

### 1. Reparar Caso 1 (mai/2026 — Hídrico)
- Atualizar #2435: setar `grupo_id = e4c6c01e-3ef3-4d19-b333-cee95c6a7cc4` e `semanas_repeticao = 4`.

### 2. Reparar Caso 2 (abr/2026 — Hídrico)
- Atualizar #1894: setar `grupo_id = 7284858e-65f9-4648-8dcb-1fc88f443c77` e `semanas_repeticao = 4`.

### 3. Caso 3 — pedir confirmação
Pergunto ao usuário se quer:
- (a) Agrupar #2178 e #2184 como irmãs (semanas 4 e 5, semanas_repeticao=2), ou
- (b) Deixar como demandas independentes.

### 4. Validação pós-reparo
- Re-rodar a mesma varredura SQL para confirmar que nenhum grupo quebrado permanece.
- Confirmar que abrir #2435 ou #1894 e clicar em "Editar todas as N demandas do grupo" afeta as 4 demandas corretamente.

### 5. Detalhes técnicos
As correções são `UPDATE`s simples na tabela `demandas` via tool de insert/update. O fix do rollover já aplicado anteriormente (preservação do `grupo_id` via `Map`) garante que esses casos não voltem a acontecer em viradas de mês futuras. Os casos atuais provavelmente são resíduos de criações manuais ou de rollovers anteriores ao fix.
