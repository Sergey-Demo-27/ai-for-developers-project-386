import "@typespec/http";

using TypeSpec.Http;

namespace CallCalendar;

@doc("Типы событий: владелец создаёт, список читают обе роли")
@tag("Типы событий")
@route("/event-types")
interface EventTypes {
  // Отдельного `GET /event-types/:id` нет: список типов мал, а в перечне
  // операций он не назван.
  @summary("Список типов событий")
  @doc("Порядок вывода — по `id`. Пустая база — пустой список.")
  @get
  @returnsDoc("Все типы событий; пустая база — `{ \"eventTypes\": [] }`")
  list(): EventTypeListResponse | InternalError;

  @summary("Создание типа события")
  @doc("Идентификатор генерирует система. Редактирования и удаления типов нет.")
  @post
  @returnsDoc("Тип события создан")
  create(@body body: EventTypeCreate):
    | Created<EventTypeResponse>
    | ValidationError
    | InvalidJsonError
    | InternalError;
}

@doc("Сетка слотов типа события на окно записи")
@tag("Слоты")
@route("/event-types/{id}/slots")
interface EventTypeSlots {
  // Окно записи — константа, query-параметров нет. Рабочий календарь без
  // исключений, тип всегда порождает хотя бы один слот, поэтому пустых дней
  // не бывает.
  //
  // `:id` смоделирован строкой, а не целым: по контракту нецелый `id` даёт
  // `404 event_type_not_found`, а не `400`.
  @summary("Сетка слотов типа события")
  @doc("Окно записи — константа `[сегодня … сегодня + 13]`; нецелый `:id` — тоже `404`.")
  @get
  @returnsDoc("Все 14 дней окна с сетами слотов типа")
  list(@path id: string):
    | SlotsResponse
    | EventTypeNotFoundError
    | InternalError;
}
