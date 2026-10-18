namespace CallCalendar;

@doc("Тело `POST /api/bookings`")
model BookingCreate {
  @doc("Тип события; тип должен существовать, иначе 404 event_type_not_found")
  eventTypeId: int32;

  @doc("Дата в окне записи `[сегодня … сегодня + 13]`")
  date: LocalDate;

  @doc("Начало, совпадает с реальным слотом этого типа и не в прошлом")
  start: LocalTime;

  @doc("Имя гостя, непустое после trim, ≤ 100 символов")
  @maxLength(100)
  guestName: string;

  @doc("Email гостя, базовая проверка формата, ≤ 254 символов")
  @maxLength(254)
  guestEmail: string;
}

/**
 * Бронь, созданная гостем. Длительность и интервал берутся из снимка брони,
 * `eventTypeName` в ответе нет — гость знает тип, с которого пришёл.
 */
model Booking {
  id: int32;

  @doc("Тип события, по которому бронировали")
  eventTypeId: int32;

  date: LocalDate;
  start: LocalTime;

  @doc("Вычисляется из `start` и снимка длительности брони")
  end: LocalTime;

  @doc("Имя гостя, непустое после trim, ≤ 100 символов")
  @maxLength(100)
  guestName: string;

  @doc("Email гостя, базовая проверка формата, ≤ 254 символов")
  @maxLength(254)
  guestEmail: string;

  @doc("Момент создания брони")
  createdAt: utcDateTime;
}

/**
 * Строка списка предстоящих броней. Отличается от `Booking`: вместо
 * `eventTypeId` приходит имя типа (join по `event_type_id`).
 */
model BookingListItem {
  id: int32;
  date: LocalDate;
  start: LocalTime;
  end: LocalTime;

  @doc("Имя типа события — join по `event_type_id`")
  eventTypeName: string;

  guestName: string;
  guestEmail: string;
  createdAt: utcDateTime;
}
