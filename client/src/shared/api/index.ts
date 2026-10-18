// Public API слоя shared/api: настроенный клиент и сгенерированный SDK.
export { apiBaseUrl, client } from './client'
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
  Day,
  EventType,
  EventTypeCreate,
  Slot,
} from './generated'
