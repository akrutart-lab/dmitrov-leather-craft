export default function Delivery() {
  return (
    <div className="pt-24 md:pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-xs tracking-[0.3em] uppercase text-primary/60 font-sans mb-4">Информация</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10">Доставка</h1>

        <div className="space-y-8 text-muted-foreground font-light leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl text-foreground mb-3">По Дмитрову</h2>
            <p>Бесплатная доставка по городу Дмитров при заказе от 3 000 ₽. Доставка осуществляется в удобное для вас время по согласованию.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-3">По Московской области</h2>
            <p>Доставка по Московской области — от 300 ₽. Стоимость и сроки рассчитываются индивидуально после оформления заявки.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-3">По России</h2>
            <p>Отправка по всей России службами СДЭК и Почтой России. Стоимость доставки рассчитывается при оформлении. Среднее время доставки — 3–7 рабочих дней.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-3">Самовывоз</h2>
            <p>Вы можете забрать заказ лично из мастерской в Дмитрове. Адрес и время самовывоза уточняются при подтверждении заказа.</p>
          </section>

          <section className="border-t border-border pt-8">
            <h2 className="font-serif text-2xl text-foreground mb-3">Как оформить заказ</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Выберите товар в каталоге и добавьте в корзину</li>
              <li>Перейдите в корзину и заполните форму заявки</li>
              <li>Мы свяжемся с вами для подтверждения заказа и уточнения деталей доставки</li>
              <li>Оплата при получении или по договорённости</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
