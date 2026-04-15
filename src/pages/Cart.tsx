import { useState } from 'react';

import { Link } from 'react-router-dom';
import { Minus, Plus, X, ArrowLeft, Send } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import PhoneInput from '@/components/PhoneInput';
import { toast } from 'sonner';

export default function Cart() {
  const { items, removeItem, setQuantity, clear, total, count } = useCart();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    comment: '',
    delivery: 'pickup',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Укажите имя и телефон');
      return;
    }
    if (items.length === 0) return;

    setSending(true);
    try {
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_comment: form.comment.trim() || null,
          delivery_method: form.delivery,
          delivery_address: form.delivery === 'delivery' ? (form.address.trim() || null) : null,
          total,
        } as any);

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.customPrice || item.price,
        customization: item.customization || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Send Telegram notification (fire and forget)
      supabase.functions.invoke('telegram-notify', {
        body: {
          order_id: orderId,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          total,
          delivery_method: form.delivery,
          delivery_address: form.delivery === 'delivery' ? (form.address.trim() || null) : null,
          comment: form.comment.trim() || null,
          items: orderItems,
        },
      }).catch(err => console.error('Telegram notify error:', err));

      clear();
      setSent(true);
      toast.success('Заявка отправлена!');
    } catch (err) {
      console.error('Order submit error:', err);
      toast.error('Ошибка при отправке. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="pt-24 md:pt-32 pb-20 text-center max-w-lg mx-auto px-6">
        <div className="space-y-6">
          <span className="text-4xl">✓</span>
          <h1 className="font-serif text-3xl text-foreground">Заявка отправлена</h1>
          <p className="text-muted-foreground font-light">
            Спасибо! Мы свяжемся с вами в ближайшее время для подтверждения заказа.
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-primary text-sm tracking-wider uppercase hover:gap-3 transition-all"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const priceFormat = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

  return (
    <div className="pt-24 md:pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft size={14} />
          Каталог
        </Link>

        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10">Корзина</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-serif text-2xl text-muted-foreground mb-4">Корзина пуста</p>
            <Link to="/catalog" className="text-primary text-sm tracking-wider uppercase">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Items */}
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex gap-4 md:gap-6 py-6 border-b border-border">
                  <div className="w-20 h-24 md:w-24 md:h-32 bg-muted rounded-sm overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-serif text-sm">К.АЯ</div>
                    )}
                  </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-serif text-lg text-foreground truncate pr-4">{item.name}</h3>
                      <button onClick={() => removeItem(item.id, index)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                    {item.customization && (
                      <p className="text-xs text-muted-foreground mt-1 italic">✏️ {item.customization}</p>
                    )}
                    <p className="text-primary mt-1">{priceFormat(item.customPrice || item.price)} ₽</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => setQuantity(item.id, item.quantity - 1)} className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => setQuantity(item.id, item.quantity + 1)} className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-t border-border">
              <span className="font-serif text-xl text-foreground">Итого</span>
              <span className="font-serif text-2xl text-primary">{priceFormat(total)} ₽</span>
            </div>

            {/* Order form */}
            <form onSubmit={handleSubmit} className="space-y-6 border-t border-border pt-8">
              <h2 className="font-serif text-2xl text-foreground">Оформить заявку</h2>
              <p className="text-sm text-muted-foreground font-light">Мы свяжемся с вами для подтверждения заказа</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-wider uppercase text-muted-foreground mb-2 block">Ваше имя *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs tracking-wider uppercase text-muted-foreground mb-2 block">Телефон *</label>
                  <PhoneInput
                    value={form.phone}
                    onChange={phone => setForm({ ...form, phone })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs tracking-wider uppercase text-muted-foreground mb-2 block">Способ доставки</label>
                <div className="flex gap-4">
                  {[
                    { value: 'pickup', label: 'Самовывоз' },
                    { value: 'delivery', label: 'Доставка' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, delivery: opt.value })}
                      className={`flex-1 border px-4 py-3 text-sm text-center cursor-pointer transition-all ${form.delivery === opt.value ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
              </div>
              </div>

              {form.delivery === 'pickup' && (
                <div className="bg-muted/50 border border-border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Адрес самовывоза: </span>
                  <span className="text-foreground">г. Дмитров, ул. Межевая, д. 2Б</span>
                </div>
              )}

              {form.delivery === 'delivery' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs tracking-wider uppercase text-muted-foreground mb-2 block">Адрес доставки</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      placeholder="Город, улица, дом, квартира"
                      className="w-full bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                      maxLength={500}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Стоимость доставки рассчитывается индивидуально — мы сообщим при подтверждении заказа</p>
                </div>
              )}

              <div>
                <label className="text-xs tracking-wider uppercase text-muted-foreground mb-2 block">Комментарий</label>
                <textarea
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-10 py-4 text-sm tracking-widest uppercase font-sans font-light hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
              >
                <Send size={16} strokeWidth={1.5} />
                {sending ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
