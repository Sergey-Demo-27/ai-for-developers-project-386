// Public API слоя shared/api: настроенный клиент, сгенерированный SDK,
// единая обёртка над ним и разбор конверта ошибки.
export { apiBaseUrl, client } from './client'
export { ApiError } from './errors'
export {
  bookingsCreate,
  bookingsList,
  eventTypesCreate,
  eventTypesList,
  eventTypeSlotsList,
} from './generated'
export type {
  Booking,
  BookingCreate,
  BookingListItem,
  Day,
  EventType,
  EventTypeCreate,
  FieldError,
  Slot,
} from './generated'

import { ApiError } from './errors'

// Разворачивает результат вызова SDK (`{ data }` или исключение при
// `throwOnError: true`) в данные, а ошибку — в `ApiError`. Единственное место,
// где разбирается конверт ошибки; страницы ловят уже готовый `ApiError`.
export async function unwrap<T>(result: Promise<{ data: T }>): Promise<T> {
  try {
    return (await result).data
  } catch (error) {
    throw ApiError.from(error)
  }
}

// Текст для показа по пойманной ошибке: `message` из конверта для HTTP-ошибок
// и `fallback` для сетевого сбоя (у него осмысленного текста нет).
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.code !== 'network_error'
    ? error.message
    : fallback
}
