import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, ShoppingBag, Package, FolderOpen, MessageCircle } from 'lucide-react';
import OrdersTab from '@/components/admin/OrdersTab';
import ProductsTab from '@/components/admin/ProductsTab';
import CategoriesTab from '@/components/admin/CategoriesTab';
import ChatsTab from '@/components/admin/ChatsTab';

type Tab = 'orders' | 'products' | 'categories' | 'chats';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('orders');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

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

  // New orders count for badge
  const { data: newCount } = useQuery({
    queryKey: ['admin-new-count'],
    queryFn: async () => {
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new');
      return count || 0;
    },
    enabled: isAdmin === true,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Загрузка...</div>;

  const tabs: { key: Tab; label: string; icon: typeof ShoppingBag; badge?: number }[] = [
    { key: 'orders', label: 'Заявки', icon: ShoppingBag, badge: newCount || undefined },
    { key: 'products', label: 'Товары', icon: Package },
    { key: 'categories', label: 'Категории', icon: FolderOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="font-serif text-xl text-primary tracking-widest">К.АЯ</Link>
          <span className="text-xs text-muted-foreground tracking-wider uppercase">Админ</span>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm">
          <LogOut size={14} /> <span className="hidden sm:inline">Выйти</span>
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex gap-1 mb-8 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-sm whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {t.badge && t.badge > 0 && (
                <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}
