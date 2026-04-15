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

    await sb.from("chat_messages").insert({ session_id, role: "user", content: message });

    const [{ data: products }, { data: categories }, { data: history }, { data: session }] = await Promise.all([
      sb.from("products").select("id, name, description, price, in_stock, slug, category_id, image_url").eq("in_stock", true),
      sb.from("categories").select("id, name, description"),
      sb.from("chat_messages").select("role, content").eq("session_id", session_id).order("created_at", { ascending: true }),
      sb.from("chat_sessions").select("customer_name, customer_phone").eq("id", session_id).single(),
    ]);

    const categoryMap: Record<string, string> = {};
    (categories || []).forEach((c: any) => { categoryMap[c.id] = c.name; });

    const catalog = (products || []).map((p: any) => {
      const cat = p.category_id ? categoryMap[p.category_id] || "" : "";
      const img = p.image_url || "";
      return `[PRODUCT:${p.id}|${p.name}|${p.price}|${img}|${p.slug}]${cat ? ` категория: ${cat}` : ""}${p.description ? ` — ${p.description}` : ""}`;
    }).join("\n");

    const systemPrompt = `Ты — ИИ-консультант мастерской К.АЯ из г. Дмитров, Московская область. Мастерская изготавливает изделия из натуральной кожи ручной работы: ремни, сумки, кошельки, обложки, аксессуары.

Твои задачи:
1. Помочь покупателю выбрать изделие из каталога
2. Подобрать размер (для ремней — по обхвату талии + 10-15 см)
3. Обсудить кастомизацию: цвет кожи, тип фурнитуры (латунь, никель, антик), гравировка
4. Рассчитать стоимость с учётом кастомизации (базовая цена + доплата за кастом)
5. Когда покупатель готов — оформить заявку

ВАЖНО — Показ товаров:
Когда рекомендуешь или показываешь товар покупателю, ОБЯЗАТЕЛЬНО используй формат карточки:
[PRODUCT:id|название|цена|image_url|slug]
Этот формат отрендерится как красивая карточка с фото и кнопкой "В корзину".
Показывай карточки товаров когда покупатель спрашивает что есть, или когда рекомендуешь конкретный товар.

ВАЖНО — Кастомизация:
Когда покупатель хочет кастомизацию (другой цвет кожи, фурнитуру, гравировку, нестандартный размер), обсуди детали и рассчитай итоговую цену.
Примеры доплат:
- Гравировка: +500 ₽
- Нестандартный размер: +300 ₽
- Премиальная фурнитура (латунь ручной работы): +800 ₽
- Смена цвета кожи (при наличии): бесплатно
Итоговая цена = базовая цена товара + доплаты за кастомизацию.

ВАЖНО — Оформление заявки:
Когда покупатель подтвердил что хочет купить конкретные товары, выведи блок заказа в формате:
[ORDER:id:кол-во:итоговая_цена:описание кастомизации]
Если несколько товаров, разделяй ТОЧКОЙ С ЗАПЯТОЙ (;):
[ORDER:id1:1:5500:Кожа коньяк, фурнитура латунь;id2:2:3000:]
- id — id товара из каталога
- кол-во — количество (по умолчанию 1)
- итоговая_цена — цена ЗА ЕДИНИЦУ с учётом кастомизации (если кастомизации нет — базовая цена)
- описание кастомизации — текст с деталями (цвет, размер, фурнитура, гравировка). Запятые в тексте допустимы. Если кастомизации нет — оставь пустым
После этого блока напиши что заявка оформлена и с покупателем свяжутся.
НИКОГДА не используй запятую для разделения товаров — только точку с запятой (;).
Используй ТОЛЬКО id товаров из каталога.

Если не можешь помочь или покупатель просит связаться с мастером — скажи что переключаешь на оператора.

Каталог товаров:
${catalog || "Каталог пуст"}

Отвечай кратко, дружелюбно, на русском языке. Используй markdown для форматирования (но НЕ используй markdown для карточек товаров — только формат [PRODUCT:...]).`;

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
        if (fullContent) {
          await sb.from("chat_messages").insert({ session_id, role: "assistant", content: fullContent });
          
          const orderMatch = fullContent.match(/\[ORDER:([^\]]+)\]/);
          if (orderMatch && session) {
            try {
              // New format: id:qty:price:customization, ...
              const orderItems = orderMatch[1].split(";").map((item: string) => {
                const parts = item.trim().split(":");
                return {
                  id: parts[0]?.trim() || "",
                  qty: parseInt(parts[1]) || 1,
                  customPrice: parts[2] ? parseInt(parts[2]) : null,
                  customization: parts.slice(3).join(":").trim() || null,
                };
              });

              const productIds = orderItems.map((i: any) => i.id);
              const { data: orderProducts } = await sb
                .from("products")
                .select("id, name, price")
                .in("id", productIds);

              if (orderProducts && orderProducts.length > 0) {
                const total = orderItems.reduce((sum: number, item: any) => {
                  const prod = orderProducts.find((p: any) => p.id === item.id);
                  const unitPrice = item.customPrice || (prod ? prod.price : 0);
                  return sum + unitPrice * item.qty;
                }, 0);

                const { data: order } = await sb.from("orders").insert({
                  customer_name: session.customer_name,
                  customer_phone: session.customer_phone,
                  total,
                  delivery_method: "pickup",
                  customer_comment: `Заказ из чата (сессия: ${session_id})`,
                }).select("id").single();

                if (order) {
                  const items = orderItems
                    .map((item: any) => {
                      const prod = orderProducts.find((p: any) => p.id === item.id);
                      if (!prod) return null;
                      return {
                        order_id: order.id,
                        product_id: prod.id,
                        product_name: prod.name,
                        price: item.customPrice || prod.price,
                        quantity: item.qty,
                        customization: item.customization,
                      };
                    })
                    .filter(Boolean);

                  if (items.length > 0) {
                    await sb.from("order_items").insert(items);

                    // Telegram notification for chat-originated order
                    try {
                      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
                      const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
                      if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
                        const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        let text = `🛒 <b>Новая заявка из чата!</b>\n\n`;
                        text += `👤 <b>${escHtml(session.customer_name)}</b>\n`;
                        text += `📞 ${escHtml(session.customer_phone)}\n\n`;
                        text += `<b>Товары:</b>\n`;
                        for (const it of items) {
                          text += `• ${escHtml((it as any).product_name)} × ${(it as any).quantity} — ${(it as any).price * (it as any).quantity} ₽`;
                          if ((it as any).customization) text += `\n  <i>⚙️ ${escHtml((it as any).customization)}</i>`;
                          text += `\n`;
                        }
                        text += `\n💰 <b>Итого: ${total} ₽</b>`;
                        text += `\n\n🆔 <code>${order.id}</code>`;

                        await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${LOVABLE_API_KEY}`,
                            "X-Connection-Api-Key": TELEGRAM_API_KEY,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ chat_id: "8730142552", text, parse_mode: "HTML" }),
                        });
                      }
                    } catch (tgErr) {
                      console.error("Telegram notify from chat error:", tgErr);
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Auto-order creation error:", e);
            }
          }
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
