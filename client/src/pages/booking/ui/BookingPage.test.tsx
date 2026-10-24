import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { renderWithProviders } from '../../../test/render'
import { BookingPage } from './BookingPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Общий мок `fetch`: запрос брони, слотов и список типов отличаем по URL.
// Колбэки могут бросить — так проверяем сетевые сбои.
function stubApi(handlers: {
  eventTypes?: () => unknown
  slots?: (id: string) => unknown
  booking?: (body: Record<string, unknown>) => unknown
}) {
  const fetchMock = vi.fn(async (request: Request) => {
    if (request.url.includes('/bookings')) {
      const body = JSON.parse(await request.text()) as Record<string, unknown>
      const response = handlers.booking ? await handlers.booking(body) : { booking: body }
      return response instanceof Response ? response : jsonResponse(response, 201)
    }
    const match = request.url.match(/\/event-types\/([^/]+)\/slots/)
    if (match) {
      const body = handlers.slots ? await handlers.slots(match[1]) : { days: [] }
      return jsonResponse(body)
    }
    const body = handlers.eventTypes ? await handlers.eventTypes() : { eventTypes: [] }
    return jsonResponse(body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const consultation = {
  id: 1,
  name: 'Консультация',
  description: 'Разговор на 30 минут',
}

const meeting = {
  id: 2,
  name: 'Созвон',
  description: '',
}

function slot(start: string, end: string, available: boolean) {
  return { start, end, available }
}

// Окно записи из двух дней: сегодня и завтра. Сегодня — прошедший слот,
// свободный и занятый: сетка показывает всё, кроме прошедшего.
const TODAY = '2026-10-15'
const TOMORROW = '2026-10-16'

const days = [
  {
    date: TODAY,
    slots: [
      slot('09:00', '09:30', false),
      slot('11:00', '11:30', true),
      slot('12:00', '12:30', false),
    ],
  },
  {
    date: TOMORROW,
    slots: [
      slot('09:00', '09:30', true),
      slot('09:30', '10:00', false),
      slot('10:00', '10:30', true),
    ],
  },
]

// Доводит гостя до шага подтверждения: выбор типа, свободного слота и «Продолжить».
async function goToConfirmation() {
  await userEvent.click(
    await screen.findByRole('button', { name: /Консультация/ }),
  )
  const slots = await screen.findByRole('region', { name: 'Статус слотов' })
  await userEvent.click(
    within(slots).getByRole('button', { name: '11:00 - 11:30' }),
  )
  await userEvent.click(
    within(slots).getByRole('button', { name: 'Продолжить' }),
  )
  return screen.findByRole('region', { name: 'Подтверждение записи' })
}

describe('BookingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('показывает пустое состояние, когда типов событий нет', async () => {
    stubApi({})

    renderWithProviders(<BookingPage />)

    expect(
      await screen.findByText('Пока нет доступных типов событий'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument()
  })

  it('показывает спиннер, пока типы грузятся', async () => {
    let resolveFetch: (response: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => pending))

    renderWithProviders(<BookingPage />)

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()

    await act(async () => {
      resolveFetch(jsonResponse({ eventTypes: [] }))
    })

    expect(
      await screen.findByText('Пока нет доступных типов событий'),
    ).toBeInTheDocument()
  })

  it('при сбое загрузки типов показывает сообщение и «Повторить», затем повторяет запрос', async () => {
    let attempts = 0
    stubApi({
      eventTypes: () => {
        attempts += 1
        if (attempts === 1) throw new TypeError('network down')
        return { eventTypes: [] }
      },
    })

    renderWithProviders(<BookingPage />)

    expect(
      await screen.findByText('Не удалось загрузить типы событий'),
    ).toBeInTheDocument()
    // Календарь не рисуется, пока список типов не загрузился.
    expect(
      screen.queryByRole('region', { name: 'Календарь' }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(
      await screen.findByText('Пока нет доступных типов событий'),
    ).toBeInTheDocument()
  })

  it('до выбора типа показывает подсказку, пустые плитки и не запрашивает слоты', async () => {
    const fetchMock = stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
    })

    renderWithProviders(<BookingPage />)

    expect(await screen.findByText('Выберите тип события')).toBeInTheDocument()
    expect(screen.queryByText('09:00 - 09:30')).not.toBeInTheDocument()

    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('Дата не выбрана')).toBeInTheDocument()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(within(info).getByText('0')).toBeInTheDocument()
    expect(within(info).getByText('Нет слотов на этот день')).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Продолжить' }),
    ).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Назад' })).toHaveAttribute(
      'href',
      '/',
    )
    // Слотовый эндпоинт требует `:id` — до выбора типа запрос не уходит.
    expect(
      fetchMock.mock.calls.some(([request]) =>
        request.url.includes('/slots'),
      ),
    ).toBe(false)
  })

  it('по выбору типа подсвечивает первый день со свободными слотами и считает их в календаре', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation, meeting] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const info = await screen.findByRole('region', { name: 'Информация' })
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(within(info).getByText('30 мин')).toBeInTheDocument()
    expect(within(info).getByText('1')).toBeInTheDocument()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()

    expect(screen.getByText('1 св.')).toBeInTheDocument()
    expect(screen.getByText('2 св.')).toBeInTheDocument()
  })

  it('подсвечивает первый свободный день, пропуская полностью занятый сегодняшний', async () => {
    const busyToday = [
      {
        date: TODAY,
        slots: [slot('09:00', '09:30', false), slot('11:00', '11:30', false)],
      },
      days[1],
    ]
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days: busyToday }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const info = await screen.findByRole('region', { name: 'Информация' })
    expect(within(info).getByText('пятница, 16 октября')).toBeInTheDocument()
  })

  it('гасит дни вне окна записи и отмечает сегодняшний выбранный день', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const calendar = await screen.findByRole('region', { name: 'Календарь' })
    const today = within(calendar).getByRole('button', {
      name: /четверг, 15 октября/,
    })
    expect(today).toHaveAttribute('data-selected')
    expect(today).toHaveAttribute('data-today')
    expect(today).toHaveAttribute('data-highlight-today')

    // Дни вне окна остаются в сетке месяца, но некликабельны.
    expect(
      within(calendar).getByRole('button', { name: /среда, 14 октября/ }),
    ).toBeDisabled()
    expect(
      within(calendar).getByRole('button', { name: /пятница, 16 октября/ }),
    ).toBeEnabled()
  })

  it('показывает слоты дня: занятые некликабельны, прошедшие скрыты', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    expect(within(slots).getByText('11:00 - 11:30')).toBeInTheDocument()
    expect(within(slots).getByText('12:00 - 12:30')).toBeInTheDocument()
    expect(
      within(slots).queryByText('09:00 - 09:30'),
    ).not.toBeInTheDocument()
    expect(within(slots).getByText('Свободно')).toBeInTheDocument()
    expect(within(slots).getByText('Занято')).toBeInTheDocument()
    expect(
      within(slots).getByRole('button', { name: '12:00 - 12:30' }),
    ).toBeDisabled()
    expect(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    ).toBeEnabled()
  })

  it('по выбору слота заполняет «Информацию» и включает «Продолжить»', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeDisabled()

    await userEvent.click(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    )

    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeEnabled()
    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('11:00 - 11:30')).toBeInTheDocument()
    expect(
      within(slots).getByRole('link', { name: 'Назад' }),
    ).toHaveAttribute('href', '/')
  })

  it('оставляет дату невыбранной, когда свободных слотов нет ни в один день', async () => {
    const allBusy = days.map((day) => ({
      date: day.date,
      slots: day.slots.map((s) => ({ ...s, available: false })),
    }))
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days: allBusy }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    expect(
      await screen.findByText('Выберите дату в календаре.'),
    ).toBeInTheDocument()
  })

  it('смена типа сбрасывает слот, сохраняет дату и пересчитывает счётчики', async () => {
    const meetingDays = [
      { date: TODAY, slots: [slot('09:00', '09:30', false)] },
      { date: TOMORROW, slots: [slot('10:00', '10:30', true)] },
    ]
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation, meeting] }),
      slots: (id) => ({ days: id === '2' ? meetingDays : days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    await userEvent.click(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    )
    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: /Созвон/ }))

    const info = await screen.findByRole('region', { name: 'Информация' })
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(within(info).getByText('0')).toBeInTheDocument()
    expect(await screen.findByText('1 св.')).toBeInTheDocument()
    expect(screen.queryByText('2 св.')).not.toBeInTheDocument()

    const reloadedSlots = await screen.findByRole('region', {
      name: 'Статус слотов',
    })
    expect(
      within(reloadedSlots).getByRole('button', { name: 'Продолжить' }),
    ).toBeDisabled()
  })

  it('не перетирает слоты устаревшим ответом при быстрой смене типа', async () => {
    const slowDays = [
      {
        date: TODAY,
        slots: [
          slot('11:00', '11:30', true),
          slot('12:00', '12:30', true),
          slot('13:00', '13:30', true),
        ],
      },
      { date: TOMORROW, slots: [slot('09:00', '09:30', false)] },
    ]
    const fastDays = [
      { date: TODAY, slots: [slot('09:00', '09:30', false)] },
      { date: TOMORROW, slots: [slot('11:00', '11:30', true)] },
    ]
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation, meeting] }),
      slots: (id) =>
        id === '1'
          ? new Promise((resolve) => {
              setTimeout(() => resolve({ days: slowDays }), 30)
            })
          : { days: fastDays },
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )
    await userEvent.click(screen.getByRole('button', { name: /Созвон/ }))

    expect(await screen.findByText('1 св.')).toBeInTheDocument()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(screen.queryByText('3 св.')).not.toBeInTheDocument()
    expect(screen.getByText('1 св.')).toBeInTheDocument()
  })

  it('показывает спиннер, пока грузятся слоты выбранного типа', async () => {
    let resolveSlots: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveSlots = resolve
    })
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => pending,
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    expect(await screen.findByLabelText('Загрузка')).toBeInTheDocument()

    await act(async () => {
      resolveSlots({ days })
    })

    expect(await screen.findByText('11:00 - 11:30')).toBeInTheDocument()
  })

  it('смена даты сбрасывает выбранный слот', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    await userEvent.click(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    )
    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeEnabled()

    const calendar = screen.getByRole('region', { name: 'Календарь' })
    await userEvent.click(
      within(calendar).getByRole('button', { name: /пятница, 16 октября/ }),
    )

    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(within(slots).getByText('09:00 - 09:30')).toBeInTheDocument()
    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeDisabled()
  })

  it('ходит по месяцам стрелками и гасит их на границах окна', async () => {
    vi.setSystemTime(new Date('2026-10-25T08:00:00'))
    // Окно записи пересекает границу месяца: 25 октября — 7 ноября.
    const windowDays = Array.from({ length: 14 }, (_, index) => ({
      date: dayjs('2026-10-25').add(index, 'day').format('YYYY-MM-DD'),
      slots: [slot('09:00', '09:30', true)],
    }))
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days: windowDays }),
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    const calendar = await screen.findByRole('region', { name: 'Календарь' })
    expect(
      within(calendar).getByRole('button', { name: 'Предыдущий месяц' }),
    ).toBeDisabled()
    const nextMonth = within(calendar).getByRole('button', {
      name: 'Следующий месяц',
    })
    expect(nextMonth).toBeEnabled()

    await userEvent.click(nextMonth)

    // В ноябре в окно входят только дни по 7-е включительно.
    expect(
      within(calendar).getByRole('button', { name: /суббота, 7 ноября/ }),
    ).toBeEnabled()
    expect(
      within(calendar).getByRole('button', { name: /воскресенье, 8 ноября/ }),
    ).toBeDisabled()
    expect(
      within(calendar).getByRole('button', { name: 'Следующий месяц' }),
    ).toBeDisabled()
  })

  it('при сбое загрузки слотов показывает «Повторить», сохраняет тип, затем повторяет', async () => {
    let attempts = 0
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => {
        attempts += 1
        if (attempts === 1) throw new TypeError('network down')
        return { days }
      },
    })

    renderWithProviders(<BookingPage />)
    await userEvent.click(
      await screen.findByRole('button', { name: /Консультация/ }),
    )

    expect(
      await screen.findByText('Не удалось загрузить слоты'),
    ).toBeInTheDocument()
    // Выбранный тип сохраняется: гость жмёт «Повторить», а не начинает заново.
    expect(screen.getByRole('button', { name: /Консультация/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('11:00 - 11:30')).toBeInTheDocument()
  })

  it('«Продолжить» открывает подтверждение со сводкой и подписанными полями', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()

    expect(
      within(confirm).getByText(
        'Консультация · 30 мин · четверг, 15 октября · 11:00 - 11:30',
      ),
    ).toBeInTheDocument()
    expect(within(confirm).getByLabelText(/Имя/)).toBeInTheDocument()
    expect(within(confirm).getByLabelText(/Email/)).toBeInTheDocument()
    expect(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    ).toBeDisabled()
  })

  it('«Изменить» возвращает к выбору слота, сохраняя тип, дату и слот', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()

    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Изменить' }),
    )

    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(within(info).getByText('11:00 - 11:30')).toBeInTheDocument()

    const slots = screen.getByRole('region', { name: 'Статус слотов' })
    expect(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    ).toBeEnabled()
  })

  it('держит «Подтвердить запись» заблокированной, пока форма невалидна', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()

    const submit = within(confirm).getByRole('button', {
      name: 'Подтвердить запись',
    })
    expect(submit).toBeDisabled()

    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    expect(submit).toBeDisabled()

    const email = within(confirm).getByLabelText(/Email/)
    await userEvent.type(email, 'не-email')
    expect(submit).toBeDisabled()

    await userEvent.clear(email)
    await userEvent.type(email, 'ivan@example.com')
    expect(submit).toBeEnabled()
  })

  it('раскладывает 400 validation_error по полям подтверждения', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
      booking: () =>
        jsonResponse(
          {
            error: {
              status: 400,
              code: 'validation_error',
              message: 'Некорректные данные запроса',
              details: [
                { field: 'guestEmail', message: 'Укажите корректный email' },
              ],
            },
          },
          400,
        ),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()

    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    expect(
      await screen.findByText('Укажите корректный email'),
    ).toBeInTheDocument()
    expect(screen.getByText('Некорректные данные запроса')).toBeInTheDocument()
  })

  it('при 409 возвращает к выбору слота, сохраняя тип, дату, имя и email', async () => {
    const afterBookingDays = [
      {
        date: TODAY,
        slots: [
          slot('09:00', '09:30', false),
          slot('11:00', '11:30', false),
          slot('12:00', '12:30', false),
          slot('13:00', '13:30', true),
        ],
      },
      days[1],
    ]
    let slotsCalls = 0
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => {
        slotsCalls += 1
        return slotsCalls === 1 ? { days } : { days: afterBookingDays }
      },
      booking: () =>
        jsonResponse(
          {
            error: {
              status: 409,
              code: 'slot_taken',
              message: 'Это время уже занято, выберите другой слот',
            },
          },
          409,
        ),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()
    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    // Возврат к выбору слота; список перезагружен — занятый слот стал «Занято».
    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    expect(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    ).toBeDisabled()

    // Слот сброшен, тип и дата сохранены.
    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Консультация/ }),
    ).toHaveAttribute('aria-pressed', 'true')

    // Имя и email сохранены: форма открывается с введёнными данными.
    await userEvent.click(
      within(slots).getByRole('button', { name: '13:00 - 13:30' }),
    )
    await userEvent.click(
      within(slots).getByRole('button', { name: 'Продолжить' }),
    )
    const again = await screen.findByRole('region', {
      name: 'Подтверждение записи',
    })
    expect(within(again).getByLabelText(/Имя/)).toHaveValue('Иван')
    expect(within(again).getByLabelText(/Email/)).toHaveValue(
      'ivan@example.com',
    )
  })

  it('при 500 сохраняет введённое и снова включает кнопку', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
      booking: () =>
        jsonResponse(
          {
            error: {
              status: 500,
              code: 'internal_error',
              message: 'Внутренняя ошибка',
            },
          },
          500,
        ),
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()
    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    const still = await screen.findByRole('region', {
      name: 'Подтверждение записи',
    })
    expect(within(still).getByLabelText(/Имя/)).toHaveValue('Иван')
    expect(within(still).getByLabelText(/Email/)).toHaveValue('ivan@example.com')
    expect(
      within(still).getByRole('button', { name: 'Подтвердить запись' }),
    ).toBeEnabled()
  })

  it('при сетевом сбое сохраняет введённое и снова включает кнопку', async () => {
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
      booking: () => {
        throw new TypeError('network down')
      },
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()
    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    const still = await screen.findByRole('region', {
      name: 'Подтверждение записи',
    })
    expect(within(still).getByLabelText(/Имя/)).toHaveValue('Иван')
    expect(
      within(still).getByRole('button', { name: 'Подтвердить запись' }),
    ).toBeEnabled()
  })

  it('блокирует «Подтвердить запись» на время запроса', async () => {
    let resolveBooking: (response: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveBooking = resolve
    })
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => ({ days }),
      booking: () => pending,
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()
    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )

    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    expect(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    ).toBeDisabled()

    await act(async () => {
      resolveBooking(jsonResponse({ booking: {} }, 201))
    })

    expect(
      await screen.findByText('Бронь подтверждена. До встречи!'),
    ).toBeInTheDocument()
  })

  it('успех показывает подтверждение, а «Забронировать ещё» сохраняет тип и дату и сбрасывает слот', async () => {
    const afterBookingDays = [
      {
        date: TODAY,
        slots: [
          slot('09:00', '09:30', false),
          slot('11:00', '11:30', false),
          slot('12:00', '12:30', false),
          slot('13:00', '13:30', true),
        ],
      },
      days[1],
    ]
    let slotsCalls = 0
    stubApi({
      eventTypes: () => ({ eventTypes: [consultation] }),
      slots: () => {
        slotsCalls += 1
        return slotsCalls === 1 ? { days } : { days: afterBookingDays }
      },
    })

    renderWithProviders(<BookingPage />)
    const confirm = await goToConfirmation()
    await userEvent.type(within(confirm).getByLabelText(/Имя/), 'Иван')
    await userEvent.type(
      within(confirm).getByLabelText(/Email/),
      'ivan@example.com',
    )
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Подтвердить запись' }),
    )

    expect(
      await screen.findByText('Бронь подтверждена. До встречи!'),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Забронировать ещё' }),
    )

    // Тип и дата сохранены, слот сброшен, список перезагружен.
    const info = screen.getByRole('region', { name: 'Информация' })
    expect(within(info).getByText('четверг, 15 октября')).toBeInTheDocument()
    expect(within(info).getByText('Время не выбрано')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Консультация/ }),
    ).toHaveAttribute('aria-pressed', 'true')

    const slots = await screen.findByRole('region', { name: 'Статус слотов' })
    expect(
      within(slots).getByRole('button', { name: '11:00 - 11:30' }),
    ).toBeDisabled()
  })
})
