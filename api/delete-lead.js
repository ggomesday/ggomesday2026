export default async function handler(req, res) {
  // Habilitar CORS para requisições do próprio domínio / painel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let id = req.query?.id;
  if (!id && req.body) {
    try {
      const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      id = parsedBody?.id;
    } catch {
      id = req.body?.id;
    }
  }

  if (!id) {
    return res.status(400).json({ error: 'ID do lead é obrigatório' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://mpxqdabkmhlzdwweuikk.supabase.co";
  // Se configurada na Vercel a SUPABASE_SERVICE_ROLE_KEY, ela possui privilégio total de admin (bypassa RLS)
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_Qp8JrbQYrylukDb6UuFRIQ_IyKorZNV";

  try {
    // 1. Tentar deletar diretamente na API REST com retorno das linhas afetadas
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || `Supabase retornou status ${response.status}`);
    }

    if (Array.isArray(data) && data.length > 0) {
      return res.status(200).json({ success: true, deleted: data });
    }

    // 2. Se retornou vazio (RLS bloqueou), tentar via função RPC delete_lead caso exista
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_lead`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_id: id })
    });

    if (rpcResponse.ok) {
      return res.status(200).json({ success: true, via: 'rpc' });
    }

    // 3. Se nenhuma linha foi excluída, informar que o RLS bloqueou a deleção
    return res.status(403).json({
      success: false,
      error: 'rls_blocked',
      message: 'A exclusão foi bloqueada pelas políticas de segurança (RLS) da tabela leads no Supabase.'
    });

  } catch (err) {
    console.error('Erro na API de exclusão de lead:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

