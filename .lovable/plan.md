## Objetivo

Adicionar um novo campo **"Observações"** nas demandas da APT, posicionado entre as colunas **Descrição** e **Feito?**. O campo será:
- Opcional no formulário de **Nova Demanda**
- Editável no diálogo de edição (irmãs)
- Visível na **tabela desktop** e nos **cards mobile** da APT (Execução)
- **Ocultável** via menu "Colunas" (mesmo padrão do "Feito")
- Incluído no **PDF exportado**

---

## 1. Banco de dados

Criar migração para adicionar a coluna `observacoes` na tabela `demandas`:

```sql
ALTER TABLE public.demandas
ADD COLUMN observacoes text;
```

- Tipo `text`, **nullable** (campo opcional)
- Sem default
- RLS já cobre — nada a alterar

---

## 2. Formulário "Nova Demanda" — `src/components/apt/NovaDemandaDialog.tsx`

- Adicionar `observacoes: ""` ao `formData` inicial e ao `resetForm`.
- Adicionar campo logo abaixo da **Descrição** (antes de "Repetições"):
  - Label: **Observações** (sem asterisco — opcional)
  - `Textarea` simples (sem formatação rica), `rows={2}`, placeholder: *"Observações adicionais (opcional)..."*
- No `handleSubmit`, propagar o valor em cada item de `allDemandas`:
  ```ts
  observacoes: formData.observacoes.trim() || null,
  ```

---

## 3. Diálogo de edição — `src/components/apt/EditarDemandaIrmaDialog.tsx`

- Acrescentar `observacoes` ao `Demanda` interface e ao `formData`.
- Carregar valor existente quando o diálogo abre.
- Adicionar `Textarea` "Observações" abaixo da Descrição.
- Incluir `observacoes` nos updates tanto do escopo `single` quanto `all`.

---

## 4. Lista (Execução) — `src/pages/APT.tsx`

### Estado de visibilidade
- Adicionar `const [hideObservacoesColumn, setHideObservacoesColumn] = useState(false);`
- No menu **"Colunas"** (desktop e mobile), adicionar item:
  - *"Mostrar/Ocultar coluna Observações"* (com ícone Eye/EyeOff), seguindo exatamente o padrão do toggle "Feito" já existente.

### Tabela desktop
- No `TableHeader`, inserir nova `TableHead` **entre Descrição e Feito?**:
  ```tsx
  {!hideObservacoesColumn && (
    <TableHead className="w-48 text-primary-foreground font-semibold">
      Observações
    </TableHead>
  )}
  ```
- Passar `observacoes` e `showObservacoesColumn={!hideObservacoesColumn}` para `DemandaTableRow`.

### Cards mobile
- Passar `observacoes` para `DemandaCard`. Quando preenchido, exibir abaixo da descrição em estilo discreto (texto menor, `text-muted-foreground`, com label "Obs:").
- Respeitar `hideObservacoesColumn` também no mobile (ocultar quando o gestor desativar).

---

## 5. Linha da tabela — `src/components/apt/DemandaTableRow.tsx`

- Adicionar props: `observacoes?: string | null` e `showObservacoesColumn?: boolean` (default `true`).
- Renderizar nova `TableCell` entre Descrição e Feito?:
  ```tsx
  {showObservacoesColumn && (
    <TableCell className="whitespace-normal break-words text-sm text-muted-foreground w-48">
      {observacoes || "—"}
    </TableCell>
  )}
  ```

---

## 6. Card mobile — `src/components/apt/DemandaCard.tsx`

- Adicionar props `observacoes?: string | null` e `showObservacoes?: boolean`.
- Logo abaixo do bloco de descrição, se houver `observacoes` e `showObservacoes !== false`, renderizar:
  ```tsx
  <div className="px-3 pb-2">
    <p className="text-xs text-muted-foreground italic">
      <span className="font-medium not-italic">Obs:</span> {observacoes}
    </p>
  </div>
  ```

---

## 7. Hook `useDemandas` — `src/hooks/useDemandas.ts`

- Adicionar `observacoes: string | null` ao `interface Demanda`. (`select("*")` já traz a coluna automaticamente — não precisa mudar a query.)

---

## 8. Exportação PDF — `src/components/apt/ExportDemandasButton.tsx` + `src/hooks/useExportPDF.ts`

### `ExportDemandasButton.tsx`
- Adicionar `observacoes: d.observacoes || ""` no objeto retornado em `exportData`.
- Adicionar `observacoes` ao `Demanda` interface local.

### `useExportPDF.ts`
- Adicionar `observacoes: string` ao `DemandaExport`.
- Inserir nova coluna no `head` e no `body`, **entre Descrição e Feito**:
  ```ts
  head: [["Nº", "Setor", "Responsável", "Descrição", "Observações", "Feito", "Aprovado", "Rep.", "Semana"]]
  ```
  ```ts
  // body row
  d.observacoes.length > 40 ? d.observacoes.substring(0, 40) + "..." : d.observacoes,
  ```
- Ajustar `columnStyles` para acomodar a nova coluna (reduzir descrição para ~38, observações ~32, manter restantes), e mudar `orientation` do `jsPDF` para `landscape` para evitar overflow:
  ```ts
  const doc = new jsPDF({ orientation: "landscape" });
  ```

---

## 9. Resumo dos arquivos alterados

- **Migração SQL nova** — adiciona `demandas.observacoes`
- `src/components/apt/NovaDemandaDialog.tsx` — novo campo no formulário
- `src/components/apt/EditarDemandaIrmaDialog.tsx` — campo de edição
- `src/pages/APT.tsx` — header da tabela, toggle de visibilidade, props nos cards/linhas
- `src/components/apt/DemandaTableRow.tsx` — nova célula
- `src/components/apt/DemandaCard.tsx` — exibição mobile
- `src/hooks/useDemandas.ts` — tipagem
- `src/components/apt/ExportDemandasButton.tsx` — passa observações no payload
- `src/hooks/useExportPDF.ts` — coluna no PDF + landscape

## Fora do escopo

- A página **Gerenciamento → Lista** não foi solicitada; permanecerá inalterada (pode ser adicionada depois se desejado).
- Sem alterações em filtros, busca ou ordenação por observações.
