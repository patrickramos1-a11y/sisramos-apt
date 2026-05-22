ALTER TABLE public.setores
ADD COLUMN IF NOT EXISTS acoes jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.setores
SET acoes = coalesce(acoes, '{}'::jsonb) || jsonb_build_object(
  'whatsapp',
  jsonb_build_object(
    'enabled', true,
    'phone', '5591984299440',
    'template', 'Patrick, estou com uma duvida sobre a demanda:\n\n*{{descricao}}*\n\nNumero: #{{numero}}\nSetor: {{setor}}\nResponsavel: {{responsavel}}\nSemanas: {{semanas}}\nMes/Ano: {{mes}}/{{ano}}'
  )
)
WHERE nome ILIKE 'Ac. Processo%';
