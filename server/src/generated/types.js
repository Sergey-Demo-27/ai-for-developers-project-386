// Сгенерировано scripts/generate-api.mjs из api/openapi/openapi.yaml.
// Не редактируйте вручную: правка начинается с `.tsp`, затем
// `npm run build` в `api/` и `npm run generate:api` в `server/`.

// JSDoc-типы контракта. Подключаются аннотацией:
//   /** @type {import('./types.js').EventTypeCreate} */
/**
 * Бронь, созданная гостем. Длительность и интервал берутся из снимка брони, `eventTypeName` в ответе нет — гость знает тип, с которого пришёл.
 * @typedef {Object} Booking
 * @property {number} id
 * @property {number} eventTypeId — Тип события, по которому бронировали
 * @property {LocalDate} date
 * @property {LocalTime} start
 * @property {LocalTime} end — Вычисляется из `start` и снимка длительности брони
 * @property {string} guestName — Имя гостя, непустое после trim, ≤ 100 символов
 * @property {string} guestEmail — Email гостя, базовая проверка формата, ≤ 254 символов
 * @property {string} createdAt — Момент создания брони
 */

/**
 * Тело `POST /api/bookings`
 * @typedef {Object} BookingCreate
 * @property {number} eventTypeId — Тип события; тип должен существовать, иначе 404 event_type_not_found
 * @property {LocalDate} date — Дата в окне записи `[сегодня … сегодня + 13]`
 * @property {LocalTime} start — Начало, совпадает с реальным слотом этого типа и не в прошлом
 * @property {string} guestName — Имя гостя, непустое после trim, ≤ 100 символов
 * @property {string} guestEmail — Email гостя, базовая проверка формата, ≤ 254 символов
 */

/**
 * Строка списка предстоящих броней. Отличается от `Booking`: вместо `eventTypeId` приходит имя типа (join по `event_type_id`).
 * @typedef {Object} BookingListItem
 * @property {number} id
 * @property {LocalDate} date
 * @property {LocalTime} start
 * @property {LocalTime} end
 * @property {string} eventTypeName — Имя типа события — join по `event_type_id`
 * @property {string} guestName
 * @property {string} guestEmail
 * @property {string} createdAt
 */

/**
 * Схема контракта.
 * @typedef {Object} BookingListResponse
 * @property {Array<BookingListItem>} bookings
 */

/**
 * Схема контракта.
 * @typedef {Object} BookingResponse
 * @property {Booking} booking
 */

/**
 * День окна записи: дата и сетка слотов типа на неё
 * @typedef {Object} Day
 * @property {LocalDate} date
 * @property {Array<Slot>} slots — Все слоты типа на дату, включая занятые и прошедшие
 */

/**
 * Тип события — шаблон, по которому нарезаются слоты. Состав полей — ровно три: идентификатор, название, описание. Длительность слота — константа 30 минут (`SLOT_MINUTES`), в типе события не хранится.
 * @typedef {Object} EventType
 * @property {number} id — Идентификатор, генерирует система
 * @property {string} name — Название, непустое после trim, ≤ 100 символов
 * @property {string} description — Описание, ≤ 1000 символов; по умолчанию пустая строка
 */

/**
 * Тело `POST /api/event-types`. Идентификатор генерирует система — в теле его нет.
 * @typedef {Object} EventTypeCreate
 * @property {string} name — Название, непустое после trim, ≤ 100 символов
 * @property {string} [description] — Описание, ≤ 1000 символов
 */

/**
 * Схема контракта.
 * @typedef {Object} EventTypeListResponse
 * @property {Array<EventType>} eventTypes — Все типы событий, порядок по `id`; пустая база — пустой массив
 */

/**
 * Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому ветвится клиент, `message` — человекочитаемый текст.
 * @typedef {Object} EventTypeNotFoundErrorBody
 * @property {404} status — HTTP-статус, продублирован в теле ответа
 * @property {"event_type_not_found"} code — Машинный код — есть всегда
 * @property {string} message — Человекочитаемый текст (русский)
 */

/**
 * Конверт ошибки: тело ответа — объект с единственным ключом `error`
 * @typedef {Object} EventTypeNotFoundErrorResponse
 * @property {EventTypeNotFoundErrorBody} error
 */

/**
 * Схема контракта.
 * @typedef {Object} EventTypeResponse
 * @property {EventType} eventType
 */

/**
 * Ошибка валидации одного поля тела запроса
 * @typedef {Object} FieldError
 * @property {string} field — Имя поля из тела запроса
 * @property {string} message — Человекочитаемое объяснение
 */

/**
 * Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому ветвится клиент, `message` — человекочитаемый текст.
 * @typedef {Object} InternalErrorBody
 * @property {500} status — HTTP-статус, продублирован в теле ответа
 * @property {"internal_error"} code — Машинный код — есть всегда
 * @property {string} message — Человекочитаемый текст (русский)
 */

/**
 * Конверт ошибки: тело ответа — объект с единственным ключом `error`
 * @typedef {Object} InternalErrorResponse
 * @property {InternalErrorBody} error
 */

/**
 * Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому ветвится клиент, `message` — человекочитаемый текст.
 * @typedef {Object} InvalidJsonErrorBody
 * @property {400} status — HTTP-статус, продублирован в теле ответа
 * @property {"invalid_json"} code — Машинный код — есть всегда
 * @property {string} message — Человекочитаемый текст (русский)
 */

/**
 * Конверт ошибки: тело ответа — объект с единственным ключом `error`
 * @typedef {Object} InvalidJsonErrorResponse
 * @property {InvalidJsonErrorBody} error
 */

/**
 * Календарная дата, `YYYY-MM-DD`
 * @typedef {string} LocalDate
 */

/**
 * Время суток, `HH:MM`
 * @typedef {string} LocalTime
 */

/**
 * Слот — полуоткрытый интервал `[start, end)` внутри рабочего дня 09:00–18:00. Длительность слота всегда равна длительности типа; неполный остаток у правого края слотом не является и в сетке не появляется.
 * @typedef {Object} Slot
 * @property {LocalTime} start — Начало слота на сетке типа
 * @property {LocalTime} end — Конец слота — `start` плюс длительность типа
 * @property {boolean} available — Свободен по единственному определению: интервал не пересекается ни с одной бронью и слот не в прошлом (для сегодня — начало строго в будущем). Занятые и прошедшие слоты остаются в сетке с `false`.
 */

/**
 * Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому ветвится клиент, `message` — человекочитаемый текст.
 * @typedef {Object} SlotTakenErrorBody
 * @property {409} status — HTTP-статус, продублирован в теле ответа
 * @property {"slot_taken"} code — Машинный код — есть всегда
 * @property {string} message — Человекочитаемый текст (русский)
 */

/**
 * Конверт ошибки: тело ответа — объект с единственным ключом `error`
 * @typedef {Object} SlotTakenErrorResponse
 * @property {SlotTakenErrorBody} error
 */

/**
 * Схема контракта.
 * @typedef {Object} SlotsResponse
 * @property {Array<Day>} days
 */

/**
 * Схема контракта.
 * @typedef {Object} ValidationErrorBody
 * @property {400} status
 * @property {"validation_error"} code
 * @property {string} message
 * @property {Array<FieldError>} details — Собрано по всем невалидным полям разом, а не по первому
 */

/**
 * Конверт ошибки: тело ответа — объект с единственным ключом `error`
 * @typedef {Object} ValidationErrorResponse
 * @property {ValidationErrorBody} error
 */
