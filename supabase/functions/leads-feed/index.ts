import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = req.headers.get('x-api-key') ?? new URL(req.url).searchParams.get('token')
  const expected = Deno.env.get('LEADS_FEED_TOKEN')
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('whatsapp_leads')
    .select('nome, telefone, vendedor, data_lead')
    .order('data_lead', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Group by YYYY-MM then by vendedor
  const grouped: Record<string, { Fernando: any[]; Roberto: any[]; Outros: any[] }> = {}
  for (const row of data ?? []) {
    if (!row.telefone) continue
    const d = new Date(row.data_lead as string)
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!grouped[month]) grouped[month] = { Fernando: [], Roberto: [], Outros: [] }
    const bucket =
      row.vendedor === 'Fernando' ? 'Fernando' : row.vendedor === 'Roberto' ? 'Roberto' : 'Outros'
    grouped[month][bucket].push({
      nome: row.nome,
      telefone: row.telefone,
      data_lead: row.data_lead,
    })
  }

  const months = Object.keys(grouped)
    .sort()
    .map((m) => ({
      month: m,
      fernando: grouped[m].Fernando,
      roberto: grouped[m].Roberto,
      outros: grouped[m].Outros,
      totals: {
        fernando: grouped[m].Fernando.length,
        roberto: grouped[m].Roberto.length,
        outros: grouped[m].Outros.length,
      },
    }))

  return new Response(
    JSON.stringify({ total: data?.length ?? 0, months }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})