// Сгенерировано scripts/generate-api.mjs из api/openapi/openapi.yaml.
// Не редактируйте вручную: правка начинается с `.tsp`, затем
// `npm run build` в `api/` и `npm run generate:api` в `server/`.

/** Схемы контракта: `components.schemas` из OpenAPI. */
export const schemas = {
  "Booking": {
    "type": "object",
    "required": [
      "id",
      "eventTypeId",
      "date",
      "start",
      "end",
      "guestName",
      "guestEmail",
      "createdAt"
    ],
    "properties": {
      "id": {
        "type": "integer",
        "format": "int32"
      },
      "eventTypeId": {
        "type": "integer",
        "format": "int32",
        "description": "Тип события, по которому бронировали"
      },
      "date": {
        "$ref": "#/components/schemas/LocalDate"
      },
      "start": {
        "$ref": "#/components/schemas/LocalTime"
      },
      "end": {
        "allOf": [
          {
            "$ref": "#/components/schemas/LocalTime"
          }
        ],
        "description": "Вычисляется из `start` и снимка длительности брони"
      },
      "guestName": {
        "type": "string",
        "maxLength": 100,
        "description": "Имя гостя, непустое после trim, ≤ 100 символов"
      },
      "guestEmail": {
        "type": "string",
        "maxLength": 254,
        "description": "Email гостя, базовая проверка формата, ≤ 254 символов"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time",
        "description": "Момент создания брони"
      }
    },
    "description": "Бронь, созданная гостем. Длительность и интервал берутся из снимка брони,\n`eventTypeName` в ответе нет — гость знает тип, с которого пришёл."
  },
  "BookingCreate": {
    "type": "object",
    "required": [
      "eventTypeId",
      "date",
      "start",
      "guestName",
      "guestEmail"
    ],
    "properties": {
      "eventTypeId": {
        "type": "integer",
        "format": "int32",
        "description": "Тип события; тип должен существовать, иначе 404 event_type_not_found"
      },
      "date": {
        "allOf": [
          {
            "$ref": "#/components/schemas/LocalDate"
          }
        ],
        "description": "Дата в окне записи `[сегодня … сегодня + 13]`"
      },
      "start": {
        "allOf": [
          {
            "$ref": "#/components/schemas/LocalTime"
          }
        ],
        "description": "Начало, совпадает с реальным слотом этого типа и не в прошлом"
      },
      "guestName": {
        "type": "string",
        "maxLength": 100,
        "description": "Имя гостя, непустое после trim, ≤ 100 символов"
      },
      "guestEmail": {
        "type": "string",
        "maxLength": 254,
        "description": "Email гостя, базовая проверка формата, ≤ 254 символов"
      }
    },
    "description": "Тело `POST /api/bookings`"
  },
  "BookingListItem": {
    "type": "object",
    "required": [
      "id",
      "date",
      "start",
      "end",
      "eventTypeName",
      "guestName",
      "guestEmail",
      "createdAt"
    ],
    "properties": {
      "id": {
        "type": "integer",
        "format": "int32"
      },
      "date": {
        "$ref": "#/components/schemas/LocalDate"
      },
      "start": {
        "$ref": "#/components/schemas/LocalTime"
      },
      "end": {
        "$ref": "#/components/schemas/LocalTime"
      },
      "eventTypeName": {
        "type": "string",
        "description": "Имя типа события — join по `event_type_id`"
      },
      "guestName": {
        "type": "string"
      },
      "guestEmail": {
        "type": "string"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      }
    },
    "description": "Строка списка предстоящих броней. Отличается от `Booking`: вместо\n`eventTypeId` приходит имя типа (join по `event_type_id`)."
  },
  "BookingListResponse": {
    "type": "object",
    "required": [
      "bookings"
    ],
    "properties": {
      "bookings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/BookingListItem"
        }
      }
    }
  },
  "BookingResponse": {
    "type": "object",
    "required": [
      "booking"
    ],
    "properties": {
      "booking": {
        "$ref": "#/components/schemas/Booking"
      }
    }
  },
  "Day": {
    "type": "object",
    "required": [
      "date",
      "slots"
    ],
    "properties": {
      "date": {
        "$ref": "#/components/schemas/LocalDate"
      },
      "slots": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Slot"
        },
        "description": "Все слоты типа на дату, включая занятые и прошедшие"
      }
    },
    "description": "День окна записи: дата и сетка слотов типа на неё"
  },
  "EventType": {
    "type": "object",
    "required": [
      "id",
      "name",
      "description"
    ],
    "properties": {
      "id": {
        "type": "integer",
        "format": "int32",
        "description": "Идентификатор, генерирует система"
      },
      "name": {
        "type": "string",
        "maxLength": 100,
        "description": "Название, непустое после trim, ≤ 100 символов"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Описание, ≤ 1000 символов; по умолчанию пустая строка"
      }
    },
    "description": "Тип события — шаблон, по которому нарезаются слоты. Состав полей — ровно\nтри: идентификатор, название, описание. Длительность слота — константа\n30 минут (`SLOT_MINUTES`), в типе события не хранится."
  },
  "EventTypeCreate": {
    "type": "object",
    "required": [
      "name"
    ],
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 100,
        "description": "Название, непустое после trim, ≤ 100 символов"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Описание, ≤ 1000 символов",
        "default": ""
      }
    },
    "description": "Тело `POST /api/event-types`. Идентификатор генерирует система — в теле его нет."
  },
  "EventTypeListResponse": {
    "type": "object",
    "required": [
      "eventTypes"
    ],
    "properties": {
      "eventTypes": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/EventType"
        },
        "description": "Все типы событий, порядок по `id`; пустая база — пустой массив"
      }
    }
  },
  "EventTypeNotFoundErrorBody": {
    "type": "object",
    "required": [
      "status",
      "code",
      "message"
    ],
    "properties": {
      "status": {
        "type": "number",
        "enum": [
          404
        ],
        "description": "HTTP-статус, продублирован в теле ответа"
      },
      "code": {
        "type": "string",
        "enum": [
          "event_type_not_found"
        ],
        "description": "Машинный код — есть всегда"
      },
      "message": {
        "type": "string",
        "description": "Человекочитаемый текст (русский)"
      }
    },
    "description": "Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому\nветвится клиент, `message` — человекочитаемый текст."
  },
  "EventTypeNotFoundErrorResponse": {
    "type": "object",
    "required": [
      "error"
    ],
    "properties": {
      "error": {
        "$ref": "#/components/schemas/EventTypeNotFoundErrorBody"
      }
    },
    "description": "Конверт ошибки: тело ответа — объект с единственным ключом `error`"
  },
  "EventTypeResponse": {
    "type": "object",
    "required": [
      "eventType"
    ],
    "properties": {
      "eventType": {
        "$ref": "#/components/schemas/EventType"
      }
    }
  },
  "FieldError": {
    "type": "object",
    "required": [
      "field",
      "message"
    ],
    "properties": {
      "field": {
        "type": "string",
        "description": "Имя поля из тела запроса"
      },
      "message": {
        "type": "string",
        "description": "Человекочитаемое объяснение"
      }
    },
    "description": "Ошибка валидации одного поля тела запроса"
  },
  "InternalErrorBody": {
    "type": "object",
    "required": [
      "status",
      "code",
      "message"
    ],
    "properties": {
      "status": {
        "type": "number",
        "enum": [
          500
        ],
        "description": "HTTP-статус, продублирован в теле ответа"
      },
      "code": {
        "type": "string",
        "enum": [
          "internal_error"
        ],
        "description": "Машинный код — есть всегда"
      },
      "message": {
        "type": "string",
        "description": "Человекочитаемый текст (русский)"
      }
    },
    "description": "Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому\nветвится клиент, `message` — человекочитаемый текст."
  },
  "InternalErrorResponse": {
    "type": "object",
    "required": [
      "error"
    ],
    "properties": {
      "error": {
        "$ref": "#/components/schemas/InternalErrorBody"
      }
    },
    "description": "Конверт ошибки: тело ответа — объект с единственным ключом `error`"
  },
  "InvalidJsonErrorBody": {
    "type": "object",
    "required": [
      "status",
      "code",
      "message"
    ],
    "properties": {
      "status": {
        "type": "number",
        "enum": [
          400
        ],
        "description": "HTTP-статус, продублирован в теле ответа"
      },
      "code": {
        "type": "string",
        "enum": [
          "invalid_json"
        ],
        "description": "Машинный код — есть всегда"
      },
      "message": {
        "type": "string",
        "description": "Человекочитаемый текст (русский)"
      }
    },
    "description": "Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому\nветвится клиент, `message` — человекочитаемый текст."
  },
  "InvalidJsonErrorResponse": {
    "type": "object",
    "required": [
      "error"
    ],
    "properties": {
      "error": {
        "$ref": "#/components/schemas/InvalidJsonErrorBody"
      }
    },
    "description": "Конверт ошибки: тело ответа — объект с единственным ключом `error`"
  },
  "LocalDate": {
    "type": "string",
    "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
    "description": "Календарная дата, `YYYY-MM-DD`"
  },
  "LocalTime": {
    "type": "string",
    "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
    "description": "Время суток, `HH:MM`"
  },
  "Slot": {
    "type": "object",
    "required": [
      "start",
      "end",
      "available"
    ],
    "properties": {
      "start": {
        "allOf": [
          {
            "$ref": "#/components/schemas/LocalTime"
          }
        ],
        "description": "Начало слота на сетке типа"
      },
      "end": {
        "allOf": [
          {
            "$ref": "#/components/schemas/LocalTime"
          }
        ],
        "description": "Конец слота — `start` плюс длительность типа"
      },
      "available": {
        "type": "boolean",
        "description": "Свободен по единственному определению: интервал не пересекается ни с одной\nбронью и слот не в прошлом (для сегодня — начало строго в будущем).\nЗанятые и прошедшие слоты остаются в сетке с `false`."
      }
    },
    "description": "Слот — полуоткрытый интервал `[start, end)` внутри рабочего дня 09:00–18:00.\nДлительность слота всегда равна длительности типа; неполный остаток у правого\nкрая слотом не является и в сетке не появляется."
  },
  "SlotTakenErrorBody": {
    "type": "object",
    "required": [
      "status",
      "code",
      "message"
    ],
    "properties": {
      "status": {
        "type": "number",
        "enum": [
          409
        ],
        "description": "HTTP-статус, продублирован в теле ответа"
      },
      "code": {
        "type": "string",
        "enum": [
          "slot_taken"
        ],
        "description": "Машинный код — есть всегда"
      },
      "message": {
        "type": "string",
        "description": "Человекочитаемый текст (русский)"
      }
    },
    "description": "Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому\nветвится клиент, `message` — человекочитаемый текст."
  },
  "SlotTakenErrorResponse": {
    "type": "object",
    "required": [
      "error"
    ],
    "properties": {
      "error": {
        "$ref": "#/components/schemas/SlotTakenErrorBody"
      }
    },
    "description": "Конверт ошибки: тело ответа — объект с единственным ключом `error`"
  },
  "SlotsResponse": {
    "type": "object",
    "required": [
      "days"
    ],
    "properties": {
      "days": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Day"
        }
      }
    }
  },
  "ValidationErrorBody": {
    "type": "object",
    "required": [
      "status",
      "code",
      "message",
      "details"
    ],
    "properties": {
      "status": {
        "type": "number",
        "enum": [
          400
        ]
      },
      "code": {
        "type": "string",
        "enum": [
          "validation_error"
        ]
      },
      "message": {
        "type": "string"
      },
      "details": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FieldError"
        },
        "description": "Собрано по всем невалидным полям разом, а не по первому"
      }
    }
  },
  "ValidationErrorResponse": {
    "type": "object",
    "required": [
      "error"
    ],
    "properties": {
      "error": {
        "$ref": "#/components/schemas/ValidationErrorBody"
      }
    },
    "description": "Конверт ошибки: тело ответа — объект с единственным ключом `error`"
  }
};

