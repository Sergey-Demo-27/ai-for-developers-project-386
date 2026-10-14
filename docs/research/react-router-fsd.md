# react-router в FSD-структуре

Тикет: #15 · Ветка: `research/react-router-fsd` · Проверено: 14 октября 2026.
Все версии и ограничения ниже сверены с первоисточниками (см. «Источники»).

## Краткий ответ

- Ставим **`react-router@^8.4.0`** — это актуальная мажорная версия (npm `dist-tag`
  `latest` = `8.4.0`). Пакет `react-router-dom` в v8 **удалён**: DOM-специфичные API
  импортируются из `react-router/dom`, всё остальное — из `react-router`.
- Режим — **Declarative** (`<BrowserRouter>`), самый простой из трёх. Data и Framework
  режимы добавляют возможности, но и забирают контроль; для SPA с собственным API-клиентом
  Declarative достаточно, а Data-режим остаётся аддитивным апгрейдом на будущее.
- Роутер живёт в **`client/src/app/routes/`** — это отдельный срез уровня `app`
  (сегмент `routes` прямо назван в спецификации FSD как место конфигурации роутера).
  В `app/providers` роутер не кладём: там провайдеры контекста (Mantine и т.п.).
- Страницы подключаются через свой публичный API: `import { LandingPage } from '../../pages/landing'`.
- Layout — это **layout-маршрут без `path`** с `<Outlet/>`: шапка `widgets/header` остаётся
  на месте, а меняющийся контент приходит в outlet. Сам layout держим в `app/routes`,
  а не в `widgets/`, чтобы не нарушить правило импортов FSD (см. ниже).
- В `App.tsx` меняется суть: он перестаёт склеивать `Header + LandingPage` вручную и
  уступает место `AppLayout` (`Header + <Outlet/>`) и `AppRouter`.

## Версия и режим

### Какая версия актуальна

| Пакет             | `latest` в npm | Замечание                                                                 |
| ----------------- | -------------- | ------------------------------------------------------------------------- |
| `react-router`    | **8.4.0**      | актуальная мажорная линия                                                |
| `react-router-dom`| 7.18.4         | застрял на v7; в v8 этот re-export-пакет удалён — не ставим его          |

Требования `react-router@8.4.0` (из метаданных npm-пакета и гайда по обновлению):

- `node >= 22.22.0` — у нас `engines.node >= 24`, ок;
- `react` / `react-dom >= 19.2.7` — у нас `^19.2.8`, ок;
- Framework-режим дополнительно требует `vite@7+`; Declarative/Data от версии Vite не зависят.

Установка (в `client/`):

```sh
npm i react-router@^8.4.0
```

### Три режима

React Router — «multi-strategy router»: режим определяется тем, какой top-level API
используется, и возможности **аддитивны** (Declarative → Data → Framework).

- **Declarative** — `<BrowserRouter>` вокруг приложения, маршруты через `<Routes>/<Route>`.
  Даёт `<Link>`, `useNavigate`, `useLocation`, активные состояния `NavLink`.
- **Data** — `createBrowserRouter(...)` + `<RouterProvider>` (импорт из `react-router/dom`).
  Добавляет `loader`/`action`, pending-состояния (`useNavigation`), error boundaries.
  Роутер создаётся **вне React-дерева** и не хранится в состоянии React.
- **Framework** — Vite-плагин `@react-router/dev`, файловые маршруты (`app/routes.ts`),
  Route Module API, SSR/SSG/SPA.

**Рекомендация: Declarative.** Обоснование под этот проект:

1. Клиент — чистый SPA (Vite + `index.html`), без SSR/SSG; Framework-режим не нужен.
2. Framework-режим навязывает собственные файловые конвенции маршрутов и Vite-плагин;
   его `app/` живёт рядом с FSD-слоем `client/src/app` и спорит с ним. Для FSD это лишний
   слой трения.
3. Загрузка данных у нас и так уезжает в `shared/api` и срезы страниц, поэтому `loader`
   из Data-режима не даёт выигрыша, а переносит оркестрацию данных вверх, в `app/routes`.
4. Возможности аддитивны: если понадобятся route-level `loader`/`action`/error boundary,
   Data-режим подключается позже точечно (заменой `<BrowserRouter>` на `RouterProvider`).

## Куда класть роутер в FSD

Спецификация FSD перечисляет сегмент **`routes` — the router configuration** именно
на уровне **App** (там же `store`, `styles`, `entrypoint`). Отдельно в слое `shared`
есть сегмент **`routes` — route constants or patterns for matching routes**. И ещё:
«keep router-level and server-level logic on the App layer» (из описания слоя Processes).

Отсюда раскладка:

