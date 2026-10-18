import "@typespec/http";

using TypeSpec.Http;

namespace CallCalendar;

@doc("Ошибка валидации одного поля тела запроса")
model FieldError {
  @doc("Имя поля из тела запроса")
  field: string;

  @doc("Человекочитаемое объяснение")
  message: string;
}

@doc("""
  Тело ошибки: `status` дублирует HTTP-статус, `code` — машинный код, по которому
  ветвится клиент, `message` — человекочитаемый текст.
  """)
model ErrorBody<Status extends int32, Code extends string> {
  @doc("HTTP-статус, продублирован в теле ответа")
  status: Status;

  @doc("Машинный код — есть всегда")
  code: Code;

  @doc("Человекочитаемый текст (русский)")
  message: string;
}

@doc("Конверт ошибки: тело ответа — объект с единственным ключом `error`")
model ErrorEnvelope<Body> {
  error: Body;
}

// У каждого кода свой ответ, поэтому вместо безымянных инстанциаций `ErrorBody<…>`
// каждый код получает имя через `model … is …` — тогда схемы попадают
// в `components` и переиспользуются по `$ref`.

// 400 validation_error: тело описано явно — `details` есть только у этой ошибки.

model ValidationErrorBody {
  status: 400;
  code: "validation_error";
  message: string;

  @doc("Собрано по всем невалидным полям разом, а не по первому")
  details: FieldError[];
}

model ValidationErrorResponse is ErrorEnvelope<ValidationErrorBody>;

@doc("Поля тела не прошли правила валидации")
@error
model ValidationError {
  @statusCode _: 400;
  @body body: ValidationErrorResponse;
}

// 400 invalid_json

model InvalidJsonErrorBody is ErrorBody<400, "invalid_json">;

model InvalidJsonErrorResponse is ErrorEnvelope<InvalidJsonErrorBody>;

@doc("Тело запроса не разбирается как JSON")
@error
model InvalidJsonError {
  @statusCode _: 400;
  @body body: InvalidJsonErrorResponse;
}

// 404 not_found

model NotFoundErrorBody is ErrorBody<404, "not_found">;

model NotFoundErrorResponse is ErrorEnvelope<NotFoundErrorBody>;

@doc("Маршрут не существует")
@error
model NotFoundError {
  @statusCode _: 404;
  @body body: NotFoundErrorResponse;
}

// 404 event_type_not_found

model EventTypeNotFoundErrorBody is ErrorBody<404, "event_type_not_found">;

model EventTypeNotFoundErrorResponse
  is ErrorEnvelope<EventTypeNotFoundErrorBody>;

@doc("Тип события с таким `id` не найден")
@error
model EventTypeNotFoundError {
  @statusCode _: 404;
  @body body: EventTypeNotFoundErrorResponse;
}

// 409 slot_taken

model SlotTakenErrorBody is ErrorBody<409, "slot_taken">;

model SlotTakenErrorResponse is ErrorEnvelope<SlotTakenErrorBody>;

@doc("Слот пересекается с существующей бронью")
@error
model SlotTakenError {
  @statusCode _: 409;
  @body body: SlotTakenErrorResponse;
}

// 500 internal_error

model InternalErrorBody is ErrorBody<500, "internal_error">;

model InternalErrorResponse is ErrorEnvelope<InternalErrorBody>;

@doc("Непредвиденная ошибка")
@error
model InternalError {
  @statusCode _: 500;
  @body body: InternalErrorResponse;
}
