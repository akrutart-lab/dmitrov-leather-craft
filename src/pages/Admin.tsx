import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Package, ShoppingBag, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type Order = Tables<'orders'> & { order_items?: Tables<'order_items'>[] };

export default function Admin() {
  const [tab, setTab] = useState<'orders' | 'products'>('orders');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/admin/login'); return; }
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!data) { navigate('/admin/login'); return; }
      setIsAdmin(true);
    };
    check();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif text-xl text-primary tracking-widest">К.АЯ</Link>
          <span className="text-xs text-muted-foreground tracking-wider uppercase">Админ</span>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm">
          <LogOut size={14} /> Выйти
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8">
          <button onClick={() => setTab('orders')} className={`flex items-center gap-2 px-5 py-2 text-sm transition-all ${tab === 'orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <ShoppingBag size={14} /> Заявки
          </button>
          <button onClick={() => setTab('products')} className={`flex items-center gap-2 px-5 py-2 text-sm transition-all ${tab === 'products' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Package size={14} /> Товары
          </button>
        </div>

        {tab === 'orders' ? <OrdersTab /> : <ProductsTab />}
      </div>
    </div>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();
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

  const statusLabels: Record<string, string> = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена' };
  const statusColors: Record<string, string> = { new: 'text-yellow-500', in_progress: 'text-blue-400', completed: 'text-green-400' };

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-4">
      {(!orders || orders.length === 0) && <p className="text-muted-foreground py-10 text-center">Заявок пока нет</p>}
      {orders?.map(order => (
        <div key={order.id} className="border border-border p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-serif text-lg">{order.customer_name}</span>
              <span className="text-muted-foreground text-sm ml-3">{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
              <select
                value={order.status}
                onChange={e => updateStatus.mutate({ id: order.id, status: e.target.value })}
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
          {order.order_items && order.order_items.length > 0 && (
            <div className="text-sm space-y-1">
              {order.order_items.map(item => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{new Intl.NumberFormat('ru-RU').format(item.price * item.quantity)} ₽</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border text-foreground font-medium">
                <span>Итого</span>
                <span>{new Intl.NumberFormat('ru-RU').format(order.total)} ₽</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, categories(name)').order('sort_order');
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (product.id) {
        const { error } = await supabase.from('products').update({
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          category_id: product.category_id,
          image_url: product.image_url,
          in_stock: product.in_stock,
        }).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({
          name: product.name!,
          slug: product.slug!,
          description: product.description,
          price: product.price!,
          category_id: product.category_id,
          image_url: product.image_url,
          in_stock: product.in_stock ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditing(null);
      toast.success('Сохранено');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Удалено'); },
  });

  const handleSave = () => {
    if (!editing?.name || !editing?.slug || !editing?.price) {
      toast.error('Заполните обязательные поля');
      return;
    }
    saveMutation.mutate(editing);
  };

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => setEditing({ name: '', slug: '', description: '', price: 0, category_id: null, image_url: '', in_stock: true })}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={14} /> Добавить товар
      </button>

      {/* Edit form */}
      {editing && (
        <div className="border border-primary/30 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg">{editing.id ? 'Редактировать' : 'Новый товар'}</h3>
            <button onClick={() => setEditing(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slug *</label>
              <input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Цена (₽) *</label>
              <input type="number" value={editing.price || 0} onChange={e => setEditing({ ...editing, price: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
              <select value={editing.category_id || ''} onChange={e => setEditing({ ...editing, category_id: e.target.value || null })}
                className="w-full bg-muted border border-border px-3 py-2 text-foreground text-sm">
                <option value="">Без категории</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">URL изображения</label>
              <input value={editing.image_url || ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.in_stock ?? true} onChange={e => setEditing({ ...editing, in_stock: e.target.checked })} />
              В наличии
            </label>
          </div>
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
            <Save size={14} /> Сохранить
          </button>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-2">
        {products?.map((p: any) => (
          <div key={p.id} className="border border-border p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-14 bg-muted rounded-sm flex-shrink-0 overflow-hidden">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{new Intl.NumberFormat('ru-RU').format(p.price)} ₽ · {p.categories?.name || 'Без категории'}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
              <button onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(p.id); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
