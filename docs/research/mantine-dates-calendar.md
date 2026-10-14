# Mantine 9 `@mantine/dates`: календарь записи

Исследование к issue #14 (карта wayfinder). Версии в проекте: `@mantine/dates@9.7.2`,
`dayjs@1.11.23` (`client/package.json`). Все ссылки на исходники даны по пакету,
установленному в `client/node_modules/@mantine/dates`; в репозитории Mantine те же
файлы лежат в `packages/@mantine/dates/src/…`.

## Краткий ответ

Почти всё нужное есть из коробки. `Calendar` — это и есть «голый» месячный календарь
с шапкой `← месяц →`, но **без логики выбора даты**: выбор дня держите вы сами через
`getDayProps`. `DatePicker` — то же плюс готовый выбор (`value`/`onChange`/`type`).
Окно в 14 дней и запрет выбора вне него закрываются парой `minDate`/`maxDate`; они же
**автоматически** гасят кнопки `←`/`→` на границах окна. Кастомная подпись дня
(«18 св.») — это `renderDay`, он **полностью заменяет** содержимое кнопки дня.
Локаль `ru` и понедельник первым днём — `DatesProvider` + импорт `dayjs/locale/ru`
(понедельник и так дефолт). Руками писать придётся только сами данные: счётчик свободных
слотов по дню, список слотов справа и связку «выбранный день → запрос слотов».

## Что доступно из коробки

### Компоненты

Все экспортируются из `@mantine/dates` (`client/node_modules/@mantine/dates/lib/index.d.ts`):

| Компонент | Что делает | Когда брать |
| --- | --- | --- |
| `Calendar` | Месяц + шапка, **без** состояния выбора | Нужен свой сценарий выбора (наш случай) |
| `DatePicker` | Инлайн-календарь с выбором (`value`/`onChange`) | Нужен стандартный выбор одной/нескольких дат |
| `Month`, `MonthLevel`, `MonthLevelGroup` | Низкоуровневая сетка месяца / месяц с шапкой / группа месяцев | Нужен полный контроль над шапкой |
| `MiniCalendar` | Компактная сетка месяца | Не для нашей панели |
| `Day`, `CalendarHeader` | Атомы для своих сборок | Редко |

Docs: <https://mantine.dev/dates/calendar/>, <https://mantine.dev/dates/date-picker/>;
исходники: `lib/components/Calendar/Calendar.d.ts`, `lib/components/Day/Day.d.ts`.

### Рендер месяца и навигация `←`/`→`

- `Calendar` по умолчанию рисует уровень `month` с `CalendarHeader`; кнопки переключают
  месяц (`handleNextMonth`/`handlePreviousMonth`): `esm/components/Calendar/Calendar.mjs:64-73,147-187`.
- `headerControlsOrder` — порядок контролов, по умолчанию `['previous', 'level', 'next']`
  (`CalendarHeader.d.ts`).
- `nextIcon` / `previousIcon`, `nextLabel` / `previousLabel` (aria), `ariaLabels` — тексты и иконки.
- `numberOfColumns`, `columnsToScroll`, `fullWidth`, `withCellSpacing`, `withWeekNumbers`,
  `highlightToday` — раскладка.
- `monthLabelFormat` — формат заголовка, по умолчанию `"MMMM YYYY"`
  (`esm/components/MonthLevel/MonthLevel.mjs:9`).
- `maxLevel` / `minLevel` — до какого уровня подниматься по клику на заголовок.
  При `maxLevel="month"` кнопка «на уровень выше» скрывается: `hasNextLevel: maxLevel !== 'month'`
  (`esm/components/Calendar/Calendar.mjs:162`).

### Кастомный рендер дня

- `renderDay?: (date: DateStringValue) => React.ReactNode` — тип `RenderDay`
  (`lib/components/Day/Day.d.ts:3,31`).
- **Важно:** возвращаемое значение целиком становится содержимым кнопки дня:
  `children: renderDay?.(date) || dayjs(date).date()` (`esm/components/Day/Day.mjs:43`).
  То есть число дня нужно нарисовать самому — базовое «18» не подставляется.
- `getDayProps?: (date) => Omit<Partial<DayProps>, 'vars' | 'classNames' | 'styles'> & DataAttributes`
  (`lib/components/Month/Month.d.ts`) — пофакторные пропы на `Day`: `selected`, `disabled`,
  `className`, `style`, любые атрибуты `<button>` (`onClick`, `data-*`, `aria-label`).
  Возвращаемые пропы накладываются **после** внутреннего `disabled`
  (`esm/components/Month/Month.mjs:68-89`), поэтому ваш `disabled` перебивает `minDate`/`maxDate`.
