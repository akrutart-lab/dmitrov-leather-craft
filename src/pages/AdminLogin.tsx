import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const { data: roles } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!roles) {
        await supabase.auth.signOut();
        toast.error('Нет доступа к админ-панели');
        return;
      }

      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-primary mb-2">К.АЯ</h1>
          <p className="text-sm text-muted-foreground">Вход в админ-панель</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-widest uppercase font-sans hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
