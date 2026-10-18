import "@typespec/http";
import "@typespec/openapi";

import "./models/scalars.tsp";
import "./models/event-type.tsp";
import "./models/slots.tsp";
import "./models/booking.tsp";
import "./models/responses.tsp";
import "./models/errors.tsp";
import "./routes/event-types.tsp";
import "./routes/bookings.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

/**
 * Сервис бронирования календаря звонков.
 *
 * Авторизации нет ни на одном маршруте: «владелец» и «гость» — роли интерфейса,
 * а не аккаунты. Все маршруты живут под префиксом `/api`, тело — JSON,
 * имена полей — camelCase.
 *
 * Технический `GET /health` — проба готовности вне `/api`; в контракт он не
 * входит и единый конверт ошибки на него не распространяется.
 */
@service(#{ title: "Календарь звонков" })
@info(#{ title: "Календарь звонков", version: "1.0.0" })
@useAuth(NoAuth)
@tagMetadata(
  "Типы событий",
  #{ description: "Типы событий — шаблоны, по которым нарезаются слоты." }
)
@tagMetadata(
  "Слоты",
  #{ description: "Сетка слотов типа события на окно записи." }
)
@tagMetadata("Брони", #{ description: "Брони гостей на слоты типов событий." })
@server("http://localhost:3000", "Локальная разработка")
@route("/api")
namespace CallCalendar;
