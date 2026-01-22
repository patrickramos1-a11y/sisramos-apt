-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'colaborador');

-- Criar enum para status das bolinhas
CREATE TYPE public.status_bolinha AS ENUM ('pendente', 'executado', 'nao_realizado');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'colaborador',
  UNIQUE (user_id, role)
);

-- Tabela de setores
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT DEFAULT '#E5E7EB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de demandas (APT)
CREATE TABLE public.demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  status_responsavel status_bolinha DEFAULT 'pendente' NOT NULL,
  status_gestor status_bolinha DEFAULT 'pendente' NOT NULL,
  semanas_repeticao INTEGER DEFAULT 1 NOT NULL CHECK (semanas_repeticao >= 1 AND semanas_repeticao <= 52),
  semana_limite INTEGER DEFAULT 1 NOT NULL CHECK (semana_limite >= 1 AND semana_limite <= 5),
  data_limite DATE,
  prioritaria BOOLEAN DEFAULT false NOT NULL,
  ativa BOOLEAN DEFAULT true NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role específica (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário é gestor ou admin
CREATE OR REPLACE FUNCTION public.is_gestor_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('gestor', 'admin')
  )
$$;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir próprio perfil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para user_roles
CREATE POLICY "Usuários podem ver própria role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Apenas admin pode gerenciar roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas para setores
CREATE POLICY "Todos podem ver setores"
  ON public.setores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestores e admin podem gerenciar setores"
  ON public.setores FOR ALL
  TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Políticas para demandas
CREATE POLICY "Colaboradores veem próprias demandas, gestores veem todas"
  ON public.demandas FOR SELECT
  TO authenticated
  USING (
    auth.uid() = responsavel_id 
    OR public.is_gestor_or_admin(auth.uid())
  );

CREATE POLICY "Gestores podem criar demandas"
  ON public.demandas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Colaboradores podem atualizar status_responsavel de suas demandas"
  ON public.demandas FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = responsavel_id 
    OR public.is_gestor_or_admin(auth.uid())
  );

CREATE POLICY "Gestores podem deletar demandas"
  ON public.demandas FOR DELETE
  TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'colaborador');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Inserir setores padrão
INSERT INTO public.setores (nome, cor) VALUES
  ('Administrativo', '#FEF3C7'),
  ('Comercial', '#DBEAFE'),
  ('Financeiro', '#D1FAE5'),
  ('Operacional', '#FEE2E2'),
  ('RH', '#E9D5FF'),
  ('TI', '#CFFAFE');