```
client/src/app/routes/          # срез уровня app — только конфигурация роутинга
├── AppRouter.tsx               # <BrowserRouter><AppRoutes/></BrowserRouter>
├── AppRoutes.tsx               # само дерево <Routes> (тестируется под MemoryRouter)
├── AppLayout.tsx               # layout-маршрут: <Header/> + <Outlet/>
└── index.ts                    # public API среза: export { AppRouter }
```

Почему так, а не иначе:

- **Не `app/providers`.** `providers` — это провайдеры контекста (в проекте там Mantine).
  Формально `BrowserRouter` тоже провайдер, но FSD закрепляет имя `routes` за конфигурацией
  роутера, а смешивание роутинга с темой/модалками размывает назначение сегмента.
- **`app/routes`, а не `app/router`.** `routes` — задокументированное имя сегмента;
  `router` был бы самодельным синонимом того же самого.
- **Layout — в `app`, а не в `widgets`.** FSD разрешает хранить page-layouts на слое
  Widgets, но у нас layout должен импортировать `widgets/header`. Импорт среза одного
  слоя из среза того же слоя запрещён правилом слоёв (`widgets/layout` → `widgets/header`
  — cross-import на одном уровне). Уровень App — верхний, ему можно импортировать
  и `widgets/header`, и `pages/*`.
- **Константы путей — в `shared/routes`.** Ссылки на `/booking` нужны сразу в двух местах
  ниже App: `widgets/header` и `pages/landing/ui/Hero`. Эти слои не могут импортировать
  из `app/routes` (импорт только вниз), поэтому общий источник истины для путей — `shared`:

  ```ts
  // client/src/shared/routes/index.ts
  export const routes = {
    landing: '/',
    booking: '/booking',
    events: '/events',
  } as const
  ```

  Слой `shared` в проекте пока пуст; это его первый срез — допустимо, слои появляются
  по мере надобности.

## Как страницы подключаются через public API

Каждый срез страницы экспортирует свой компонент из `index.ts` (у `pages/landing` это
уже так):

```ts
// client/src/pages/landing/index.ts
export { LandingPage } from './ui/LandingPage'

// client/src/pages/booking/index.ts  (новый срез)
export { BookingPage } from './ui/BookingPage'

// client/src/pages/events/index.ts   (новый срез)
export { EventsPage } from './ui/EventsPage'
```

Роутер (уровень `app`) импортирует страницы по публичному API — это импорт сверху вниз,
правилом FSD разрешён:

```tsx
// client/src/app/routes/AppRoutes.tsx
import { Route, Routes } from 'react-router'
import { BookingPage } from '../../pages/booking'
import { EventsPage } from '../../pages/events'
import { LandingPage } from '../../pages/landing'
import { AppLayout } from './AppLayout'

// Дерево маршрутов без BrowserRouter — его удобно тестировать под MemoryRouter.
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
    </Routes>
  )
}
```

```tsx
// client/src/app/routes/AppRouter.tsx
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

```ts
// client/src/app/routes/index.ts — public API среза (только компоненты, без `export *`)
export { AppRouter } from './AppRouter'
```

Правила, которые здесь соблюдены:

- страницы не знают о роутере как о срезе — они импортируют лишь примитивы
  (`Link`, `useNavigate`) из пакета `react-router`, а не из `app/routes`;
- `index.ts` экспортирует точечно, без `export *` (рекомендация FSD про public API);
- `index.ts` не смешивает компоненты и константы — иначе `react/only-export-components`
  в oxlint может ругаться, а Vite Fast Refresh — терять состояние.

## Layout с существующим `widgets/header`

Layout — это маршрут **без `path`**: он не добавляет сегментов в URL, а только оборачивает
дочерние маршруты. Дочерние рендерятся в `<Outlet/>`.

```tsx
// client/src/app/routes/AppLayout.tsx
import { Box } from '@mantine/core'
import { Outlet } from 'react-router'
import { Header } from '../../widgets/header'

// Общая рамка приложения: шапка остаётся, контент страницы приходит в outlet.
export function AppLayout() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Outlet />
    </Box>
  )
}
```

`widgets/header` при этом меняет только способ навигации: `Anchor href` → `Link`/`NavLink`
из `react-router`, чтобы не было полной перезагрузки страницы.

```tsx
// client/src/widgets/header/ui/Header.tsx — было / стало
import { Anchor, Box, Container, Group } from '@mantine/core'
import { Link, NavLink } from 'react-router'
import { routes } from '../../../shared/routes'
import { Logo } from './Logo'

<Anchor component={Link} to={routes.landing} /* ... */>
  <Logo />
  Calendar
</Anchor>

<Group component="nav" gap="xl">
  <Anchor component={NavLink} to={routes.booking} /* ... */>
    Записаться
  </Anchor>
  <Anchor component={NavLink} to={routes.events} /* ... */>
    Предстоящие события
  </Anchor>
