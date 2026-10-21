import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from './AppRoutes'

// Страницы маршрутов сразу грузят данные. Без мока `fetch` тест ходил бы в сеть
// (в jsdom origin — `http://localhost:3000`) и зависел бы от окружения: под
// локальным сервером в ответ прилетает HTML, а не конверт контракта.
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ eventTypes: [], bookings: [] })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('на / показывает лендинг внутри общего layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Calendar' }),
    ).toBeInTheDocument()
    // Шапка — часть layout'а, она есть на каждом маршруте.
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
  })

  it('на /booking показывает страницу записи внутри общего layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/booking' })

    expect(
      screen.getByRole('heading', { name: 'Запись на звонок' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
  })

  it('на /bookings показывает предстоящие брони внутри общего layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/bookings' })

    expect(
      screen.getByRole('heading', { name: 'Предстоящие брони' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
  })

  it('на /event-types показывает типы событий внутри общего layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/event-types' })

    expect(
      screen.getByRole('heading', { name: 'Типы событий' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
  })

  it('на неизвестном адресе показывает «Страница не найдена» внутри layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/nope' })

    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Calendar' }),
    ).not.toBeInTheDocument()
  })

  it('ведёт со страницы «не найдено» обратно на лендинг', async () => {
    renderWithProviders(<AppRoutes />, { route: '/nope' })

    await userEvent.click(screen.getByRole('link', { name: 'На главную' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Calendar' }),
    ).toBeInTheDocument()
  })

  it('переходит между разделами по ссылкам шапки', async () => {
    renderWithProviders(<AppRoutes />, { route: '/' })

    await userEvent.click(
      screen.getByRole('link', { name: 'Предстоящие брони' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Предстоящие брони' }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Типы событий' }))
    expect(
      await screen.findByRole('heading', { name: 'Типы событий' }),
    ).toBeInTheDocument()
  })
})
