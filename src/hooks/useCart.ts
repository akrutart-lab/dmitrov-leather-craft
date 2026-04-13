import { useState, useEffect, useCallback } from 'react';
import { CartItem, getCart, addToCart as addToCartLib, removeFromCart as removeFromCartLib, updateQuantity as updateQuantityLib, clearCart as clearCartLib, getCartTotal, getCartCount } from '@/lib/cart';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(getCart);

  useEffect(() => {
    const handler = () => setItems(getCart());
    window.addEventListener('cart-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cart-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    addToCartLib(item);
    setItems(getCart());
  }, []);

  const removeItem = useCallback((id: string) => {
    removeFromCartLib(id);
    setItems(getCart());
  }, []);

  const setQuantity = useCallback((id: string, qty: number) => {
    updateQuantityLib(id, qty);
    setItems(getCart());
  }, []);

  const clear = useCallback(() => {
    clearCartLib();
    setItems([]);
  }, []);

  return {
    items,
    addItem,
    removeItem,
    setQuantity,
    clear,
    total: getCartTotal(items),
    count: getCartCount(items),
  };
}
