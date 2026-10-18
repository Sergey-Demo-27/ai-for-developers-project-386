import "@typespec/http";

using TypeSpec.Http;

namespace CallCalendar;

// Тело успешного ответа — всегда объект с единственным ключом, названным
// по ресурсу.

model EventTypeListResponse {
  @doc("Все типы событий, порядок по `id`; пустая база — пустой массив")
  eventTypes: EventType[];
}

model EventTypeResponse {
  eventType: EventType;
}

model SlotsResponse {
  days: Day[];
}

model BookingResponse {
  booking: Booking;
}

model BookingListResponse {
  bookings: BookingListItem[];
}

// Возвращаемое значение операции по умолчанию даёт 200, поэтому 201 задаётся
// явной моделью с `@statusCode`.
@doc("Созданный ресурс")
model Created<T> {
  @statusCode _: 201;
  @body body: T;
}
