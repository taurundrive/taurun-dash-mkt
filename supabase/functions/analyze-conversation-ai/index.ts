// supabase/functions/analyze-conversation-ai/index.ts
// ─── Auditor de Qualidade com IA (Google Gemini) ───
// Analisa conversas no Supabase (whatsapp_messages) usando o modelo Gemini 2.5 Flash,
// gera um diagnóstico completo e salva na tabela whatsapp_ai_audits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_SYSTEM_PROMPT = `🔴 REGRA INEGOCIÁVEL DE IDIOMA:
O RELATÓRIO COMPLETO, INCLUINDO TODOS OS TÍTULOS, SUBTÍTULOS, EXPLICAÇÕES, RESUMOS, DIAGNÓSTICOS, ERROS, SUGESTÕES E FOLLOW-UP, DEVE SER ESCRITO EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). É TERMINANTEMENTE PROIBIDO GERAR QUALQUER PALAVRA, FRASE OU PARÁGRAFO EM INGLÊS. SE VOCÊ TRADUZIR OU COMENTAR ALGO, ESCREVA EM PORTUGUÊS.

Você é um Auditor de Qualidade de Atendimento e Vendas altamente criterioso. Sua missão é analisar o histórico de uma conversa de WhatsApp entre um vendedor e um cliente para identificar falhas de comunicação, perda de oportunidades e avaliar a experiência do cliente.

Siga RIGOROSAMENTE estas diretrizes adicionais para a sua análise:
1. Horário Comercial & Tolerância de Resposta: Considere o expediente comercial oficial da empresa como sendo de segunda a sexta-feira, das 09h00 às 17h00. Respostas ou mensagens trocadas pelos vendedores fora desse horário, ou em fins de semana, não devem ser contadas como atraso ou abandono. Se um cliente enviar mensagem à noite ou no final de semana, o vendedor tem até as 14h00 da tarde do próximo dia útil para responder sem ser penalizado por tempo de resposta lento, garantindo tempo hábil para zerar o volume de mensagens acumuladas.
2. Régua de Follow-up Padrão (3, 5 e 7 dias): O vendedor deve respeitar a cadência padrão de acompanhamento caso o cliente pare de responder após o envio de proposta ou cotação:
   - 1º Follow-up: deve ocorrer por volta de 3 dias (72h) de silêncio do cliente.
   - 2º Follow-up: deve ocorrer por volta de 5 dias (120h) caso o cliente continue em silêncio.
   - 3º Follow-up (Última Tentativa): por volta de 7 dias (168h) para reativação ou encerramento do lead.
   Avalie se o vendedor seguiu essa cadência. Se o lead estiver sem resposta há mais de 3 dias sem nenhuma cobrança do vendedor, aponte como falha de proatividade comercial. Se o vendedor cumpriu as etapas no tempo certo, elogie a condução.
3. Estimativa de LTV & Valor do Lead: A IA deve inferir o LTV (Lifetime Value) potencial do cliente com base no histórico da conversa (produtos perguntados, interesse em serviços premium, orçamento mencionado, tamanho da empresa, etc.). Se o lead demonstrar alto valor/LTV, aplique um critério de auditoria ainda mais rigoroso na condução e na proatividade do vendedor.
4. Identificação de Origem e Tráfego Pago: Preste muita atenção nas primeiras mensagens ou na mensagem inicial do cliente. Se o cliente disser ou trouxer mensagens pré-configuradas de anúncios ou links, tais como:
   - "Olá, vim pelo anúncio do Instagram"
   - "Quero renovar meu espaço com a lona Hexafibra Taurun"
   - "Vim pelo anúncio e gostaria de saber o valor"
   - "Olá, vim pelo Instagram e gostaria de mais informações"
   Ou qualquer outra variação mencionando "anúncio", "Instagram", "Meta Ads" ou "Hexafibra Taurun", o cliente DEVE ser classificado como **Tráfego Pago**. Caso contrário, classifique como **Orgânico / Indeterminado**.

Analise a conversa com base nos seguintes critérios:
1. Vácuo / Abandono: O vendedor deixou o cliente falando sozinho? Demorou muito para responder dentro do horário comercial (considerando a tolerância até as 14h00 do dia seguinte para mensagens noturnas) sem dar justificativa? Sumiu no meio do atendimento?
2. Respostas Secas / Falta de Empatia: O vendedor foi frio, monossilábico ou usou um tom que pareceu desinteressado/grosso?
3. Dúvidas não Sanadas: O cliente fez perguntas que foram ignoradas ou respondidas de forma incompleta/superficial?
4. Proatividade e Condução: O vendedor tentou reter o cliente, cumpriu a régua de follow-up (3, 5 e 7 dias), fez perguntas abertas para entender a necessidade dele ou simplesmente respondeu de forma passiva como "tirador de pedido"?

