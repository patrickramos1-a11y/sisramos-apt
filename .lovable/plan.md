

# Refatoramento Completo de UX, Design e Responsividade - SISRAMOS

Este plano abrange a reformulacao visual completa da plataforma, baseada nas cores extraidas da logo SISRAMOS (verde claro #6FAE2E e verde escuro #2D4A22), integracao das logos fornecidas e melhorias de UX/responsividade em todas as paginas.

---

## Fase 1 -- Fundacao Visual (Logo, Cores, Favicon)

### 1.1 Copiar as logos para o projeto
- Copiar `LOGO-FUNDO-TRANSPA.png` para `src/assets/logo-full.png` (logo completa para tema claro)
- Copiar `LOGO-NEG2-FUNDO-TRANSPA.png` para `src/assets/logo-full-white.png` (logo completa para tema escuro)
- Copiar `SIMBOLO-VERDE2-FUNDO-TRANSPA.png` para `src/assets/logo-icon.png` (icone verde claro para tema claro)
- Copiar `SIMBOLO-VERDE1-FUNDO-TRANSPA.png` para `src/assets/logo-icon-dark.png` (icone verde escuro para tema escuro)
- Copiar `SIMBOLO-VERDE2-FUNDO-TRANSPA.png` para `public/favicon.png` (favicon)

### 1.2 Atualizar a paleta de cores em `src/index.css`
Cores extraidas da logo SISRAMOS:
- Verde claro (SIS): ~HSL 90 58% 43% (#6FAE2E)
- Verde escuro (RAMOS): ~HSL 120 35% 21% (#2D4A22)

**Tema claro (:root):**
- `--primary`: 90 58% 43% (verde vivo da logo)
- `--primary-foreground`: 0 0% 100%
- `--background`: 100 5% 97%
- `--card`: 0 0% 100%
- `--accent`: 90 30% 92%
- `--accent-foreground`: 120 35% 21%
- Manter as outras variaveis com ajustes de harmonia

**Tema escuro (.dark):**
- `--primary`: 90 55% 48% (verde claro mais luminoso)
- `--primary-foreground`: 120 30% 8%
- `--background`: 120 10% 7%
- `--card`: 120 10% 11%
- Ajustar accent, muted, border para harmonia com os verdes

### 1.3 Atualizar favicon e meta tags em `index.html`
- Trocar favicon para `/favicon.png`
- Atualizar title para "SISRAMOS"
- Atualizar meta descriptions e og:title

---

## Fase 2 -- Header e Navegacao

### 2.1 Redesenhar `AppLayout.tsx` (Header Desktop)
- Substituir o icone ClipboardList por `<img>` da logo SISRAMOS:
  - Tema claro: `logo-full.png` (logo colorida)
  - Tema escuro: `logo-full-white.png` (logo branca)
- Reduzir altura: manter `h-14` mas com melhor aproveitamento
- Adicionar uma linha sutil de gradiente verde na parte inferior do header
- Melhorar espacamento dos items de navegacao com hover suave
- Usar pilulas arredondadas (`rounded-full`) para os itens de nav ativos
- Melhorar o menu do usuario com avatar mais estilizado

### 2.2 Redesenhar `BottomNav.tsx` (Mobile)
- Adicionar efeito de indicador ativo (bolinha ou barra acima do icone ativo)
- Melhorar contraste e tamanho dos icones
- Usar backdrop-blur mais forte para visual de vidro
- Ajustar padding para safe-area

---

## Fase 3 -- Tela de Login

### 3.1 Redesenhar `Login.tsx`
- Centralizar a logo SISRAMOS completa no topo (usando tema claro/escuro)
- Adicionar um fundo com gradiente sutil dos dois verdes da marca
- Redesenhar os cards de usuario:
  - Bordas mais arredondadas (`rounded-2xl`)
  - Sombra mais suave e elevacao no hover
  - Efeito de escala mais sutil (1.03 em vez de 1.05)
- Adicionar texto "Selecione seu perfil" com tipografia mais refinada
- Rodape com versao e creditos sutis

---

## Fase 4 -- Dashboard

### 4.1 Melhorar KPICards (`KPICard.tsx`)
- Adicionar icones padroes por tipo (Total, Feito, Pendente, etc.)
- Bordas laterais coloridas em vez de fundo colorido inteiro
- Transicoes mais suaves
- Tipografia maior para o valor principal

### 4.2 Melhorar Graficos de Donut (`StatusDonutChart.tsx`, `GestorStatusDonutChart.tsx`)
- Centralizar valor total/percentual dentro do donut
- Legendas mais estilizadas com chips coloridos

### 4.3 Layout geral do Dashboard (`Dashboard.tsx`)
- Melhorar espacamento entre secoes
- Adicionar subtitulos mais descritivos nas tabs
- Cards com bordas mais suaves e sombras uniformes

---

## Fase 5 -- Componentes Globais e Responsividade

### 5.1 Cards e Tabelas
- Arredondar todos os cards para `rounded-xl`
- Melhorar as bordas de tabelas com cantos arredondados
- Zebra striping mais sutil

### 5.2 Botoes
- Atualizar o `buttonVariants` em `button.tsx` para usar `rounded-lg` em vez de `rounded-md`
- Melhorar transicoes de hover

### 5.3 Inputs
- Atualizar `input.tsx` para `rounded-lg`
- Melhorar focus ring com a nova cor primaria

### 5.4 Responsividade geral
- Revisar breakpoints em paginas criticas (APT, Dashboard, Checklist)
- Garantir que cards e KPIs empilham corretamente em mobile (1 coluna)

---

## Detalhes Tecnicos

### Arquivos que serao modificados:
1. `index.html` -- favicon e meta tags
2. `src/index.css` -- paleta de cores completa (light + dark)
3. `src/components/layout/AppLayout.tsx` -- header com logo
4. `src/components/layout/BottomNav.tsx` -- navegacao mobile
5. `src/pages/Login.tsx` -- tela de login redesenhada
6. `src/pages/Dashboard.tsx` -- ajustes de layout
7. `src/components/dashboard/KPICard.tsx` -- visual dos cards
8. `src/components/dashboard/StatusDonutChart.tsx` -- valor central no donut
9. `src/components/dashboard/GestorStatusDonutChart.tsx` -- valor central no donut
10. `src/components/ui/button.tsx` -- arredondamento
11. `src/components/ui/input.tsx` -- arredondamento
12. `src/App.css` -- limpar estilos nao utilizados

### Arquivos novos:
- `src/assets/logo-full.png`
- `src/assets/logo-full-white.png`
- `src/assets/logo-icon.png`
- `src/assets/logo-icon-dark.png`
- `public/favicon.png`

### Impacto:
- Zero alteracoes de logica/dados
- Apenas visual e UX
- Compatibilidade total com tema claro e escuro
- Sem novas dependencias

