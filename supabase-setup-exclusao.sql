-- ═══════════════════════════════════════════════════════════════
-- G.GOMES DAY 2026 — ATIVAR EXCLUSÃO DE LEADS NO SUPABASE
-- ═══════════════════════════════════════════════════════════════
-- Instruções:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione o projeto "mpxqdabkmhlzdwweuikk"
-- 3. No menu lateral, clique em "SQL Editor"
-- 4. Cole este script e clique em "Run" (Executar)
-- ═══════════════════════════════════════════════════════════════

-- 1. Habilita a política de exclusão (DELETE) na tabela leads para administradores/anônimos:
DROP POLICY IF EXISTS "Permitir exclusao de leads" ON public.leads;
DROP POLICY IF EXISTS "Allow delete on leads" ON public.leads;

CREATE POLICY "Permitir exclusao de leads"
ON public.leads
FOR DELETE
TO anon, authenticated
USING (true);

-- 2. Cria também a Stored Procedure delete_lead com permissões elevadas (SECURITY DEFINER)
-- garantindo que a exclusão funcione sempre mesmo com qualquer política adicional de RLS:
CREATE OR REPLACE FUNCTION public.delete_lead(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.leads WHERE id = p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN (v_count > 0);
END;
$$;

-- 3. Concede permissão de execução para a função:
GRANT EXECUTE ON FUNCTION public.delete_lead(uuid) TO anon, authenticated;

-- 4. Notifica conclusão:
COMMENT ON FUNCTION public.delete_lead IS 'Exclui um lead pelo ID diretamente para o painel administrativo';

