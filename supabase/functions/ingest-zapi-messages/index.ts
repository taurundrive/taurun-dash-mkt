// supabase/functions/ingest-zapi-messages/index.ts
// ─── Webhook Receiver da Z-API ───
//
// Recebe eventos de mensagens (enviadas e recebidas) do WhatsApp
// via Z-API webhook e persiste no Supabase para o taurun-lead-audit.
//
// Identificação do vendedor: via query param ?vendor=Roberto ou ?vendor=Fernando
// URL pra Z-API Roberto: .../ingest-zapi-messages?vendor=Roberto
// URL pra Z-API Fernando: .../ingest-zapi-messages?vendor=Fernando

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Extrai o texto legível de qualquer tipo de payload de mensagem da Z-API */
function extractMessageText(body: Record<string, unknown>): string | null {
  // Texto simples
  if (body.text && typeof body.text === "object") {
    const t = body.text as Record<string, unknown>;
    if (typeof t.message === "string" && t.message) return t.message;
  }
  // Legenda de imagem/vídeo
  if (typeof body.caption === "string" && body.caption) return body.caption;
  // Botões/listas
  if (body.buttonsMessage && typeof body.buttonsMessage === "object") {
    const b = body.buttonsMessage as Record<string, unknown>;
    if (typeof b.text === "string") return b.text;
  }
  return null;
}

/** Extrai URL de mídia do payload */
function extractMediaUrl(body: Record<string, unknown>): string | null {
  for (const key of ["image", "video", "audio", "document", "sticker"]) {
    const m = body[key] as Record<string, unknown> | undefined;
    if (m) {
      const url = m.imageUrl || m.videoUrl || m.audioUrl || m.documentUrl || m.stickerUrl;
      if (typeof url === "string") return url;
    }
  }
  return null;
}

/** Detecta o tipo da mensagem */
function detectMessageType(body: Record<string, unknown>): string {
  if (body.image) return "image";
  if (body.video) return "video";
  if (body.audio) return "audio";
  if (body.document) return "document";
  if (body.sticker) return "sticker";
  if (body.location) return "location";
  if (body.contacts) return "contact";
  if (body.buttonsMessage) return "button";
  if (body.listMessage) return "list";
  if (body.text) return "text";
  return "unknown";
}

/** Formata o número de telefone removendo sufixos do WhatsApp */
function formatPhone(phone: unknown): string {
  if (typeof phone !== "string") return String(phone || "");
  return phone.replace(/@(c\.us|s\.whatsapp\.net|g\.us)$/, "").replace(/-group$/, "");
}

Deno.serve(async (req: Request) => {
  // Responde o preflight do CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Identifica o vendedor via query param (?vendor=Roberto ou ?vendor=Fernando)
    const url = new URL(req.url);
    const vendor = url.searchParams.get("vendor") || "Unknown";

    // Valida vendedor
    if (!["Roberto", "Fernando"].includes(vendor)) {
      return new Response(
        JSON.stringify({ error: `Vendor inválido: ${vendor}. Use ?vendor=Roberto ou ?vendor=Fernando` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parseia o payload (desempacota body.body se vier dentro do wrapper $json do n8n)
    const rawBody = await req.json() as Record<string, unknown>;
    const body = (rawBody.body && typeof rawBody.body === "object" ? rawBody.body : rawBody) as Record<string, unknown>;

    // Ignora mensagens sem ID (pings de status ou heartbeats)
    const messageId = body.messageId as string | undefined;
    if (!messageId) {
      return new Response(JSON.stringify({ ignored: true, reason: "no messageId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignora mensagens de grupos
    const phone = formatPhone(body.phone as string);
    if (!phone || phone.includes("group") || phone.includes("-g.us")) {
      return new Response(JSON.stringify({ ignored: true, reason: "group message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta registro para inserção no banco
    const sentAt = body.momment
      ? new Date(Number(body.momment)).toISOString()
      : new Date().toISOString();

    const record = {
      id: messageId,
      vendor,
      phone,
      chat_name: (body.chatName as string) || (body.senderName as string) || null,
      from_me: body.fromMe !== undefined ? Boolean(body.fromMe) : Boolean(body.fromApi || body.status),
      message_type: detectMessageType(body),
      message_text: extractMessageText(body),
      media_url: extractMediaUrl(body),
      file_name: (() => {
        const doc = body.document as Record<string, unknown> | undefined;
        return doc?.fileName as string | null ?? null;
      })(),
      sent_at: sentAt,
      raw_payload: body,
    };

    // Conecta ao Supabase com service_role para bypassar RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upsert para evitar duplicatas caso o webhook dispare mais de uma vez
    const { error } = await supabase
      .from("whatsapp_messages")
      .upsert(record, { onConflict: "id" });

    if (error) {
      console.error("[ingest-zapi-messages] Erro ao salvar:", error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ingest-zapi-messages] ✓ ${vendor} | ${phone} | ${record.message_type} | fromMe: ${record.from_me}`);

    return new Response(
      JSON.stringify({ ok: true, vendor, phone, messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[ingest-zapi-messages] Erro geral:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
