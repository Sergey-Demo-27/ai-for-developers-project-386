// Валидация тела запроса по схемам, сгенерированным из контракта
// (`src/generated/spec.js`).
//
// Правила уровня схемы — обязательные поля, типы, длины, границы, форматы —
// приходят из OpenAPI и не дублируются руками. Смысловые правила, которые в
// схему не выражаются (trim, окно записи, реальность слота), остаются в
// обработчиках.

import Ajv from 'ajv';
import { schemas } from '../generated/spec.js';
import HttpError from '../lib/httpError.js';

const SPEC_ID = 'openapi.yaml';

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  useDefaults: true,
});

// Регистрируем весь контракт, чтобы ссылки `#/components/schemas/...`
// разрешались как есть, без дублирования схем.
ajv.addSchema({ $id: SPEC_ID, components: { schemas } });

// Форматы OpenAPI (`int32`, `date-time`, …) не проверяем — контракт выражает
// ограничения через `pattern`/`minimum`/`maximum`. Регистрация нужна, чтобы
// Ajv не ругался на незнакомые форматы.
for (const format of ['int32', 'int64', 'float', 'double', 'date', 'date-time', 'time']) {
  ajv.addFormat(format, true);
}

const compiled = new Map();

function compile(schemaName) {
  if (!compiled.has(schemaName)) {
    const validate = ajv.getSchema(
      `${SPEC_ID}#/components/schemas/${schemaName}`,
    );

    if (!validate) {
      throw new Error(`Схема «${schemaName}» не найдена в контракте`);
    }

    compiled.set(schemaName, validate);
  }

  return compiled.get(schemaName);
}

// Имя поля тела запроса по ошибке Ajv.
function fieldOf(error) {
  const path = error.instancePath
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .join('.');

  if (error.keyword === 'required') {
    return [path, error.params.missingProperty].filter(Boolean).join('.');
  }

  return path;
}

// Текст ошибки по ключевому слову JSON Schema: контракт хранит структуру,
// но не человекочитаемые сообщения, поэтому они подставляются здесь.
function messageOf(error) {
  const { params } = error;

  switch (error.keyword) {
    case 'required':
      return 'Поле обязательно';
    case 'type':
      return 'Некорректный тип значения';
    case 'minLength':
      return 'Поле не может быть пустым';
    case 'maxLength':
      return `Не более ${params.limit} символов`;
    case 'minimum':
      return `Значение не меньше ${params.limit}`;
    case 'maximum':
      return `Значение не больше ${params.limit}`;
    case 'pattern':
      return 'Некорректный формат значения';
    case 'enum':
      return 'Недопустимое значение';
    case 'additionalProperties':
      return 'Лишнее поле';
    default:
      return 'Некорректное значение';
  }
}

/**
 * Middleware валидации тела запроса по схеме контракта. При нарушении
 * передаёт в `errorHandler` ошибку `400 validation_error` с `details` по всем
 * невалидным полям сразу.
 *
 * @param {string} schemaName имя схемы из `components.schemas`
 */
export function validateBody(schemaName) {
  const validate = compile(schemaName);

  return (req, res, next) => {
    if (validate(req.body)) {
      return next();
    }

    const details = (validate.errors ?? []).map((error) => ({
      field: fieldOf(error),
      message: messageOf(error),
    }));

    return next(
      new HttpError(400, 'Некорректные данные запроса', {
        code: 'validation_error',
        details,
      }),
    );
  };
}
