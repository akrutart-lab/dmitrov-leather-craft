import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
}

export default function ProductCard({ product }: Props) {
  const price = new Intl.NumberFormat('ru-RU').format(product.price);

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block"
    >
      <div className="aspect-[3/4] overflow-hidden bg-muted rounded-sm">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif text-xl">
            К.АЯ
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
        <p className="text-sm text-muted-foreground font-light">{price} ₽</p>
      </div>
    </Link>
  );
}
