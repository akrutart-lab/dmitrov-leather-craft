import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, User, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { addToCart } from '@/lib/cart';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

function ProductCard({ id, name, price, imageUrl, slug }: { id: string; name: string; price: number; imageUrl: string; slug: string }) {
  const handleAdd = () => {
    addToCart({ id, name, price, image_url: imageUrl || null });
    toast.success(`${name} добавлен в корзину`);
  };

  return (
    <div className="flex gap-3 p-2 rounded-lg border border-border bg-background my-2 max-w-[280px]">
      {imageUrl && (
        <img src={imageUrl} alt={name} className="w-16 h-16 rounded object-cover flex-shrink-0" />
      )}
      <div className="flex flex-col justify-between min-w-0 flex-1">
        <a href={`/product/${slug}`} className="text-sm font-medium text-foreground hover:text-primary truncate">{name}</a>
        <span className="text-sm font-semibold text-primary">{price.toLocaleString('ru-RU')} ₽</span>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs text-primary hover:opacity-70 transition-opacity mt-1 self-start"
        >
          <ShoppingCart size={12} /> В корзину
        </button>
      </div>
    </div>
  );
}

function OrderBlock({ items, navigate }: { items: { id: string; name: string; price: number; qty: number; customization?: string }[]; navigate: (path: string) => void }) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className="p-3 rounded-lg border-2 border-primary/50 bg-primary/5 my-2">
      <p className="text-sm font-semibold mb-2">🎉 Заявка оформлена!</p>
      {items.map((item, i) => (
        <div key={i} className="text-xs mb-1">
          <div className="flex justify-between">
            <span>{item.name} × {item.qty}</span>
            <span>{(item.price * item.qty).toLocaleString('ru-RU')} ₽</span>
          </div>
          {item.customization && (
            <p className="text-muted-foreground ml-2 italic">✏️ {item.customization}</p>
          )}
        </div>
      ))}
      <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-border">
        <span>Итого:</span>
        <span>{total.toLocaleString('ru-RU')} ₽</span>
      </div>
      <button
        onClick={() => {
          items.forEach(item => addToCart({
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: null,
            customization: item.customization,
            customPrice: item.customization ? item.price : undefined,
          }));
          navigate('/cart');
        }}
        className="mt-2 w-full bg-primary text-primary-foreground text-xs py-1.5 rounded hover:opacity-90 transition-opacity"
      >
        Перейти в корзину
      </button>
    </div>
  );
}

// Parse [PRODUCT:id|name|price|image_url|slug] and [ORDER:id:qty:price:customization,...]
function parseSpecialBlocks(text: string, products: Map<string, any>, navigate: (path: string) => void) {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\[PRODUCT:([^\]]+)\]|\[ORDER:([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const segments = match[1].split('|');
      if (segments.length >= 5) {
        const [id, name, priceStr, imageUrl, slug] = segments;
        parts.push(
          <ProductCard key={match.index} id={id} name={name} price={parseInt(priceStr)} imageUrl={imageUrl} slug={slug} />
        );
      }
    } else if (match[2]) {
      // New format: id:qty:price:customization, separated by semicolons
      const orderItems = match[2].split(';').map(item => {
        const colonParts = item.trim().split(':');
        const id = colonParts[0]?.trim() || '';
        const qty = parseInt(colonParts[1]) || 1;
        const customPrice = colonParts[2] ? parseInt(colonParts[2]) : undefined;
        const customization = colonParts.slice(3).join(':').trim() || undefined;
        const prod = products.get(id);
        return {
          id,
          name: prod?.name || 'Товар',
          price: customPrice || prod?.price || 0,
          qty,
          customization,
        };
      });
      parts.push(<OrderBlock key={match.index} items={orderItems} navigate={navigate} />);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function ChatMessage({ content, role, products, navigate }: { content: string; role: string; products: Map<string, any>; navigate: (path: string) => void }) {
  if (role !== 'assistant') return <>{content}</>;

  const hasSpecial = /\[PRODUCT:|ORDER:/.test(content);
  if (!hasSpecial) {
    return (
      <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const parts = parseSpecialBlocks(content, products, navigate);
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <div key={i} className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
            <ReactMarkdown>{part}</ReactMarkdown>
          </div>
        ) : part
      )}
    </>
  );
}

export default function ChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [productMap, setProductMap] = useState<Map<string, any>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    supabase.from('products').select('id, name, price, image_url, slug').eq('in_stock', true).then(({ data }) => {
      if (data) {
        const map = new Map<string, any>();
        data.forEach(p => map.set(p.id, p));
        setProductMap(map);
      }
    });
  }, []);

  if (location.pathname.startsWith('/admin')) return null;

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !agreed) return;
    const { data, error } = await supabase.from('chat_sessions').insert({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
    }).select('id').single();
    if (error || !data) return;
    setSessionId(data.id);
    setRegistered(true);
    setMessages([{ role: 'assistant', content: `Здравствуйте, ${name.trim()}! 👋 Я — ИИ-консультант мастерской К.АЯ. Помогу выбрать изделие, подобрать размер или обсудить кастомизацию. Чем могу помочь?` }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ session_id: sessionId, message: userMsg }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && prev.length > 1) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  const requestOperator = async () => {
    if (!sessionId) return;
    await supabase.from('chat_sessions').update({ status: 'ticket' }).eq('id', sessionId);
    setMessages(prev => [...prev, { role: 'assistant', content: '🔔 Запрос отправлен оператору. Мастер свяжется с вами в ближайшее время!' }]);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Открыть чат"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-medium text-sm">К.АЯ — Консультант</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70 transition-opacity">
              <X size={18} />
            </button>
          </div>

          {!registered ? (
            <div className="flex-1 flex flex-col justify-center px-6 gap-4">
              <p className="text-sm text-muted-foreground text-center">Представьтесь, чтобы начать чат с консультантом</p>
              <Input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Телефон" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  Согласен с{' '}
                  <a href="/privacy" target="_blank" className="text-primary underline">политикой конфиденциальности</a>
                </span>
              </label>
              <button
                onClick={handleRegister}
                disabled={!name.trim() || !phone.trim() || !agreed}
                className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Начать чат
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      <ChatMessage content={m.content} role={m.role} products={productMap} navigate={navigate} />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm">
                      <span className="animate-pulse">●●●</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Напишите сообщение..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="text-primary disabled:opacity-30 hover:opacity-70 transition-opacity"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <button
                  onClick={requestOperator}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 self-start"
                >
                  <User size={12} /> Позвать оператора
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
