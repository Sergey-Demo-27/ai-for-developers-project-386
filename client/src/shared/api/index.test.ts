import { afterEach, describe, expect, it, vi } from 'vitest'

import { eventTypesCreate, eventTypesList } from './index'

// Ответы-заглушки в форме контракта (api/openapi/openapi.yaml).
const eventType = {
  id: 1,
  name: 'Консультация',
  description: '',
  durationMinutes: 30,
}

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>): Request {
  return fetchMock.mock.calls[0]?.[0] as Request
}

// Проверка, что фронтенд реально может пользоваться сгенерированным SDK:
// вызов идёт через методы SDK, а не через рукописный fetch.
describe('сгенерированный SDK', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('читает список типов событий через /api/event-types', async () => {
    const fetchMock = stubFetch({ eventTypes: [eventType] })

    const { data, error } = await eventTypesList()

    expect(error).toBeUndefined()
    expect(data?.eventTypes).toEqual([eventType])

    const request = lastRequest(fetchMock)
    expect(request.method).toBe('GET')
    expect(new URL(request.url).pathname).toBe('/api/event-types')
  })

  it('создаёт тип события через POST /api/event-types', async () => {
    const fetchMock = stubFetch({ eventType }, 201)

    const { data } = await eventTypesCreate({
      body: { name: 'Консультация', durationMinutes: 30 },
    })

    expect(data?.eventType).toEqual(eventType)

    const request = lastRequest(fetchMock)
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/api/event-types')
    await expect(request.json()).resolves.toEqual({
      name: 'Консультация',
      durationMinutes: 30,
    })
  })
})
