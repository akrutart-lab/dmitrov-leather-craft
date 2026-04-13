import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';

const categoryFilters = [
  { slug: '', label: 'Все' },
  { slug: 'bags', label: 'Сумки' },
  { slug: 'doc-holders', label: 'Докхолдеры' },
  { slug: 'belts', label: 'Ремни' },
  { slug: 'wallets', label: 'Кошельки' },
];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      return data || [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: async () => {
      let query = supabase.from('products').select('*, categories(slug)').eq('in_stock', true).order('sort_order');
      const { data } = await query;
      if (!data) return [];
      if (!activeCategory) return data;
      return data.filter((p: any) => p.categories?.slug === activeCategory);
    },
  });

  return (
    <div className="pt-24 md:pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] uppercase text-primary/60 font-sans mb-4">Коллекция</p>
          <h1 className="font-serif text-4xl md:text-6xl text-foreground">Каталог</h1>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {categoryFilters.map(f => (
            <button
              key={f.slug}
              onClick={() => {
                if (f.slug) {
                  setSearchParams({ category: f.slug });
                } else {
                  setSearchParams({});
                }
              }}
              className={`px-5 py-2 text-xs tracking-wider uppercase font-sans font-light border transition-all duration-300 ${
                activeCategory === f.slug
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-sm" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-muted-foreground">Товары скоро появятся</p>
            <p className="text-sm text-muted-foreground/60 mt-2">Мы готовим коллекцию для вас</p>
          </div>
        )}
      </div>
    </div>
  );
}
