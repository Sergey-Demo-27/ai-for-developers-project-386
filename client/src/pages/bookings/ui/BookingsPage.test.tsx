import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/render'
import { BookingsPage } from './BookingsPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Вызов списка броней: `GET /api/bookings` через сгенерированный SDK.
function stubBookings(handler: () => unknown) {
  const fetchMock = vi.fn(async () => {
    const response = await handler()
    return response instanceof Response ? response : jsonResponse(response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Строка списка в форме контракта (`BookingListItem`).
const consultation = {
  id: 7,
  date: '2026-03-28',
  start: '09:30',
  end: '10:00',
  eventTypeName: 'Консультация',
  guestName: 'Иван',
  guestEmail: 'ivan@example.com',
  createdAt: '2026-03-27T14:40:00',
}

describe('BookingsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает карточку со всеми полями в заданных форматах', async () => {
    stubBookings(() => ({ bookings: [consultation] }))

    renderWithProviders(<BookingsPage />)

    expect(await screen.findByText('Иван')).toBeInTheDocument()
    expect(screen.getByText('ivan@example.com')).toBeInTheDocument()
    expect(screen.getByText('Консультация · 30 мин')).toBeInTheDocument()
    expect(
      screen.getByText('Слот: суббота, 28 марта, 09:30 - 10:00'),
    ).toBeInTheDocument()
    expect(screen.getByText('Создано: 27.03.2026, 14:40')).toBeInTheDocument()
  })

  it('показывает пустое состояние и ведёт на /booking', async () => {
    stubBookings(() => ({ bookings: [] }))

    renderWithProviders(<BookingsPage />)

    expect(await screen.findByText('Предстоящих броней нет')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    )
  })

  it('показывает спиннер, пока список грузится', async () => {
    let resolveFetch: (response: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => pending))

    renderWithProviders(<BookingsPage />)

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()

    await act(async () => {
      resolveFetch(jsonResponse({ bookings: [] }))
    })

    expect(await screen.findByText('Предстоящих броней нет')).toBeInTheDocument()
  })

  it('при сбое загрузки показывает сообщение и «Повторить», затем повторяет запрос', async () => {
    let attempts = 0
    stubBookings(() => {
      attempts += 1
      if (attempts === 1) throw new TypeError('network down')
      return { bookings: [] }
    })

    renderWithProviders(<BookingsPage />)

    expect(
      await screen.findByText('Не удалось загрузить брони'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Предстоящих броней нет')).toBeInTheDocument()
  })
})
