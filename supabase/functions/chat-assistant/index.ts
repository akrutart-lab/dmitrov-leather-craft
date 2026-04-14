import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, message } = await req.json();
    if (!session_id || !message) {
      return new Response(JSON.stringify({ error: "session_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Save user message
    await sb.from("chat_messages").insert({ session_id, role: "user", content: message });

    // Load products + categories for context
    const [{ data: products }, { data: categories }, { data: history }] = await Promise.all([
      sb.from("products").select("name, description, price, in_stock, slug, category_id").eq("in_stock", true),
      sb.from("categories").select("id, name, description"),
      sb.from("chat_messages").select("role, content").eq("session_id", session_id).order("created_at", { ascending: true }),
    ]);

    // Build product catalog context
    const categoryMap: Record<string, string> = {};
    (categories || []).forEach((c: any) => { categoryMap[c.id] = c.name; });

    const catalog = (products || []).map((p: any) => {
      const cat = p.category_id ? categoryMap[p.category_id] || "" : "";
      return `- ${p.name} (${p.price} ₽)${cat ? `, категория: ${cat}` : ""}${p.description ? ` — ${p.description}` : ""}`;
    }).join("\n");

    const systemPrompt = `Ты — ИИ-консультант мастерской К.АЯ из г. Дмитров, Московская область. Мастерская изготавливает изделия из натуральной кожи ручной работы: ремни, сумки, кошельки, обложки, аксессуары.

Твои задачи:
1. Помочь покупателю выбрать изделие из каталога
2. Подобрать размер (для ремней — по обхвату талии + 10-15 см)
3. Обсудить кастомизацию: цвет кожи, тип фурнитуры (латунь, никель, антик), гравировка
4. Рассчитать стоимость с учётом кастомизации (базовая цена + доплата за кастом)
5. Когда покупатель готов — сообщи что заявка будет оформлена и попроси подтвердить

Если не можешь помочь или покупатель просит связаться с мастером — скажи что переключаешь на оператора.

Каталог товаров:
${catalog || "Каталог пуст"}

Отвечай кратко, дружелюбно, на русском языке. Используй markdown для форматирования.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role === "system" ? "assistant" : m.role, content: m.content })),
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Сервис временно недоступен" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    // We need to collect full response to save to DB, while also streaming to client
    // Use TransformStream to tee the response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE to collect content
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6).trim() !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* partial */ }
            }
          }
          
          await writer.write(value);
        }
      } finally {
        await writer.close();
        // Save assistant message
        if (fullContent) {
          await sb.from("chat_messages").insert({ session_id, role: "assistant", content: fullContent });
        }
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