---

Com base nesses critérios, estruture seu relatório de auditoria EXATAMENTE com o seguinte formato Markdown, EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (mantenha os títulos exatos):

### 📝 RESUMO GERAL DA CONVERSA
[Escreva um resumo executivo e detalhado de 3 a 6 frases, EXCLUSIVAMENTE EM PORTUGUÊS, explicando com toda a clareza: quem é o cliente, o que ele buscou (produtos, lona, serviços, dúvidas específicas), o que o vendedor respondeu ou cotou (propostas, valores, prazos de entrega), e em que ponto exato ou status a negociação parou ou se encerrou no momento.]

### 🎯 ORIGEM DO LEAD & TRÁFEGO
* **Classificação de Tráfego:** [Tráfego Pago / Orgânico / Indeterminado]
* **Mensagem/Frase Identificada:** [Cite a frase exata do anúncio caso encontrada, ou escreva: "Nenhuma mensagem de anúncio detectada."]

### 🔍 DIAGNÓSTICO DO ATENDIMENTO

* **Status Geral:** [Escolha APENAS UM: Crítico / Regular / Excelente]
* **LTV / Potencial Estimado:** [Alto LTV / Médio LTV / Baixo LTV - breve justificativa em 1 frase baseada nos produtos/serviços e termos discutidos]
* **Tempo de Resposta & Abandono:** [Análise concisa considerando o horário comercial de Seg-Sex 9h-17h]
* **Qualidade da Comunicação:** [Análise do tom de voz do vendedor]
* **Resolução de Dúvidas:** [O vendedor ajudou ou deixou pontas soltas?]

### ❌ ERROS ENCONTRADOS
* [Se não houver erros, escreva: "Nenhum erro grave ou desvio identificado."]
* [Caso haja erros, cite trechos curtos ou descreva a falha com precisão em português]

### 💡 SUGESTÕES DE MELHORIA
* [O que o vendedor deveria ter feito de diferente para melhorar a conversão e o relacionamento?]

### ⭐ NOTA FINAL: X.X / 10
(Apenas o número final da nota entre 0.0 e 10.0, seguido de / 10)

---

