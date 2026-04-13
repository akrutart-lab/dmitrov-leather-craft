export default function Privacy() {
  return (
    <div className="pt-24 md:pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-10">Политика конфиденциальности</h1>
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground font-light leading-relaxed space-y-6">
          <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта мастерской «К.АЯ» (далее — Мастерская).</p>

          <h2 className="font-serif text-xl text-foreground">1. Сбор информации</h2>
          <p>Мы собираем персональные данные, которые вы предоставляете добровольно при оформлении заявки: имя, номер телефона, комментарии к заказу.</p>

          <h2 className="font-serif text-xl text-foreground">2. Использование информации</h2>
          <p>Предоставленные данные используются исключительно для:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Обработки и подтверждения заказов</li>
            <li>Связи с покупателем для уточнения деталей заказа и доставки</li>
            <li>Улучшения качества обслуживания</li>
          </ul>

          <h2 className="font-serif text-xl text-foreground">3. Защита данных</h2>
          <p>Мастерская принимает все необходимые меры для защиты персональных данных пользователей от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>

          <h2 className="font-serif text-xl text-foreground">4. Передача третьим лицам</h2>
          <p>Мы не передаём персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством Российской Федерации.</p>

          <h2 className="font-serif text-xl text-foreground">5. Контактная информация</h2>
          <p>По вопросам, связанным с обработкой персональных данных, вы можете обратиться по электронной почте: info@k-aya.ru</p>

          <p className="text-xs text-muted-foreground/60 pt-4">Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
}
