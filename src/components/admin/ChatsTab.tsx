import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Send, ArrowLeft } from 'lucide-react';

type Session = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  created_at: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = { active: 'Активный', ticket: '🔔 Тикет', closed: 'Закрыт' };
const STATUS_COLORS: Record<string, string> = { active: 'text-green-400', ticket: 'text-yellow-500', closed: 'text-muted-foreground' };

export default function ChatsTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sessions } = useQuery({
    queryKey: ['admin-chat-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false });
      return (data || []) as Session[];
    },
    refetchInterval: 10000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['admin-chat-messages', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', selectedId).order('created_at', { ascending: true });
      return (data || []) as Message[];
    },
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`chat-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${selectedId}` }, () => {
        refetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, refetchMessages]);

  // Realtime for sessions list
  useEffect(() => {
    const channel = supabase
      .channel('admin-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-chat-sessions'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    await supabase.from('chat_messages').insert({
      session_id: selectedId,
      role: 'assistant',
      content: reply.trim(),
    });
    setReply('');
    refetchMessages();
  };

  const closeSession = async (id: string) => {
    await supabase.from('chat_sessions').update({ status: 'closed' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-chat-sessions'] });
  };

  const ticketCount = sessions?.filter(s => s.status === 'ticket').length || 0;

  if (selectedId) {
    const session = sessions?.find(s => s.id === selectedId);
    return (
      <div className="flex flex-col h-[600px]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="font-medium">{session?.customer_name}</span>
            <span className="text-muted-foreground text-sm ml-2">{session?.customer_phone}</span>
            <span className={`text-xs ml-2 ${STATUS_COLORS[session?.status || 'active']}`}>
              {STATUS_LABELS[session?.status || 'active']}
            </span>
          </div>
          {session?.status !== 'closed' && (
            <button onClick={() => closeSession(selectedId)} className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-border px-2 py-1">
              Закрыть чат
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 border border-border rounded p-3 bg-background/50">
          {messages?.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                m.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-muted text-foreground'
              }`}>
                <div className="text-[10px] text-muted-foreground mb-1">
                  {m.role === 'user' ? 'Клиент' : 'Консультант'} · {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {session?.status !== 'closed' && (
          <div className="flex gap-2 mt-3">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReply()}
              placeholder="Ответить как оператор..."
              className="flex-1 bg-transparent border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button onClick={sendReply} disabled={!reply.trim()} className="text-primary disabled:opacity-30">
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {ticketCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded px-4 py-2 mb-4 text-sm text-yellow-500">
          🔔 {ticketCount} чат(ов) с запросом оператора
        </div>
      )}

      {!sessions?.length ? (
        <p className="text-muted-foreground text-sm">Нет чатов</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className="w-full text-left border border-border rounded p-3 hover:bg-muted/30 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-sm">{s.customer_name}</span>
                <span className="text-muted-foreground text-xs ml-2">{s.customer_phone}</span>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(s.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
              <span className={`text-xs ${STATUS_COLORS[s.status]}`}>
                {STATUS_LABELS[s.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