Além do relatório acima, adicione SEMPRE a seguinte seção ao final exato da sua resposta para alimentar a automação do dashboard:
### 📌 STATUS DE FOLLOW-UP
* **Exige Follow-up?** [SIM / NAO]
* **Motivo Follow-up:** [Frase concisa em português explicando se o vendedor enviou orçamento/proposta/pergunta que ficou sem resposta, ou se o atendimento foi encerrado normalmente]`;

async function callGemini(transcript: string, apiKey: string): Promise<{ text: string; score: number; status: string; needsFollowup: boolean; followupReason: string; summary: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${GEMINI_SYSTEM_PROMPT}\n\n=== HISTÓRICO DA CONVERSA (CRONOLÓGICO) ===\n${transcript}\n\n=== FIM DO HISTÓRICO ===\nGere a auditoria completa no formato exigido acima, 100% EM PORTUGUÊS DO BRASIL:` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API do Gemini (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar relatório com Gemini.";

  // Extrai resumo geral da conversa (suporta os 2 formatos)
  const summaryMatch = reportText.match(/### 📝 RESUMO (?:GERAL DA )?CONVERSA\s*\n+([\s\S]*?)(?=\n### |$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : "Resumo detalhado no corpo do relatório.";

  // Extrai nota
  const scoreMatch = reportText.match(/NOTA FINAL:\s*([0-9]+(?:[\.,][0-9]+)?)\s*\/\s*10/i) || reportText.match(/([0-9]+(?:[\.,][0-9]+)?)\s*\/\s*10/);
  const score = scoreMatch ? parseFloat(scoreMatch[1].replace(',', '.')) : 5.0;

  // Extrai status geral
  let status = "Regular";
  if (/Status Geral:\s*\**Crítico\**/i.test(reportText) || score < 5.0) status = "Crítico";
  else if (/Status Geral:\s*\**Excelente\**/i.test(reportText) || score >= 8.5) status = "Excelente";

  // Extrai status de follow-up
  const followupMatch = reportText.match(/Exige Follow-up\?\s*\**\[?(SIM|NAO|NÃO)\]?\**/i);
  const needsFollowup = followupMatch ? followupMatch[1].toUpperCase() === 'SIM' : false;

  const reasonMatch = reportText.match(/Motivo Follow-up:\s*\**\[?([^\]\n]+)\]?\**/i);
  const followupReason = reasonMatch ? reasonMatch[1].trim() : (needsFollowup ? "A última mensagem enviada pelo vendedor exige retorno do cliente." : "Conversa concluída, sem pendências.");

  // Extrai classificação de Tráfego Pago / Origem do Lead
  const paidTrafficMatch = reportText.match(/Classificação de Tráfego:\s*\**\[?(Tráfego Pago|Orgânico|Indeterminado)\]?\**/i) || reportText.match(/Tráfego Pago/i);
  const isPaidTraffic = Boolean(paidTrafficMatch && /Tráfego Pago/i.test(paidTrafficMatch[0] || paidTrafficMatch[1] || ''));

  const phraseMatch = reportText.match(/Mensagem\/Frase Identificada:\s*\**\[?([^\]\n]+)\]?\**/i);
  const paidTrafficPhrase = phraseMatch && !/Nenhuma mensagem de anúncio/i.test(phraseMatch[1]) ? phraseMatch[1].trim() : (isPaidTraffic ? "Anúncio Instagram / Taurun" : "Nenhuma");

  return { text: reportText, score, status, needsFollowup, followupReason, summary, isPaidTraffic, paidTrafficPhrase };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || new URL(req.url).searchParams.get("gemini_key") || "";

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada na Edge Function ou nos parâmetros" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const isBatch = Boolean(body.batch) || new URL(req.url).searchParams.get("batch") === "true";

    // ─── MODO 1: BATCH / ROTINA NOTURNA COM FILTRO 24H DE INATIVIDADE ───
    if (isBatch) {
      // Pega conversas que tiveram movimento nos últimos 3 dias
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: recentMessages, error: msgErr } = await supabase
        .from("whatsapp_messages")
        .select("phone, vendor, sent_at")
        .gte("sent_at", threeDaysAgo.toISOString());

      if (msgErr) throw msgErr;

      // Agrupa para encontrar a última data de mensagem de cada par (phone, vendor)
      const latestMessagePerPair = new Map<string, { phone: string; vendor: string; lastSentAt: Date }>();
      for (const m of (recentMessages || [])) {
        const key = `${m.phone}_${m.vendor}`;
        const sentAtDate = new Date(m.sent_at);
        const existing = latestMessagePerPair.get(key);
        if (!existing || sentAtDate > existing.lastSentAt) {
          latestMessagePerPair.set(key, { phone: m.phone, vendor: m.vendor, lastSentAt: sentAtDate });
        }
      }

      const now = new Date();
      const results = [];
      for (const { phone, vendor, lastSentAt } of latestMessagePerPair.values()) {
        const msSinceLastMessage = now.getTime() - lastSentAt.getTime();
        const hoursSinceLastMessage = msSinceLastMessage / (1000 * 60 * 60);

        // Apenas executa a auditoria se a conversa estiver sem interações por mais de 24 horas
        if (hoursSinceLastMessage >= 24) {
          try {
            const res = await auditSingle(supabase, phone, vendor, geminiApiKey);
            results.push({ phone, vendor, score: res.score, status: res.status, hoursSilent: Math.round(hoursSinceLastMessage) });
          } catch (e) {
            console.error(`Erro ao auditar lote ${phone} (${vendor}):`, e);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, batchCount: results.length, results }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // ─── MODO 2: AUDITORIA INDIVIDUAL SOB DEMANDA (UMA CONVERSA) ───
    const phone = body.phone as string;
    const vendor = body.vendor as string;

    if (!phone || !vendor) {
      return new Response(JSON.stringify({ error: "phone e vendor são obrigatórios para auditoria individual" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const res = await auditSingle(supabase, phone, vendor, geminiApiKey);
    return new Response(JSON.stringify({ ok: true, ...res }), { status: 200, headers: corsHeaders });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});

async function transcribeAudio(url: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    
    // Converte ArrayBuffer para Base64 em Deno
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'audio/ogg', data: base64 } },
              { text: 'Transcreva este áudio de WhatsApp para português do Brasil. Escreva apenas o texto falado, sem introduções, aspas ou explicações. Se não houver fala ou for incompreensível, retorne "[Áudio sem fala ou incompreensível]".' }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Gemini: ${response.status}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  } catch (err: any) {
    console.error('Falha na transcrição do áudio:', err.message);
    return `[Falha ao transcrever áudio: ${err.message}]`;
  }
}

async function auditSingle(supabase: any, phone: string, vendor: string, geminiApiKey: string) {
  // 1. Busca histórico de mensagens mesclando phone e chatLid (Multi-Device Z-API)
  const phonesSet = new Set<string>([
    phone,
    phone.replace(/@.*$/, ''),
    phone + '@c.us'
  ]);

  try {
    const { data: rawMsgs } = await supabase
      .from('whatsapp_messages')
      .select('phone, raw_payload')
      .eq('phone', phone)
      .limit(5);
    
    if (rawMsgs) {
      for (const m of rawMsgs) {
        const cLid = m.raw_payload?.chatLid;
        if (cLid) {
          phonesSet.add(cLid);
          phonesSet.add(cLid.replace(/@.*$/, ''));
        }
      }
    }
  } catch (e) {
    console.error('Erro ao buscar chatLid via raw_payload:', e);
  }

  if (phone.includes('@lid')) {
    try {
      const { data: lidMsgs } = await supabase
        .from('whatsapp_messages')
        .select('phone')
        .eq('raw_payload->>chatLid', phone)
        .limit(5);

      if (lidMsgs) {
        for (const m of lidMsgs) {
          if (m.phone) {
            phonesSet.add(m.phone);
            phonesSet.add(m.phone.replace(/@.*$/, ''));
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar phone normal via chatLid:', e);
    }
  }

  const phonesToMatch = Array.from(phonesSet).filter(Boolean);

  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("from_me, message_text, message_type, media_url, file_name, sent_at")
    .in("phone", phonesToMatch)
    .eq("vendor", vendor)
    .order("sent_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  if (!messages || messages.length === 0) {
    throw new Error("Nenhuma mensagem encontrada para auditar nesta conversa.");
  }

  // 2. Formata transcript de forma assíncrona (com transcrição de áudio e informações de arquivos)
  const transcriptLines = await Promise.all(messages.map(async (m: any) => {
    const time = new Date(m.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = new Date(m.sent_at).toLocaleDateString("pt-BR");
    const sender = m.from_me ? `Vendedor (${vendor})` : `Cliente (${phone})`;
    
    let text = m.message_text || '';
    if (m.message_type === 'audio' && m.media_url) {
      const transcription = await transcribeAudio(m.media_url, geminiApiKey);
      text = `[Áudio Transcrito: "${transcription}"]`;
    } else if (!text && m.message_type === 'document' && m.file_name) {
      text = `[Documento/PDF enviado: "${m.file_name}"]`;
    } else if (!text) {
      text = `[Anexo/Mídia: ${m.message_type}]`;
    }
    
    return `[${date} ${time}] ${sender}: ${text}`;
  }));

  const transcript = transcriptLines.join("\n");

  // 3. Chama o Gemini
  const aiResult = await callGemini(transcript, geminiApiKey);

  // 4. Salva no banco
  const todayStr = new Date().toISOString().split("T")[0];
  const auditId = `${phone}_${vendor}_${todayStr}`;

  const baseRecord = {
    id: auditId,
    phone,
    vendor,
    score: aiResult.score,
    status_general: aiResult.status,
    report_markdown: aiResult.text,
    audited_at: new Date().toISOString(),
    needs_followup: aiResult.needsFollowup,
    followup_reason: aiResult.followupReason,
    summary: aiResult.summary,
  };

  const fullRecord = {
    ...baseRecord,
    is_paid_traffic: aiResult.isPaidTraffic,
    paid_traffic_phrase: aiResult.paidTrafficPhrase,
  };

  const { error: upsertErr } = await supabase.from("whatsapp_ai_audits").upsert(fullRecord, { onConflict: "id" });
  if (upsertErr) {
    if (String(upsertErr.message || '').includes("column") || upsertErr.code === "42703") {
      // Fallback: se as colunas is_paid_traffic/paid_traffic_phrase ainda não foram criadas via SQL no Supabase,
      // salva o registro normal (os dados já estão no report_markdown)
      const { error: fallbackErr } = await supabase.from("whatsapp_ai_audits").upsert(baseRecord, { onConflict: "id" });
      if (fallbackErr) throw fallbackErr;
    } else {
      throw upsertErr;
    }
  }

  return fullRecord;
}
