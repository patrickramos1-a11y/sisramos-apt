
-- Step 1: Create a temp mapping table for old→new IDs
CREATE TEMP TABLE _rollover_map (
  old_id uuid,
  new_id uuid
);

-- Step 2: Insert parent recorrente instances from March → April
WITH source AS (
  SELECT * FROM checklist_instances
  WHERE mes = 3 AND ano = 2026 AND tipo_item = 'recorrente' AND parent_id IS NULL
),
inserted AS (
  INSERT INTO checklist_instances (template_id, ano, mes, semana, tipo_item, status, descricao_override, link_override, ordem_override, is_group, parent_id)
  SELECT template_id, 2026, 4, semana, 'recorrente', 'pendente', descricao_override, link_override, ordem_override, is_group, NULL
  FROM source
  RETURNING id, template_id, semana, descricao_override, ordem_override
)
INSERT INTO _rollover_map (old_id, new_id)
SELECT s.id, i.id
FROM source s
JOIN inserted i ON 
  COALESCE(s.template_id::text, '') = COALESCE(i.template_id::text, '')
  AND s.semana = i.semana
  AND COALESCE(s.descricao_override, '') = COALESCE(i.descricao_override, '')
  AND COALESCE(s.ordem_override, -1) = COALESCE(i.ordem_override, -1);

-- Step 3: Insert children mapped to new parent IDs
WITH child_source AS (
  SELECT ci.*, rm.new_id as new_parent_id
  FROM checklist_instances ci
  JOIN _rollover_map rm ON ci.parent_id = rm.old_id
  WHERE ci.mes = 3 AND ci.ano = 2026
),
inserted_children AS (
  INSERT INTO checklist_instances (template_id, ano, mes, semana, tipo_item, status, descricao_override, link_override, ordem_override, is_group, parent_id)
  SELECT template_id, 2026, 4, semana, tipo_item, 'pendente', descricao_override, link_override, ordem_override, is_group, new_parent_id
  FROM child_source
  RETURNING id, template_id, semana, descricao_override, ordem_override, parent_id
)
INSERT INTO _rollover_map (old_id, new_id)
SELECT cs.id, ic.id
FROM child_source cs
JOIN inserted_children ic ON 
  ic.parent_id = cs.new_parent_id
  AND COALESCE(cs.template_id::text, '') = COALESCE(ic.template_id::text, '')
  AND cs.semana = ic.semana
  AND COALESCE(cs.descricao_override, '') = COALESCE(ic.descricao_override, '')
  AND COALESCE(cs.ordem_override, -1) = COALESCE(ic.ordem_override, -1);

-- Step 4: Copy assignees
INSERT INTO checklist_instance_assignees (instance_id, user_id)
SELECT rm.new_id, cia.user_id
FROM checklist_instance_assignees cia
JOIN _rollover_map rm ON cia.instance_id = rm.old_id;

-- Cleanup
DROP TABLE _rollover_map;
