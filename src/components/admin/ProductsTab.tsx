import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from './ImageUpload';
import { transliterate } from '@/lib/transliterate';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Product = Tables<'products'>;

export default function ProductsTab() {
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
      const payload = {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        image_url: product.image_url,
        images: product.images || [],
        in_stock: product.in_stock,
      };
      if (product.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, name: payload.name!, slug: payload.slug!, price: payload.price! });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setEditing(null); toast.success('Сохранено'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Удалено'); },
  });

  const handleNameChange = (name: string) => {
    const updates: Partial<Product> = { ...editing, name };
    if (!editing?.id) updates.slug = transliterate(name);
    setEditing(updates);
  };

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
        onClick={() => setEditing({ name: '', slug: '', description: '', price: 0, category_id: null, image_url: '', images: [], in_stock: true })}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={14} /> Добавить товар
      </button>

      {editing && (
        <div className="border border-primary/30 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg">{editing.id ? 'Редактировать' : 'Новый товар'}</h3>
            <button onClick={() => setEditing(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input value={editing.name || ''} onChange={e => handleNameChange(e.target.value)}
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
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Главное фото</label>
              <ImageUpload value={editing.image_url} onChange={url => setEditing({ ...editing, image_url: url })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Галерея</label>
              <MultiImageUpload values={editing.images || []} onChange={imgs => setEditing({ ...editing, images: imgs })} />
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

      <div className="space-y-2">
        {products?.map((p: any) => (
          <div key={p.id} className="border border-border p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-14 bg-muted rounded-sm flex-shrink-0 overflow-hidden">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat('ru-RU').format(p.price)} ₽ · {p.categories?.name || 'Без категории'}
                  {!p.in_stock && ' · Нет в наличии'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
                    <AlertDialogDescription>Товар «{p.name}» будет удалён. Это действие нельзя отменить.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Удалить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
