import type { FieldError } from './generated'

// Тело ошибки из контракта (docs/spec.md, «Конверт ошибки»).
type ErrorBody = {
  status?: number
  code?: string
  message?: string
  details?: FieldError[]
}

// Конверт ошибки: тело ответа — объект с единственным ключом `error`.
type ErrorEnvelope = { error?: ErrorBody }

// Сообщение, когда ответа нет вовсе (сеть, оборванный запрос).
const NETWORK_MESSAGE = 'Не удалось выполнить запрос'

// Ошибка API с разобранным конвертом: `code` — для ветвления, `details` —
// разбор по полям у ошибок валидации, `message` — текст для показа.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: FieldError[]

  constructor(
    status: number,
    code: string,
    message: string,
    details?: FieldError[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  // Разбирает то, что вернул сгенерированный SDK: JSON-конверт ошибки —
  // для ответов с ошибкой, произвольное значение — для сетевых сбоев.
  static from(error: unknown): ApiError {
    const envelope = (error as ErrorEnvelope | undefined)?.error

    if (envelope && typeof envelope === 'object') {
      return new ApiError(
        envelope.status ?? 0,
        envelope.code ?? 'unknown_error',
        envelope.message ?? NETWORK_MESSAGE,
        envelope.details,
      )
    }

    return new ApiError(0, 'network_error', NETWORK_MESSAGE)
  }
}
