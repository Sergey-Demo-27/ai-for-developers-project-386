namespace CallCalendar;

/**
 * Тип события — шаблон, по которому нарезаются слоты. Состав полей — ровно
 * четыре: идентификатор, название, описание, длительность в минутах.
 */
model EventType {
  @doc("Идентификатор, генерирует система")
  id: int32;

  @doc("Название, непустое после trim, ≤ 100 символов")
  @maxLength(100)
  name: string;

  @doc("Описание, ≤ 1000 символов; по умолчанию пустая строка")
  @maxLength(1000)
  description: string;

  @doc("Длительность в минутах; тип длиннее рабочего дня отклоняется (400)")
  @minValue(1)
  @maxValue(540)
  durationMinutes: int32;
}

@doc("Тело `POST /api/event-types`. Идентификатор генерирует система — в теле его нет.")
model EventTypeCreate {
  @doc("Название, непустое после trim, ≤ 100 символов")
  @maxLength(100)
  name: string;

  @doc("Описание, ≤ 1000 символов")
  @maxLength(1000)
  description?: string = "";

  @doc("Длительность в минутах, целое от 1 до 540")
  @minValue(1)
  @maxValue(540)
  durationMinutes: int32;
}
