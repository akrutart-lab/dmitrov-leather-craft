export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  customization?: string;
  customPrice?: number;
}

const CART_KEY = 'kaya_cart';

export function getCart(): CartItem[] {
  try {
    const data = localStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const cart = getCart();
  // Customized items are always separate entries
  if (item.customization) {
    cart.push({ ...item, quantity: 1 });
  } else {
    const existing = cart.find(i => i.id === item.id && !i.customization);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
  }
  saveCart(cart);
}

export function removeFromCart(id: string, index?: number) {
  const cart = getCart();
  if (index !== undefined) {
    cart.splice(index, 1);
  } else {
    const idx = cart.findIndex(i => i.id === id);
    if (idx !== -1) cart.splice(idx, 1);
  }
  saveCart(cart);
}

export function updateQuantity(id: string, quantity: number, index?: number) {
  const cart = getCart();
  const item = index !== undefined ? cart[index] : cart.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  saveCart(cart);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cart-updated'));
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.customPrice || item.price) * item.quantity, 0);
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
