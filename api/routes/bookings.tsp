import "@typespec/http";

using TypeSpec.Http;

namespace CallCalendar;

@doc("Брони: гость создаёт, список предстоящих встреч читает владелец")
@tag("Брони")
@route("/bookings")
interface Bookings {
  // Повторная отправка на тот же слот — тот же страж, что и при обычном
  // конфликте: `409 slot_taken`. Idempotency-key нет.
  @summary("Создание брони")
  @doc("Занятость сквозная по типам: пересечение интервалов даёт `409 slot_taken`.")
  @post
  @returnsDoc("Бронь создана")
  create(@body body: BookingCreate):
    | Created<BookingResponse>
    | ValidationError
    | InvalidJsonError
    | EventTypeNotFoundError
    | SlotTakenError
    | InternalError;

  @summary("Предстоящие брони")
  @doc("Роль — интерфейс, а не доступ: список одинаков для гостя и владельца.")
  @get
  @returnsDoc("Только будущие брони, по возрастанию `date`, затем `start`")
  list(): BookingListResponse | InternalError;
}