/** Операции контракта: метод, путь и связанные схемы. */
export const operations = [
  {
    "operationId": "Bookings_list",
    "method": "get",
    "path": "/api/bookings",
    "expressPath": "/api/bookings",
    "resource": "Bookings",
    "summary": "Предстоящие брони",
    "bodySchema": null,
    "responses": {
      "200": "BookingListResponse",
      "500": "InternalErrorResponse"
    }
  },
  {
    "operationId": "Bookings_create",
    "method": "post",
    "path": "/api/bookings",
    "expressPath": "/api/bookings",
    "resource": "Bookings",
    "summary": "Создание брони",
    "bodySchema": "BookingCreate",
    "responses": {
      "201": "BookingResponse",
      "404": "EventTypeNotFoundErrorResponse",
      "409": "SlotTakenErrorResponse",
      "500": "InternalErrorResponse"
    }
  },
  {
    "operationId": "EventTypes_list",
    "method": "get",
    "path": "/api/event-types",
    "expressPath": "/api/event-types",
    "resource": "EventTypes",
    "summary": "Список типов событий",
    "bodySchema": null,
    "responses": {
      "200": "EventTypeListResponse",
      "500": "InternalErrorResponse"
    }
  },
  {
    "operationId": "EventTypes_create",
    "method": "post",
    "path": "/api/event-types",
    "expressPath": "/api/event-types",
    "resource": "EventTypes",
    "summary": "Создание типа события",
    "bodySchema": "EventTypeCreate",
    "responses": {
      "201": "EventTypeResponse",
      "500": "InternalErrorResponse"
    }
  },
  {
    "operationId": "EventTypeSlots_list",
    "method": "get",
    "path": "/api/event-types/{id}/slots",
    "expressPath": "/api/event-types/:id/slots",
    "resource": "EventTypeSlots",
    "summary": "Сетка слотов типа события",
    "bodySchema": null,
    "responses": {
      "200": "SlotsResponse",
      "404": "EventTypeNotFoundErrorResponse",
      "500": "InternalErrorResponse"
    }
  }
];
