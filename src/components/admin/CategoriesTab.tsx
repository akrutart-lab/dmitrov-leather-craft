import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from './ImageUpload';
import { transliterate } from '@/lib/transliterate';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Category = Tables<'categories'>;

export default function CategoriesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (cat: Partial<Category>) => {
      const payload = { name: cat.name, slug: cat.slug, description: cat.description, image_url: cat.image_url, sort_order: cat.sort_order ?? 0 };
      if (cat.id) {
        const { error } = await supabase.from('categories').update(payload).eq('id', cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ ...payload, name: payload.name!, slug: payload.slug! });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); setEditing(null); toast.success('Сохранено'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success('Удалено'); },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase.from('categories').update({ sort_order: newOrder }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  const handleNameChange = (name: string) => {
    const updates: Partial<Category> = { ...editing, name };
    if (!editing?.id) updates.slug = transliterate(name);
    setEditing(updates);
  };

  const handleSave = () => {
    if (!editing?.name || !editing?.slug) {
      toast.error('Заполните обязательные поля');
      return;
    }
    saveMutation.mutate(editing);
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    reorderMutation.mutate({ id: a.id, newOrder: b.sort_order });
    reorderMutation.mutate({ id: b.id, newOrder: a.sort_order });
  };

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => setEditing({ name: '', slug: '', description: '', image_url: '', sort_order: (categories?.length || 0) })}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={14} /> Добавить категорию
      </button>

      {editing && (
        <div className="border border-primary/30 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg">{editing.id ? 'Редактировать' : 'Новая категория'}</h3>
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
              <label className="text-xs text-muted-foreground mb-1 block">Фото категории</label>
              <ImageUpload value={editing.image_url} onChange={url => setEditing({ ...editing, image_url: url })} folder="categories" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3}
                className="w-full bg-transparent border border-border px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
            <Save size={14} /> Сохранить
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories?.map((c, i) => (
          <div key={c.id} className="border border-border p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-muted rounded-sm flex-shrink-0 overflow-hidden">
                {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.slug}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => moveCategory(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => moveCategory(i, 1)} disabled={i === (categories?.length || 0) - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => setEditing(c)} className="text-muted-foreground hover:text-primary transition-colors ml-2"><Pencil size={14} /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                    <AlertDialogDescription>Категория «{c.name}» будет удалена. Товары в ней останутся без категории.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Удалить</AlertDialogAction>
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
