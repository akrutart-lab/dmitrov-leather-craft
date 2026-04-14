import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'> & { order_items?: Tables<'order_items'>[] };

const STATUS_LABELS: Record<string, string> = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена' };
const STATUS_COLORS: Record<string, string> = { new: 'text-yellow-500', in_progress: 'text-blue-400', completed: 'text-green-400' };
const FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Выполненные' },
];

export default function OrdersTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      return (data || []) as Order[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Статус обновлён'); },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { error } = await supabase.from('orders').update({ admin_comment: comment } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Комментарий сохранён'); },
  });

  const newCount = orders?.filter(o => o.status === 'new').length || 0;
  const filtered = filter === 'all' ? orders : orders?.filter(o => o.status === filter);

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs transition-all ${
              filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.value === 'new' && newCount > 0 && (
              <span className="ml-1.5 bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full text-[10px]">{newCount}</span>
            )}
          </button>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && <p className="text-muted-foreground py-10 text-center">Заявок нет</p>}

      {filtered?.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusChange={(status) => updateStatus.mutate({ id: order.id, status })}
          onCommentSave={(comment) => updateComment.mutate({ id: order.id, comment })}
        />
      ))}
    </div>
  );
}

function OrderCard({ order, onStatusChange, onCommentSave }: {
  order: Order;
  onStatusChange: (status: string) => void;
  onCommentSave: (comment: string) => void;
}) {
  const [comment, setComment] = useState((order as any).admin_comment || '');
  const [editingComment, setEditingComment] = useState(false);

  return (
    <div className="border border-border p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-serif text-lg">{order.customer_name}</span>
          <span className="text-muted-foreground text-sm ml-3">{order.customer_phone}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
          <select
            value={order.status}
            onChange={e => onStatusChange(e.target.value)}
            className="bg-muted border border-border text-foreground text-xs px-2 py-1"
          >
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнена</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {new Date(order.created_at).toLocaleString('ru-RU')} · {order.delivery_method === 'delivery' ? 'Доставка' : 'Самовывоз'}
        {order.customer_comment && ` · ${order.customer_comment}`}
      </p>

      {order.delivery_method === 'delivery' && order.delivery_address && (
        <p className="text-xs text-muted-foreground">📍 Адрес доставки: <span className="text-foreground">{order.delivery_address}</span></p>
      )}
      {order.delivery_method === 'pickup' && (
        <p className="text-xs text-muted-foreground">📍 Самовывоз: г. Дмитров, ул. Межевая, д. 2Б</p>
      )}

      {order.order_items && order.order_items.length > 0 && (
        <div className="text-sm space-y-1">
          {order.order_items.map(item => (
            <div key={item.id} className="text-muted-foreground">
              <div className="flex justify-between">
                <span>{item.product_name} × {item.quantity}</span>
                <span>{new Intl.NumberFormat('ru-RU').format(item.price * item.quantity)} ₽</span>
              </div>
              {(item as any).customization && (
                <p className="text-xs italic ml-2 text-muted-foreground/70">✏️ {(item as any).customization}</p>
              )}
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-border text-foreground font-medium">
            <span>Итого</span>
            <span>{new Intl.NumberFormat('ru-RU').format(order.total)} ₽</span>
          </div>
        </div>
      )}

      {/* Admin comment */}
      <div className="pt-2 border-t border-border/50">
        {editingComment ? (
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Заметка для себя..."
              className="flex-1 bg-transparent border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => { onCommentSave(comment); setEditingComment(false); }}
              className="text-xs text-primary hover:text-primary/80"
            >
              Сохранить
            </button>
            <button onClick={() => setEditingComment(false)} className="text-xs text-muted-foreground">Отмена</button>
          </div>
        ) : (
          <button
            onClick={() => setEditingComment(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {comment ? `📝 ${comment}` : '+ Добавить заметку'}
          </button>
        )}
      </div>
    </div>
  );
}
