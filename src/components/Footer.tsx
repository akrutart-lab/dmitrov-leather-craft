import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Logo & desc */}
          <div>
            <Link to="/" className="font-serif text-3xl tracking-widest text-primary">К.АЯ</Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Изделия из натуральной кожи ручной работы.<br />
              Мастерская в Дмитрове.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="font-serif text-lg text-foreground mb-4">Навигация</h4>
            <nav className="flex flex-col gap-2">
              {[
                { to: '/catalog', label: 'Каталог' },
                { to: '/delivery', label: 'Доставка' },
                { to: '/privacy', label: 'Политика конфиденциальности' },
                { to: '/offer', label: 'Публичная оферта' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="font-serif text-lg text-foreground mb-4">Контакты</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>г. Дмитров, Московская область</p>
              <p>Телефон: <a href="tel:+79001234567" className="hover:text-primary transition-colors">+7 (900) 123-45-67</a></p>
              <p>Email: <a href="mailto:info@k-aya.ru" className="hover:text-primary transition-colors">info@k-aya.ru</a></p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} К.АЯ — кожевенная мастерская</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">Конфиденциальность</Link>
            <Link to="/offer" className="text-xs text-muted-foreground hover:text-primary transition-colors">Оферта</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
