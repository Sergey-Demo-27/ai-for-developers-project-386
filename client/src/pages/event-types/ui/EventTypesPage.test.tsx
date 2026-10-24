import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/render'
import { EventTypesPage } from './EventTypesPage'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const consultation = {
  id: 1,
  name: 'Консультация',
  description: '',
}

describe('EventTypesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает пустое состояние на чистой базе', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ eventTypes: [] })))

    renderWithProviders(<EventTypesPage />)

    expect(await screen.findByText('Типов событий пока нет')).toBeInTheDocument()
  })

  it('показывает спиннер, пока список грузится', async () => {
    let resolveFetch: (response: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => pending))

    renderWithProviders(<EventTypesPage />)

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()

    await act(async () => {
      resolveFetch(jsonResponse({ eventTypes: [] }))
    })

    expect(await screen.findByText('Типов событий пока нет')).toBeInTheDocument()
  })

  it('при сбое загрузки показывает сообщение и «Повторить», затем повторяет запрос', async () => {
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempts += 1
        if (attempts === 1) throw new TypeError('network down')
        return jsonResponse({ eventTypes: [] })
      }),
    )

    renderWithProviders(<EventTypesPage />)

    expect(
      await screen.findByText('Не удалось загрузить типы событий'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Типов событий пока нет')).toBeInTheDocument()
  })

  it('создаёт тип, перезагружает список и сбрасывает форму', async () => {
    let listCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        if (request.method === 'POST') {
          return jsonResponse({ eventType: consultation }, 201)
        }
        listCalls += 1
        return jsonResponse({
          eventTypes: listCalls === 1 ? [] : [consultation],
        })
      }),
    )

    renderWithProviders(<EventTypesPage />)
    await screen.findByText('Типов событий пока нет')

    await userEvent.type(screen.getByLabelText(/Название/), 'Консультация')
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }))

    expect(await screen.findByText('Консультация')).toBeInTheDocument()
    expect(screen.getByLabelText(/Название/)).toHaveValue('')
  })

  it('раскладывает 400 validation_error по полям', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        if (request.method === 'POST') {
          return jsonResponse(
            {
              error: {
                status: 400,
                code: 'validation_error',
                message: 'Некорректные данные запроса',
                details: [
                  { field: 'name', message: 'Поле не может быть пустым' },
                ],
              },
            },
            400,
          )
        }
        return jsonResponse({ eventTypes: [] })
      }),
    )

    renderWithProviders(<EventTypesPage />)
    await screen.findByText('Типов событий пока нет')

    await userEvent.type(screen.getByLabelText(/Название/), 'X')
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }))

    expect(
      await screen.findByText('Поле не может быть пустым'),
    ).toBeInTheDocument()
    expect(screen.getByText('Некорректные данные запроса')).toBeInTheDocument()
  })
})