- Готовые примеры — `Indicator` на нужном дне: <https://mantine.dev/dates/calendar/>,
  <https://mantine.dev/dates/date-picker/#render-day-function>.

### Окно 14 дней: запрет выбора и навигации

- `minDate` / `maxDate`: `DateStringValue | Date` (`YYYY-MM-DD` или `Date`). Дни вне окна
  становятся `disabled` (`esm/components/Month/Month.mjs:85`).
- `excludeDate?: (date) => boolean` — произвольный запрет дня (например, день без слотов).
- **Навигация гасится автоматически**: `MonthLevel` сам считает
  `_nextDisabled`/`_previousDisabled` из `maxDate`/`minDate`
  (`esm/components/MonthLevel/MonthLevel.mjs:21-22`):
  ```js
  const _nextDisabled = maxDate ? !dayjs(month).endOf('month').isBefore(maxDate) : false;
  const _previousDisabled = minDate ? !dayjs(month).startOf('month').isAfter(minDate) : false;
  ```
  Документация подтверждает: «If the previous/next page is not available, then the
  corresponding control will be disabled» (<https://mantine.dev/dates/date-picker/#min-and-max-date>).
- Вывод для окна `[today, today+13]`: `minDate={today}` гасит `←`, `maxDate={today+13}`
  гасит `→` на первом же месяце за окном. Специально ограничивать месяцы не нужно.

### Локаль `ru` и первый день недели — понедельник

- Локали в Mantine нет — это dayjs. Обязателен импорт `import 'dayjs/locale/ru'`
  (<https://mantine.dev/dates/getting-started/#datesprovider>).
- `DatesProvider` (`import { DatesProvider } from '@mantine/dates'`) принимает
  `settings={{ locale, firstDayOfWeek, weekendDays, consistentWeeks }}`:
  - `locale` — по умолчанию `'en'`; для русского `settings={{ locale: 'ru' }}`
    либо проп `locale="ru"` на компоненте (`ControlsGroupSettings.d.ts`,
    <https://mantine.dev/dates/date-picker/#localization>).
  - `firstDayOfWeek` — **дефолт уже `1` (понедельник)**, менять не нужно
    (`DATES_PROVIDER_DEFAULT_SETTINGS`, `esm/components/DatesProvider/DatesProvider.mjs`).
  - `weekendDays` — дефолт `[0, 6]`.
- Приоритет: проп компонента важнее `DatesProvider` (`getFirstDayOfWeek` в
  `esm/components/DatesProvider/use-dates-context.mjs`).
- Подписи дней недели — `weekdayFormat`, дефолт `'dd'` → для `ru` и понедельника
  «пн вт ср чт пт сб вс» (`esm/components/WeekdaysRow/get-weekdays-names/get-weekdays-names.mjs`).
  `weekdayFormat` (и прочие форматтеры) принимают функцию — тогда можно обойтись
  `Intl.DateTimeFormat` без импорта локали dayjs
  (<https://mantine.dev/dates/getting-started/#formatting-without-dayjs>).
- Заголовок месяца `monthLabelFormat="MMMM YYYY"` под `ru` даст «октябрь 2026».

### Отключение прошедших дат

- `minDate={dayjs().format('YYYY-MM-DD')}` (или `new Date()`) — прошедшие дни `disabled`.
- Либо `excludeDate={(date) => dayjs(date).isBefore(dayjs(), 'day')}`.
- `disabled` из `getDayProps` тоже работает и перебивает оба варианта.

### Стилизация дня

- Styles API селекторы: `day`, `monthCell`, `weekday`, `weekdaysRow`, `monthRow`,
  `calendarHeader`, `calendarHeaderControl`, `calendarHeaderLevel`, …
  (`Calendar.d.ts:9`, таблица Styles API на <https://mantine.dev/dates/calendar/>).
  `classNames={{ day: classes.day }}` / `styles={{ day: {...} }}`.
- На `Day` есть data-атрибуты для CSS: `data-selected`, `data-disabled`, `data-weekend`,
  `data-outside`, `data-today`, `data-highlight-today` (`esm/components/Day/Day.mjs:29-40`).
  Годятся для подсветки дней со свободными слотами (например, `data-slots` через `getDayProps`).
- Обязателен `import '@mantine/dates/styles.css'` — уже сделан в
  `client/src/app/providers/Providers.tsx:9`.

### Выбор даты (если брать `DatePicker`, а не `Calendar`)

- `DatePicker` включает `value` / `defaultValue` / `onChange`, `type: 'default' | 'multiple' | 'range'`,
  `allowDeselect`, `presets` (`lib/components/DatePicker/DatePicker.d.ts`).
- Ваш `getDayProps` подмешивается **после** внутренней логики выбора, то есть перебивает
  `selected`: `getDayProps: (date) => ({ ...getControlProps(date), ...calendarProps.getDayProps?.(date) })`
  (`esm/components/DatePicker/DatePicker.mjs:75-78`).
- `Calendar` же выбор не трогает — держите `useState` и отдавайте через `getDayProps`:
  <https://mantine.dev/dates/calendar/#custom-date-pickers>.

## Что придётся делать руками

1. **Счётчик свободных слотов «18 св.»** — из коробки нет. Считаете по своему API и рисуете
   в `renderDay`. Обязательно продублировать число дня (см. выше): `renderDay` заменяет его.
2. **Запрет дней без слотов** — поверх `minDate`/`maxDate` через `excludeDate` или `disabled`
   в `getDayProps`.
3. **Подсветка «есть свободное»** — ваш класс/`data-*` через `getDayProps`, CSS в `classNames.day`.
4. **Панель «Информация» и список слотов «09:00–09:30 … Свободно/Занято»** — чистая вёрстка
   (`@mantine/core`), календарь сюда не причастен.
5. **Состояние выбранного дня** — если на `Calendar`, то сами (`useState` + `getDayProps.selected`);
   на `DatePicker` — из `value`/`onChange`.
6. **Связка «выбранный день → загрузка слотов»** — ваш код (react-query/fetch, слой `shared`).

## Риски и неочевидности

- **`renderDay` заменяет число дня.** Самый частый сюрприз: вернули «18 св.» — число «18»
  исчезло, пока не нарисуете его сами. Источник: `esm/components/Day/Day.mjs:43`.
- **`nextDisabled`/`previousDisabled` нельзя передать в `Calendar`/`DatePicker`.**
  `CalendarSettings` явно их исключает (`Omit<…, 'nextDisabled' | 'previousDisabled' | …>`,
  `lib/components/Calendar/Calendar.d.ts:20`), и в таблице пропов их нет
  (<https://mantine.dev/dates/calendar/>). Единственный «из коробки» способ ограничить
  навигацию — `minDate`/`maxDate` (см. авто-логику выше). Хотите булевы флаги вручную —
  берите `MonthLevel` напрямую или контролируйте `date`/`onDateChange`.
  _Неоднозначность документации:_ на странице Calendar есть раздел «Calendar.Header props»
  с `nextDisabled`/`previousDisabled`, но это пропы внутреннего `CalendarHeader`, а не
  пропы `<Calendar>`; в таблице пропов самого `Calendar` их нет.
- **Даты — строки `YYYY-MM-DD`, без таймзоны.** `new Date('2026-10-14')` парсится как UTC,
  поэтому день недели лучше брать через `dayjs(date)`. Сама документация об этом
  предупреждает (<https://mantine.dev/dates/getting-started/#formatting-without-dayjs>),
  но при этом её пример `excludeDate` использует `new Date(date).getDay()` — так делать не стоит.
- **Ошибка в примере документации по `aria-label`.** На
  <https://mantine.dev/dates/date-picker/#year-month-control-aria-label> используется
  `date.getMonth()` / `date.getDate()` / `date.getFullYear()` на `date`, хотя `date` — строка.
  Для aria используйте `getDayAriaLabel={(date) => …}` или `getDayProps(() => ({ 'aria-label': … }))`
  с `dayjs(date)`.
- **`getDayProps` перебивает `disabled` из `minDate`/`maxDate`** (`esm/components/Month/Month.mjs:85-89`).
  Удобно, но легко случайно «включить» день вне окна.
- **Дни соседних месяцев остаются выделяемыми.** По умолчанию они видны и кликабельны;
  `hideOutsideDates` их прячет, а `DatePicker` включает его сам при `numberOfColumns !== 1`
  (`esm/components/DatePicker/DatePicker.mjs:87`). Для окна 14 дней лучше явно
  `hideOutsideDates`, если хотим только текущий месяц.
- **`DatesProvider` ≠ `MantineProvider`.** Это отдельный провайдер из `@mantine/dates`;
  в проекте он пока не подключён (`client/src/app/providers/Providers.tsx`). Место для него —
  там же, рядом с `MantineProvider`. Импорт `dayjs/locale/ru` обязателен и в тестах (Vitest/jsdom).
- **Сдвиг раскладки** между 4/5/6 неделями — `consistentWeeks: true` в `DatesProvider`.
- **`defaultDate` игнорируется, если задан `date`** (контролируемый показ месяца).
  Начальный месяц окна при `date` отсутствует Mantine берёт из `getDefaultClampedDate`
  (`esm/components/Calendar/Calendar.mjs:59-63`), то есть поджимает «сегодня» к окну.
- **Уровни вверх.** Если не задать `maxLevel="month"`, клик по заголовку уводит на год/десятилетие.
  Для «жёсткого» месячного календаря ставьте `maxLevel="month"` (`Calendar.mjs:162,198`).
- **`MiniCalendar`** решает другую задачу (компактная сетка, обычно точки-события), а не панель
  с навигацией и подписью под днём — для записи берём `Calendar`/`DatePicker`.

## Набросок под наш интерфейс

```tsx
import 'dayjs/locale/ru'
import dayjs from 'dayjs'
import { DatesProvider, Calendar } from '@mantine/dates'

const today = dayjs()
const minDate = today.format('YYYY-MM-DD')
const maxDate = today.add(13, 'day').format('YYYY-MM-DD')

// freeSlots: Record<string, number> — приходит из API
function BookingCalendar({ freeSlots }: { freeSlots: Record<string, number> }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <DatesProvider settings={{ locale: 'ru' }}> {/* firstDayOfWeek: 1 — дефолт */}
      <Calendar
        defaultDate={minDate}
        minDate={minDate}   // гасит ← и запрещает прошедшее
        maxDate={maxDate}   // гасит → за окном
        maxLevel="month"    // не пускать на год/десятилетие
        highlightToday
        getDayProps={(date) => ({
          selected: date === selected,
          disabled: !freeSlots[date],           // день без слотов
          onClick: () => setSelected(date),
        })}
        renderDay={(date) => {
          const count = freeSlots[date] ?? 0
          return (
            <>
              <div>{dayjs(date).date()}</div>   {/* число рисуем сами */}
              {count > 0 && <div>{count} св.</div>}
            </>
          )
        }}
      />
    </DatesProvider>
  )
}
```

## Источники

Официальная документация Mantine 9:

- Calendar: <https://mantine.dev/dates/calendar/> · LLM-версия: <https://mantine.dev/llms/dates-calendar.md>
- DatePicker: <https://mantine.dev/dates/date-picker/> · LLM-версия: <https://mantine.dev/llms/dates-date-picker.md>
- Getting started (DatesProvider, dayjs, локали, форматтеры):
  <https://mantine.dev/dates/getting-started/> · <https://mantine.dev/llms/dates-getting-started.md>
- dayjs форматы: <https://day.js.org/docs/en/display/format>

Исходники `@mantine/dates@9.7.2` (в проекте — `client/node_modules/@mantine/dates`,
в апстриме — `packages/@mantine/dates/src/…`):

- `esm/components/Calendar/Calendar.mjs:59-73,147-187` — уровень месяц, `onNext/onPrevious`,
  `hasNextLevel`, `getDefaultClampedDate`.
- `esm/components/Calendar/Calendar.mjs:162,198` — `hasNextLevel` от `maxLevel`.
- `lib/components/Calendar/Calendar.d.ts:20` — `Omit<…, 'nextDisabled' | 'previousDisabled' | …>`.
- `esm/components/MonthLevel/MonthLevel.mjs:21-22` — авто-`_nextDisabled`/`_previousDisabled` из `maxDate`/`minDate`.
- `esm/components/Month/Month.mjs:85-89` — `disabled` из `excludeDate`/`minDate`/`maxDate`,
  порядок наложения `getDayProps`.
- `esm/components/Day/Day.mjs:43` — `renderDay?.(date) || dayjs(date).date()`.
- `lib/components/Day/Day.d.ts:3,31` — тип `RenderDay`, проп `renderDay`.
- `esm/components/DatesProvider/DatesProvider.mjs` — дефолты `locale: 'en'`, `firstDayOfWeek: 1`, `weekendDays: [0,6]`.
- `esm/components/DatesProvider/use-dates-context.mjs` — приоритет пропа над провайдером.
- `esm/components/WeekdaysRow/get-weekdays-names/get-weekdays-names.mjs` — `weekdayFormat` дефолт `'dd'`.
- `lib/components/Month/Month.d.ts` — `getDayProps`, `excludeDate`, `minDate`, `maxDate`, `renderDay`.
- `lib/components/DatePicker/DatePicker.d.ts` и `esm/components/DatePicker/DatePicker.mjs:75-78` — выбор даты и наложение `getDayProps`.
