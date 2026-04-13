import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ShoppingBag, Check } from 'lucide-react';
import { addToCart } from '@/lib/cart';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Product() {
  const { slug } = useParams();
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('slug', slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="pt-24 md:pt-32 pb-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12 animate-pulse">
          <div className="w-full md:w-1/2 aspect-[3/4] bg-muted rounded-sm" />
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-24 md:pt-32 pb-20 text-center">
        <h1 className="font-serif text-3xl text-foreground">Товар не найден</h1>
        <Link to="/catalog" className="text-primary mt-4 inline-block">Вернуться в каталог</Link>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean) as string[];
  const price = new Intl.NumberFormat('ru-RU').format(product.price);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
    setAdded(true);
    toast.success('Добавлено в корзину');
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="pt-24 md:pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumb */}
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft size={14} />
          Каталог
        </Link>

        <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
          {/* Images */}
          <div className="w-full md:w-1/2 space-y-4">
            <div className="aspect-[3/4] bg-muted rounded-sm overflow-hidden">
              {allImages.length > 0 ? (
                <img src={allImages[activeImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-muted-foreground/30">К.АЯ</div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-20 rounded-sm overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="w-full md:w-1/2 space-y-6">
            {(product as any).categories && (
              <p className="text-xs tracking-[0.3em] uppercase text-primary/60 font-sans">{(product as any).categories.name}</p>
            )}
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">{product.name}</h1>
            <p className="font-serif text-2xl text-primary">{price} ₽</p>

            {product.description && (
              <p className="text-muted-foreground font-light leading-relaxed whitespace-pre-line">{product.description}</p>
            )}

            <div className="pt-4">
              <button
                onClick={handleAddToCart}
                disabled={added}
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-10 py-4 text-sm tracking-widest uppercase font-sans font-light hover:bg-primary/90 transition-all duration-300 disabled:opacity-70"
              >
                {added ? <Check size={16} /> : <ShoppingBag size={16} strokeWidth={1.5} />}
                {added ? 'Добавлено' : 'В корзину'}
              </button>
            </div>

            {/* Info details */}
            <div className="pt-8 border-t border-border space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground font-light w-32">Материал</span>
                <span className="text-foreground">Натуральная кожа</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground font-light w-32">Производство</span>
                <span className="text-foreground">Ручная работа</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground font-light w-32">Город</span>
                <span className="text-foreground">Дмитров</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
