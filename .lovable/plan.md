

## AI-чат-бот для К.АЯ

### Что будет сделано

**1. База данных — 2 новые таблицы**
- `chat_sessions` — сессии чата (id, customer_name, customer_phone, status: active/ticket/closed, created_at, updated_at)
- `chat_messages` — сообщения (id, session_id, role: user/assistant/system, content, created_at)
- RLS: анонимные пользователи могут создавать сессии и сообщения, админы видят все
- Realtime включён для обеих таблиц (чтобы админ видел новые сообщения)

**2. Edge-функция `chat-assistant`**
- Принимает session_id + сообщение пользователя
- Загружает из БД все товары и категории как контекст для ИИ
- Загружает историю переписки из chat_messages
- Вызывает Lovable AI (gemini-3-flash-preview) с системным промптом:
  - "Ты консультант мастерской К.АЯ из г. Дмитров. Помогаешь выбрать изделия из натуральной кожи, подобрать размер, кастомизировать (фурнитура, цвет кожи). Можешь рассчитать стоимость. Когда клиент готов — оформляешь заявку."
- При согласии на покупку: создаёт запись в orders + order_items
- При запросе оператора: обновляет session.status = 'ticket'
- Возвращает ответ ИИ, сохраняет в chat_messages

**3. Виджет чата — компонент `ChatWidget.tsx`**
- Кнопка в правом нижнем углу (иконка бота, золотой акцент)
- При открытии: форма ввода имени + телефона + чекбокс "Согласен с политикой конфиденциальности"
- После заполнения: чат-интерфейс с историей сообщений, потоковой передачей ответов
- Рендер markdown в ответах ИИ (react-markdown)
- Кнопка "Позвать оператора"
- Скрывается на страницах /admin

**4. Вкладка "Чаты" в админке**
- Новая вкладка в Admin.tsx рядом с Заявки/Товары/Категории
- Список всех сессий (имя, телефон, статус, дата)
- Бейдж для тикетов (запрос оператора)
- При клике — просмотр переписки
- Возможность ответить от имени оператора (role: assistant, но помечено)

### Технические детали

**Миграция БД:**
```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, ticket, closed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL, -- user, assistant, system
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS + realtime
```

**Новые файлы:**
- `supabase/functions/chat-assistant/index.ts` — edge-функция
- `src/components/ChatWidget.tsx` — виджет чата
- `src/components/admin/ChatsTab.tsx` — вкладка чатов в админке

**Изменяемые файлы:**
- `src/App.tsx` — добавить ChatWidget в Layout
- `src/pages/Admin.tsx` — добавить вкладку Чаты
- `src/components/Layout.tsx` — подключить ChatWidget

