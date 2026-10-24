namespace CallCalendar;

/**
 * Тип события — шаблон, по которому нарезаются слоты. Состав полей — ровно
 * три: идентификатор, название, описание. Длительность слота — константа
 * 30 минут (`SLOT_MINUTES`), в типе события не хранится.
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
}

@doc("Тело `POST /api/event-types`. Идентификатор генерирует система — в теле его нет.")
model EventTypeCreate {
  @doc("Название, непустое после trim, ≤ 100 символов")
  @maxLength(100)
  name: string;

  @doc("Описание, ≤ 1000 символов")
  @maxLength(1000)
  description?: string = "";
}
