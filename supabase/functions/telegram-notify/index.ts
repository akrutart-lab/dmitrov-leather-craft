import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const ADMIN_CHAT_ID = "1217840640";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY not configured");

    const { order_id, customer_name, customer_phone, total, delivery_method, delivery_address, comment, items } = await req.json();

    let text = `🛒 <b>Новая заявка!</b>\n\n`;
    text += `👤 <b>${escapeHtml(customer_name)}</b>\n`;
    text += `📞 ${escapeHtml(customer_phone)}\n`;
    text += `📦 ${delivery_method === "delivery" ? "Доставка" : "Самовывоз"}`;
    if (delivery_address) text += `: ${escapeHtml(delivery_address)}`;
    text += `\n\n`;

    if (items && items.length > 0) {
      text += `<b>Товары:</b>\n`;
      for (const item of items) {
        text += `• ${escapeHtml(item.product_name)} × ${item.quantity} — ${item.price * item.quantity} ₽`;
        if (item.customization) text += `\n  <i>⚙️ ${escapeHtml(item.customization)}</i>`;
        text += `\n`;
      }
      text += `\n`;
    }

    text += `💰 <b>Итого: ${total} ₽</b>`;
    if (comment) text += `\n\n💬 ${escapeHtml(comment)}`;
    text += `\n\n🆔 <code>${order_id}</code>`;

    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Telegram error:", response.status, JSON.stringify(data));
      throw new Error(`Telegram API failed [${response.status}]`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-notify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
