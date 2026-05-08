export default async function handler(req, res) {
  // Configuração do Supabase (tenta ler do ambiente, com fallback para as chaves públicas usadas no front-end)
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://mpxqdabkmhlzdwweuikk.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_Qp8JrbQYrylukDb6UuFRIQ_IyKorZNV";

  try {
    // Realiza uma consulta mínima (select de apenas 1 ID, com limite de 1 registro)
    // Isso é extremamente leve, gasta praticamente zero recursos, mas é suficiente
    // para registrar atividade na API do Supabase e evitar que o projeto seja pausado.
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=id&limit=1`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase respondeu com status ${response.status}`);
    }

    // Retorna status 200 OK conforme solicitado
    return res.status(200).json({ 
      status: "ok", 
      message: "Keep-alive ping realizado com sucesso",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro no keep-alive:", error);
    // Mesmo em erro, retornamos 500 para sabermos se falhou nos logs da Vercel
    return res.status(500).json({ 
      status: "error", 
      message: "Falha ao pingar o Supabase",
      error: error.message 
    });
  }
}
