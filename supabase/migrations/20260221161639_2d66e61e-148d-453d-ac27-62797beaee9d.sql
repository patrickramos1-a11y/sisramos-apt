
-- ============================================================
-- CHECKLIST REFACTORING: Template/Instance Architecture
-- ============================================================

-- 1. Create checklist_templates table (recurring task definitions)
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  ordem_global INTEGER NOT NULL DEFAULT 0,
  link_default TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  semanas_aplicaveis INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create checklist_template_assignees (default assignees for templates)
CREATE TABLE public.checklist_template_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- 3. Create checklist_instances table (weekly task executions)
CREATE TABLE public.checklist_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  semana INTEGER NOT NULL,
  tipo_item TEXT NOT NULL DEFAULT 'recorrente',
  status TEXT NOT NULL DEFAULT 'pendente',
  descricao_override TEXT,
  link_override TEXT,
  ordem_override INTEGER,
  parent_id UUID REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create checklist_instance_assignees (assignees per instance)
CREATE TABLE public.checklist_instance_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

-- Indexes
CREATE INDEX idx_checklist_instances_period ON public.checklist_instances(ano, mes, semana);
CREATE INDEX idx_checklist_instances_template ON public.checklist_instances(template_id);
CREATE INDEX idx_checklist_instances_parent ON public.checklist_instances(parent_id);
CREATE INDEX idx_checklist_templates_ordem ON public.checklist_templates(ordem_global);
CREATE INDEX idx_checklist_instance_assignees_instance ON public.checklist_instance_assignees(instance_id);
CREATE INDEX idx_checklist_template_assignees_template ON public.checklist_template_assignees(template_id);

-- RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instance_assignees ENABLE ROW LEVEL SECURITY;

-- Policies for checklist_templates
CREATE POLICY "Leitura pública de checklist_templates" ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY "Inserção pública de checklist_templates" ON public.checklist_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública de checklist_templates" ON public.checklist_templates FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública de checklist_templates" ON public.checklist_templates FOR DELETE USING (true);

-- Policies for checklist_template_assignees
CREATE POLICY "Leitura pública de checklist_template_assignees" ON public.checklist_template_assignees FOR SELECT USING (true);
CREATE POLICY "Inserção pública de checklist_template_assignees" ON public.checklist_template_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública de checklist_template_assignees" ON public.checklist_template_assignees FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública de checklist_template_assignees" ON public.checklist_template_assignees FOR DELETE USING (true);

-- Policies for checklist_instances
CREATE POLICY "Leitura pública de checklist_instances" ON public.checklist_instances FOR SELECT USING (true);
CREATE POLICY "Inserção pública de checklist_instances" ON public.checklist_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública de checklist_instances" ON public.checklist_instances FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública de checklist_instances" ON public.checklist_instances FOR DELETE USING (true);

-- Policies for checklist_instance_assignees
CREATE POLICY "Leitura pública de checklist_instance_assignees" ON public.checklist_instance_assignees FOR SELECT USING (true);
CREATE POLICY "Inserção pública de checklist_instance_assignees" ON public.checklist_instance_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública de checklist_instance_assignees" ON public.checklist_instance_assignees FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública de checklist_instance_assignees" ON public.checklist_instance_assignees FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_instances_updated_at
  BEFORE UPDATE ON public.checklist_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DATA MIGRATION: Convert existing checklist_items to templates + instances
-- ============================================================
DO $$
DECLARE
  template_rec RECORD;
  item_rec RECORD;
  new_template_id UUID;
  new_instance_id UUID;
  ordem_counter INTEGER := 0;
BEGIN
  -- Step 1: Create templates from unique descriptions
  FOR template_rec IN 
    SELECT texto, 
           (array_agg(link ORDER BY created_at ASC))[1] as first_link
    FROM public.checklist_items
    GROUP BY texto
    ORDER BY MIN(ordem), MIN(created_at)
  LOOP
    INSERT INTO public.checklist_templates (descricao, link_default, ordem_global)
    VALUES (template_rec.texto, template_rec.first_link, ordem_counter)
    RETURNING id INTO new_template_id;
    
    ordem_counter := ordem_counter + 1;

    -- Create default assignees from the most common assignment for this text
    INSERT INTO public.checklist_template_assignees (template_id, user_id)
    SELECT DISTINCT new_template_id, cia.user_id
    FROM public.checklist_items ci
    JOIN public.checklist_item_assignees cia ON cia.checklist_item_id = ci.id
    WHERE ci.texto = template_rec.texto;
  END LOOP;

  -- Step 2: Create instances from each existing item
  FOR item_rec IN 
    SELECT ci.id as old_id, ci.ano, ci.mes, ci.semana, ci.status, ci.link, ci.texto,
           t.id as template_id, t.link_default
    FROM public.checklist_items ci
    JOIN public.checklist_templates t ON t.descricao = ci.texto
    ORDER BY ci.ano, ci.mes, ci.semana, ci.ordem
  LOOP
    INSERT INTO public.checklist_instances (
      template_id, ano, mes, semana, status, tipo_item,
      link_override
    ) VALUES (
      item_rec.template_id,
      item_rec.ano,
      item_rec.mes,
      item_rec.semana,
      item_rec.status,
      'recorrente',
      CASE WHEN item_rec.link IS DISTINCT FROM item_rec.link_default THEN item_rec.link ELSE NULL END
    ) RETURNING id INTO new_instance_id;

    -- Copy assignees to instance
    INSERT INTO public.checklist_instance_assignees (instance_id, user_id)
    SELECT new_instance_id, cia.user_id
    FROM public.checklist_item_assignees cia
    WHERE cia.checklist_item_id = item_rec.old_id;
  END LOOP;
END $$;
