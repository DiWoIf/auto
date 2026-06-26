# Авто•Майстер — Online Booking Site

Сайт запису на автосервіс. 3-кроковий wizard: послуга → дата/час → форма.  
Дві мови: `index.html` (UA) + `index.de.html` (DE).

---

## Структура файлів

```
auto-service/
├── index.html              ← Українська версія
├── index.de.html           ← Німецька версія
├── css/
│   └── style.css           ← Всі стилі
├── js/
│   └── main.js             ← Логіка wizard + Cal.com
├── netlify/
│   └── functions/
│       └── create-booking.js  ← Netlify Function → Cal.com API v2
└── netlify.toml            ← Конфіг деплою
```

---

## Налаштування

### 1. Cal.com

1. Заходиш на [cal.com](https://cal.com) → Settings → API Keys → створюєш ключ
2. Створюєш event type зі slug `auto-service` (або своїм)
3. В `js/main.js` замінюєш:

```js
const CONFIG = {
  calUsername: 'YOUR_CAL_USERNAME',   // твій username на cal.com
  calEventSlug: 'auto-service',       // slug event type
  ...
};
```

### 2. Netlify — змінні середовища

Налаштовуєш у Netlify → Site → Environment Variables:

| Ключ | Значення |
|------|---------|
| `CAL_API_KEY` | твій Cal.com API key |
| `CAL_USERNAME` | твій Cal.com username |
| `CAL_EVENT_SLUG` | `auto-service` (або твій slug) |

### 3. Деплой на Netlify

**Варіант A — через GitHub (рекомендується):**
1. Пушиш папку в GitHub репо
2. Netlify → Add new site → Import from Git
3. Build command: *(порожньо)*
4. Publish directory: `.`

**Варіант B — Netlify CLI:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

---

## Як працює Cal.com інтеграція

### Режим 1 (за замовчуванням): посилання
Після заповнення форми — відкривається Cal.com URL з префіл-параметрами (ім'я, телефон, нотатки). Клієнт підтверджує запис сам на Cal.com.

### Режим 2: API (повна автоматизація)
Netlify Function `create-booking.js` викликає Cal.com API v2 безпосередньо — запис створюється без переходу на cal.com.

Щоб увімкнути режим 2, в `js/main.js` в функції `handleSubmit()` розкоментуй:

```js
// await submitViaNetlifyFunction();
```

і закоментуй `showSuccess(calUrl)` → замість нього виклик після успішного API.

---

## Послуги та ціни

Редагуєш масив `window.SERVICES` прямо в HTML:

```js
// index.html (UA)
window.SERVICES = [
  {
    id: 'oil',
    name: 'Заміна масла та фільтрів',
    desc: '...',
    duration: '30 хв',
    price: '1 500 грн',
  },
  ...
];
```

Аналогічно в `index.de.html` для DE версії.

---

## Робочий час (слоти)

В `js/main.js`:

```js
const CONFIG = {
  workStart: 9,          // від 09:00
  workEnd: 18,           // до 18:00
  workDays: [1,2,3,4,5,6],  // Пн–Сб (0=Нд)
  slotInterval: 60,      // кожну годину
};
```
