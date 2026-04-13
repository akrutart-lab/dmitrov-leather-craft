import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { getCartCount, getCart } from '@/lib/cart';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const update = () => setCount(getCartCount(getCart()));
    update();
    window.addEventListener('cart-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/catalog', label: 'Каталог' },
    { to: '/delivery', label: 'Доставка' },
    { to: '/#about', label: 'О нас' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="font-serif text-2xl md:text-3xl tracking-widest text-primary hover:text-gold-light transition-colors">
          К.АЯ
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm font-sans font-light tracking-wider uppercase text-foreground/70 hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
          <Link to="/cart" className="relative text-foreground/70 hover:text-primary transition-colors">
            <ShoppingBag size={20} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-sans font-medium">
                {count}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile nav toggle + cart */}
        <div className="flex items-center gap-4 md:hidden">
          <Link to="/cart" className="relative text-foreground/70 hover:text-primary transition-colors">
            <ShoppingBag size={20} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-sans font-medium">
                {count}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-foreground/70">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-md border-b border-border">
          <nav className="flex flex-col px-6 py-6 gap-5">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="text-sm font-sans font-light tracking-wider uppercase text-foreground/70 hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
