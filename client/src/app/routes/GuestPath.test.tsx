import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { AppRoutes } from './AppRoutes'

// Сквозной гостевой путь одним тестом на реальном роутере с замоканным
// `fetch` (docs/spec.md, «Тесты и демо-данные», «Обязательные сценарии
// клиента»): лендинг → `/booking` → выбор типа (дата подсвечивается сама) →
// выбор слота → подтверждение → `409` возвращает к выбору слота, сохраняя тип,
// дату, имя и email → успех → «Забронировать ещё».
//
// Мок — только системная граница (`fetch`); страницы, роутер и разбор конверта
// ошибки работают настоящие.

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const consultation = {
  id: 1,
  name: 'Консультация',
  description: 'Разговор на 30 минут',
}

function slot(start: string, end: string, available: boolean) {
  return { start, end, available }
}

const TODAY = '2026-10-15'
const TOMORROW = '2026-10-16'

// Завтрашний день во всех сетках одинаков: свободен только `09:00`.
const tomorrowDay = {
  date: TOMORROW,
  slots: [slot('09:00', '09:30', true), slot('09:30', '10:00', false)],
}

// Сетка окна записи из двух дней. Сегодня свободен только `11:00`, завтра —
// `09:00`; этого хватает, чтобы календарь сам подсветил сегодня.
const initialDays = [
  {
    date: TODAY,
    slots: [
      slot('09:00', '09:30', false),
      slot('11:00', '11:30', true),
      slot('12:00', '12:30', false),
    ],
  },
  tomorrowDay,
]

// После `409` слот `11:00` заняли — он «Занято», зато освободился `13:00`.
const afterConflictDays = [
  {
    date: TODAY,
    slots: [
      slot('09:00', '09:30', false),
      slot('11:00', '11:30', false),
      slot('12:00', '12:30', false),
      slot('13:00', '13:30', true),
    ],
  },
  tomorrowDay,
]

// После успешной брони занят и `13:00`.
const afterBookingDays = [
  {
    date: TODAY,
    slots: [
      slot('09:00', '09:30', false),
      slot('11:00', '11:30', false),
      slot('12:00', '12:30', false),
      slot('13:00', '13:30', false),
    ],
  },
  tomorrowDay,
]

// Мок `fetch`: различаем вызовы по URL. Сетка слотов меняется по ходу сценария —
// так воспроизводим и занятый слот после `409`, и занятый после успеха.
function stubApi() {
  let bookingCalls = 0

  const fetchMock = vi.fn(async (request: Request) => {
    const url = request.url

    if (url.includes('/bookings') && request.method === 'POST') {
      const body = JSON.parse(await request.text()) as Record<string, unknown>
      bookingCalls += 1

      // Первая попытка — слот заняли, пока гость заполнял форму.
      if (bookingCalls === 1) {
        return jsonResponse(
          {
            error: {
              status: 409,
              code: 'slot_taken',
              message: 'Это время уже занято, выберите другой слот',
            },
          },
          409,
        )
      }

      return jsonResponse(
        {
          booking: {
            id: 7,
            ...body,
            end: '13:30',
            createdAt: '2026-10-15T10:05:00.000Z',
          },
        },
        201,
      )
    }

    if (request.url.match(/\/event-types\/[^/]+\/slots/)) {
      const days =
        bookingCalls === 0
          ? initialDays
          : bookingCalls === 1
            ? afterConflictDays
            : afterBookingDays
      return jsonResponse({ days })
    }

    return jsonResponse({ eventTypes: [consultation] })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('гостевой путь', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('проходит запись целиком: лендинг → слот → 409 → успех → «Забронировать ещё»', async () => {
    stubApi()

    renderWithProviders(<AppRoutes />, { route: '/' })

    // Лендинг: оффер и кнопка «Записаться» — переход без перезагрузки.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Calendar' }),
    ).toBeInTheDocument()
    await userEvent.click(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'Записаться',
      }),
    )

    // `/booking`: выбор типа — календарь сам подсвечивает первый день со
    // свободным слотом.
    const typeButton = await screen.findByRole('button', {
      name: /Консультация/,
    })
    await userEvent.click(typeButton)

    const info = screen.getByRole('region', { name: 'Информация' })
    expect(
      await within(info).findByText('четверг, 15 октября'),
    ).toBeInTheDocument()

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    await userEvent.click(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    )
    await userEvent.click(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    )

    // Подтверждение: сводка и подписанные поля, клиентская валидация — пока
    // форма невалидна, кнопка заблокирована.
    const confirm = await screen.findByRole('region', {
      name: 'Подтверждение записи',
    })
    expect(
      within(confirm).getByText(
        'Консультация · 30 мин · четверг, 15 октября · 11:00 - 11:30',
      ),
    ).toBeInTheDocument()

    const submit = within(confirm).getByRole('button', {
      name: 'Подтвердить запись',
    })
    expect(submit).toBeDisabled()

    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(within(confirm).getByLabelText(/Email/), 'не-email')
    expect(submit).toBeDisabled()

    await userEvent.clear(within(confirm).getByLabelText(/Email/))
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    expect(submit).toBeEnabled()

    await userEvent.click(submit)

    // `409`: возврат к выбору слота; список перезагружен, слот сброшен,
    // тип, дата, имя и email сохранены.
    const afterConflict = await screen.findByRole('region', {
      name: 'Статус слотов',
    })
    expect(
      within(afterConflict).getByRole('button', { name: '11:00 - 11:30' }),
    ).toBeDisabled()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(typeButton).toHaveAttribute('aria-pressed', 'true')

    // Гость выбирает освободившийся слот и продолжает — данные на месте.
    await userEvent.click(
      within(afterConflict).getByRole('button', { name: '13:00 - 13:30' }),
    )
    await userEvent.click(
      within(afterConflict).getByRole('button', { name: 'Продолжить' }),
    )
    const confirmAgain = await screen.findByRole('region', {
      name: 'Подтверждение записи',
    })
    expect(within(confirmAgain).getByLabelText(/Имя/)).toHaveValue('Иван')
    expect(within(confirmAgain).getByLabelText(/Email/)).toHaveValue('ivan@example.com')
    await userEvent.click(
      within(confirmAgain).getByRole('button', { name: 'Подтвердить запись' }),
    )

    // Успех: карточка подтверждения и единственная кнопка «Забронировать ещё».
    expect(
      await screen.findByText('Бронь подтверждена. До встречи!'),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Забронировать ещё' }),
    )

    // Возврат к выбору: тип и дата сохранены, слот сброшен, сетка перезагружена —
    // только что забронированный слот стал «Занято».
    const slotsAgain = await screen.findByRole('region', {
      name: 'Статус слотов',
    })
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(typeButton).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(slotsAgain).getByRole('button', { name: '13:00 - 13:30' }),
    ).toBeDisabled()
  })
})