</Group>
```

`NavLink` дополнительно проставляет `aria-current="page"` активной ссылке — это улучшает
доступность бесплатно. Mantine-компоненты полиморфны: `component` принимает любой
компонент, и официальный пример Mantine (`<Anchor component={Link} href="/" />`)
подтверждает приём — только для react-router `Link` вместо `href` передаём `to`.

Аналогично `Hero` (кнопка «Записаться»): `component="a" href="/booking"` →
`component={Link} to={routes.booking}`.

## Минимальный диф к `App.tsx`

Сейчас `App.tsx` вручную склеивает шапку и главную страницу:

```tsx
// client/src/app/App.tsx — БЫЛО
export function App() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <LandingPage />
    </Box>
  )
}
```

Что меняется:

1. **`app/App.tsx` удаляется.** Его роль (`Box` + `Header`) переезжает в
   `app/routes/AppLayout.tsx`, а `LandingPage` заменяется на `<Outlet/>` (см. выше).
2. **Появляются `app/routes/AppLayout.tsx`, `AppRoutes.tsx`, `AppRouter.tsx`, `index.ts`.**
3. **`client/src/main.tsx`** рендерит роутер вместо `App`:

   ```tsx
   // было: import { App } from './app/App'
   import { AppRouter } from './app/routes'

   // было: <App /> — стало:
   <AppRouter />
   ```

4. **`app/App.test.tsx`** переезжает в `app/routes/AppRoutes.test.tsx` и рендерит
   `<AppRoutes/>` под `MemoryRouter` (см. раздел про тесты).
5. **`widgets/header/ui/Header.tsx`** и **`pages/landing/ui/Hero.tsx`** переводят ссылки
   с `href` на `to` через `component={Link}`.

Никакого слоя-посредника не нужно: `App.tsx` был ровно той самой композицией, которую
теперь выполняет layout-маршрут; при первом реальном маршруте (`/booking`) он уступает
место роутеру — как и было задумано в комментарии к `App.tsx`.

## Как это тестировать в Vitest

### Общая обёртка

`Link`/`NavLink`/хуки роутера **требуют контекста роутера** — иначе падают с ошибкой вида
`useHref() may be used only in the context of a <Router> component`. Поэтому helpers для
тестов оборачиваем в `MemoryRouter` (`MemoryRouter` — declarative-роутер, хранящий историю
в памяти, с props `initialEntries` / `initialIndex`):

```tsx
// client/src/test/render.tsx — было / стало
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { theme } from '../app/providers'

// Обёртка для тестов: MantineProvider + контекст роутера.
export function renderWithProviders(ui: ReactElement, route = '/') {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MantineProvider>,
  )
}
```

### Тесты роутинга и навигации

Отделяем `AppRoutes` (без `BrowserRouter`) от `AppRouter` именно ради тестов: под
`MemoryRouter` можно задать стартовый URL и проверить, что отрисовалась нужная страница,
и что по клику происходит клиентский переход.

```tsx
// client/src/app/routes/AppRoutes.test.tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from './AppRoutes'

