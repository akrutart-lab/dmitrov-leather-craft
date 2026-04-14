import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hide on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

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
      {/* FAB button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Открыть чат"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
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
            /* Registration form */
            <div className="flex-1 flex flex-col justify-center px-6 gap-4">
              <p className="text-sm text-muted-foreground text-center">Представьтесь, чтобы начать чат с консультантом</p>
              <Input
                placeholder="Ваше имя"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Input
                placeholder="Телефон"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
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
            /* Chat */
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
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

              {/* Input area */}
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
