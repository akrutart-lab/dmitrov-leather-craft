import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

const categories = [
  { slug: 'bags', title: 'Сумки', desc: 'Шопперы, кросс-боди и другие модели — каждая сумка создана вручную из отборной кожи растительного дубления.' },
  { slug: 'doc-holders', title: 'Докхолдеры', desc: 'Элегантные обложки для документов — надёжная защита и безупречный стиль.' },
  { slug: 'belts', title: 'Ремни', desc: 'Классические и современные ремни ручной работы — акцент, который завершает образ.' },
  { slug: 'wallets', title: 'Кошельки', desc: 'Портмоне и кошельки из натуральной кожи — компактность и благородство в каждой детали.' },
];

const advantages = [
  { icon: '✦', title: 'Ручная работа', desc: 'Каждое изделие создаётся мастером вручную от выкройки до финишной обработки' },
  { icon: '◈', title: 'Натуральная кожа', desc: 'Используем кожу растительного дубления — она становится красивее с годами' },
  { icon: '◇', title: 'Доставка по Дмитрову', desc: 'Бесплатная доставка по городу. Отправляем по всей России' },
];

export default function Index() {
  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="relative z-10 text-center px-6 animate-fade-in">
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground mb-6 font-sans font-light">Кожевенная мастерская · Дмитров</p>
          <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl text-primary tracking-wider mb-6">К.АЯ</h1>
          <p className="font-serif text-xl md:text-2xl text-foreground/70 italic mb-10 max-w-lg mx-auto">
            Изделия из натуральной кожи, созданные с любовью к ремеслу
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-3 border border-primary/40 text-primary px-8 py-3 text-sm tracking-widest uppercase font-sans font-light hover:bg-primary hover:text-primary-foreground transition-all duration-500"
          >
            Каталог
            <ArrowRight size={16} strokeWidth={1} />
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-primary/30" />
      </section>

      {/* Zigzag categories */}
      {categories.map((cat, i) => (
        <section key={cat.slug} className="py-20 md:py-28">
          <div className={`max-w-7xl mx-auto px-6 flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 md:gap-20`}>
            <div className="w-full md:w-1/2">
              <div className="aspect-[4/5] bg-muted/50 rounded-sm overflow-hidden">
                {/* Category image placeholder */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-card">
                  <span className="font-serif text-4xl text-muted-foreground/30">{cat.title}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-6">
              <p className="text-xs tracking-[0.3em] uppercase text-primary/60 font-sans">Категория</p>
              <h2 className="font-serif text-4xl md:text-5xl text-foreground">{cat.title}</h2>
              <p className="text-muted-foreground font-light leading-relaxed max-w-md">{cat.desc}</p>
              <Link
                to={`/catalog?category=${cat.slug}`}
                className="inline-flex items-center gap-2 text-primary text-sm tracking-wider uppercase font-sans font-light hover:gap-4 transition-all duration-300"
              >
                Смотреть
                <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* About section */}
      <section id="about" className="py-20 md:py-28 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-primary/60 font-sans mb-6">О мастерской</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-8">Ремесло и вдохновение</h2>
          <p className="text-muted-foreground font-light leading-relaxed text-lg max-w-2xl mx-auto">
            Мастерская «К.АЯ» — это место, где натуральная кожа обретает новую жизнь.
            Каждое изделие создаётся вручную в Дмитрове с вниманием к мельчайшим деталям.
            Мы используем кожу растительного дубления, которая со временем становится только красивее,
            обретая уникальную патину и характер.
          </p>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 md:py-28 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {advantages.map(a => (
              <div key={a.title} className="text-center space-y-4">
                <span className="text-3xl text-primary">{a.icon}</span>
                <h3 className="font-serif text-xl text-foreground">{a.title}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6">Найдите своё изделие</h2>
          <p className="text-muted-foreground font-light mb-10 max-w-lg mx-auto">
            Откройте каталог и выберите аксессуар, который станет вашим спутником на долгие годы
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-4 text-sm tracking-widest uppercase font-sans font-light hover:bg-primary/90 transition-all duration-300"
          >
            Перейти в каталог
            <ArrowRight size={16} strokeWidth={1} />
          </Link>
        </div>
      </section>
    </>
  );
}