it('по /booking отрисовывает страницу записи', () => {
  renderWithProviders(
    <MemoryRouter initialEntries={['/booking']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Запись' })).toBeInTheDocument()
})

it('переходит на /booking по кнопке в шапке', async () => {
  renderWithProviders(
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getAllByRole('link', { name: 'Записаться' })[0])
  expect(await screen.findByRole('heading', { name: 'Запись' })).toBeInTheDocument()
})
```

Существующие проверки `toHaveAttribute('href', '/booking')` продолжат работать: `Link`
рендерит обычный `<a href="...">`, а `MemoryRouter` даёт нужный контекст. То есть сами
ассершены менять не нужно — меняется только обёртка рендера.

### Если позже перейдём на Data-режим

- `createMemoryRouter(routes, { initialEntries: ['/booking'] })` + `<RouterProvider>`
  (импорт из `react-router/dom`) — для интеграционных тестов с `loader`/`action`.
- `createRoutesStub([...])` — точечный unit-тест компонента, которому нужен контекст
  роутера (`useLoaderData`, `useActionData`, `<Link>`), без поднятия всего дерева.
  Доступно только в Data/Framework-режимах, не в Declarative.

## Риски и неочевидности

1. **`react-router-dom` не ставить.** В v8 он удалён; DOM-API (`RouterProvider`) — из
   `react-router/dom`, всё остальное — из `react-router`. Лишний пакет из v7 либо потянет
   вторую копию React Router, либо не установится.
2. **Минимальные версии.** `react-router@8` требует `node >= 22.22` и `react >= 19.2.7`
   (проект проходит). Но это ужесточение надо учесть в CI.
3. **Framework-режим конфликтует с FSD.** Его файловые маршруты и Vite-плагин живут по
   своим конвенциям и требуют `vite@7+`; для нашего `client/src/app` это лишний слой.
   Поэтому Declarative, а не Framework.
4. **Каждый компонент со ссылкой теперь требует контекста роутера в тестах.** `Header.test.tsx`,
   `Hero.test.tsx` и т.п. упадут без `MemoryRouter` — отсюда правка `test/render.tsx`.
5. **Полиморфизм Mantine при `component={Link}`.** Тип `AnchorProps` не расширяет props
   дефолтного `<a>`, поэтому проп должен быть `to`, а не `href`. Отдельно: у Mantine есть
   **свой** компонент `NavLink` (пункт меню) — не путать с react-router `NavLink`;
   и если передавать в react-router `NavLink` рендер-проп `className`, его надо согласовать
   со стилями Mantine `Anchor`, иначе легко потерять активное состояние.
6. **Layout нельзя положить в `widgets/` без нарушения FSD.** Срез `widgets/layout`,
   импортирующий `widgets/header`, — это cross-import на одном слое, запрещённый
   правилом слоёв. Держим layout в `app/routes`.
7. **Константы путей — в `shared/routes`.** `widgets/header` и `pages/landing` не могут
   импортировать из `app/routes` (импорт только вниз по слоям), а дублировать строки
   `/booking` и `/events` по коду не хочется.
8. **SPA-fallback для «глубоких» URL.** Vite в dev и preview отдаёт `index.html` на
   неизвестные пути (`appType: 'spa'`, значение по умолчанию), так что `/booking` при
   перезагрузке и preview работают. А вот статический хостинг продакшена понадобится
   настроить на rewrite всех путей на `index.html`.
9. **Data-роутер вне React-состояния.** Если позже включим Data-режим, `createBrowserRouter`
   создаётся один раз вне React-дерева и передаётся в `RouterProvider`; в `useState` его
   держать нельзя.
10. **Импорт `Link` из пакета vs из `shared`.** FSD относит сторонние библиотеки к слою
    `shared`, но на практике примитивы (`Link`, `useNavigate`) в проектах FSD импортируют
    напрямую из `react-router`. Оборачивать их в свой `shared/ui` имеет смысл, только если
    появится реальная причина (замена библиотеки, добавочная логика) — иначе это лишний слой.
11. **`react/only-export-components` в oxlint.** Не стоит экспортировать из одного файла
    и компонент, и массив маршрутов/константы: правило (включено у нас как `warn`) может
    ругаться, а Fast Refresh терять состояние. Поэтому `routes`-константы — в `shared`,
    а `AppRoutes.tsx`/`AppLayout.tsx` экспортируют только компоненты.
12. **`verbatimModuleSyntax`.** В `tsconfig.app.json` включён; типы импортируем как
    `import type { ... }`, иначе сборка `tsc -b` ругнётся.

## Источники

Первоисточники, по которым сверялись версии, режимы, API и требования.

React Router (официальный сайт и API-справка):

- Home — https://reactrouter.com/home
- Picking a Mode — https://reactrouter.com/start/modes
- Declarative: Installation — https://reactrouter.com/start/declarative/installation
- Declarative: Routing (layout routes, index routes, nested routes) —
  https://reactrouter.com/start/declarative/routing
- Data: Installation (`RouterProvider` из `react-router/dom`) —
  https://reactrouter.com/start/data/installation
- Data: Routing — https://reactrouter.com/start/data/routing
- Data: Route Object — https://reactrouter.com/start/data/route-object
- Testing (Data/Framework, `createRoutesStub`) — https://reactrouter.com/start/framework/testing
- `MemoryRouter` (declarative) — https://reactrouter.com/api/declarative-routers/MemoryRouter
- `createMemoryRouter` (data) — https://reactrouter.com/api/data-routers/createMemoryRouter
- `Link` — https://reactrouter.com/api/components/Link
- `NavLink` — https://reactrouter.com/api/components/NavLink
- Upgrading from v7 (удаление `react-router-dom`, минимумы версий) —
  https://reactrouter.com/upgrading/v7

npm / пакеты:

- `react-router` в npm (dist-tags, `latest` = 8.4.0) — https://www.npmjs.com/package/react-router
- метаданные пакета `react-router@8.4.0` (peerDependencies, engines, exports) —
  https://registry.npmjs.org/react-router/8.4.0

Feature-Sliced Design:

- Layers (сегменты App `routes`/`store`/`styles`/`entrypoint`, Shared `routes`,
  page layouts на Widgets, правило импортов) — https://feature-sliced.design/docs/reference/layers
- Public API (точечные реэкспорты, вред `export *`) —
  https://feature-sliced.design/docs/reference/public-api

Прочее:

- Mantine `Anchor` (полиморфный `component`) — https://mantine.dev/core/anchor/
- Vite Shared Options, `appType` (SPA fallback по умолчанию) —
  https://vite.dev/config/shared-options#apptype
