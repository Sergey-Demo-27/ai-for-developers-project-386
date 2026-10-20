// Генератор серверных артефактов из OpenAPI-спецификации.
//
// Читает `api/openapi/openapi.yaml` (собранный из TypeSpec в проекте `api/`)
// и пишет в `src/generated/`:
//
//   - spec.js   — схемы `components.schemas` и список операций (данные);
//   - types.js  — JSDoc-типы на каждую схему контракта;
//   - routes.js — заготовки Express-маршрутов, сгруппированные по ресурсам.
//
// Файлы закоммичены и не редактируются руками: правка начинается с `.tsp`,
// затем `npm run build` в `api/` и `npm run generate:api` здесь. CI-джоба
// `server` падает, если сгенерированное разошлось со спецификацией.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, '..');
const specPath = join(serverRoot, '..', 'api', 'openapi', 'openapi.yaml');
const outDir = join(serverRoot, 'src', 'generated');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const spec = parse(readFileSync(specPath, 'utf8'));
const schemas = spec.components?.schemas ?? {};
const operations = collectOperations(spec);

mkdirSync(outDir, { recursive: true });

const banner = `// Сгенерировано scripts/generate-api.mjs из api/openapi/openapi.yaml.
// Не редактируйте вручную: правка начинается с \`.tsp\`, затем
// \`npm run build\` в \`api/\` и \`npm run generate:api\` в \`server/\`.
`;

writeFileSync(join(outDir, 'spec.js'), renderSpec(banner, schemas, operations));
writeFileSync(join(outDir, 'types.js'), renderTypes(banner, schemas));
writeFileSync(join(outDir, 'routes.js'), renderRoutes(banner, operations));

console.log(
  `Сгенерировано: src/generated/{spec,types,routes}.js ` +
    `(${Object.keys(schemas).length} схем, ${operations.length} операций)`,
);

// --- сбор операций из paths ------------------------------------------------

function collectOperations(doc) {
  const result = [];

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;

      const operationId = op.operationId;
      if (!operationId) {
        throw new Error(`У операции ${method.toUpperCase()} ${path} нет operationId`);
      }

      result.push({
        operationId,
        method,
        path,
        expressPath: toExpressPath(path),
        resource: operationId.split('_')[0],
        summary: op.summary ?? '',
        bodySchema: refName(
          op.requestBody?.content?.['application/json']?.schema,
        ),
        responses: collectResponses(op.responses),
      });
    }
  }

  return result;
}

function toExpressPath(path) {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function refName(schema) {
  const ref = schema?.$ref ?? schema?.allOf?.[0]?.$ref;
  return ref ? ref.split('/').pop() : null;
}

function collectResponses(responses = {}) {
  const result = {};
  for (const [status, response] of Object.entries(responses)) {
    const name = refName(response?.content?.['application/json']?.schema);
    if (name) result[status] = name;
  }
  return result;
}

// --- spec.js ---------------------------------------------------------------

function renderSpec(banner, schemas, operations) {
  return `${banner}
/** Схемы контракта: \`components.schemas\` из OpenAPI. */
export const schemas = ${JSON.stringify(schemas, null, 2)};

/** Операции контракта: метод, путь и связанные схемы. */
export const operations = ${JSON.stringify(operations, null, 2)};
`;
}

// --- types.js --------------------------------------------------------------

function renderTypes(banner, schemas) {
  const blocks = Object.entries(schemas).map(([name, schema]) =>
    renderType(name, schema),
  );

  return `${banner}
// JSDoc-типы контракта. Подключаются аннотацией:
//   /** @type {import('./types.js').EventTypeCreate} */
${blocks.join('\n')}`;
}

function renderType(name, schema) {
  if (schema.type !== 'object') {
    return `/**
 * ${describe(schema)}
 * @typedef {${typeExpr(schema)}} ${name}
 */
`;
  }

  const required = new Set(schema.required ?? []);
  const properties = Object.entries(schema.properties ?? {}).map(
    ([prop, propSchema]) => {
      const optional = required.has(prop) ? '' : '[';
      const close = required.has(prop) ? '' : ']';
      const doc = propSchema.description ? ` — ${oneLine(propSchema.description)}` : '';
      return ` * @property {${typeExpr(propSchema)}} ${optional}${prop}${close}${doc}`;
    },
  );

  const lines = [
    '/**',
    ` * ${describe(schema)}`,
    ` * @typedef {Object} ${name}`,
    ...properties,
    ' */',
  ];
  return `${lines.join('\n')}\n`;
}

function typeExpr(schema) {
  if (!schema) return 'unknown';

  if (schema.$ref) return schema.$ref.split('/').pop();

  if (schema.allOf?.length) {
    const members = schema.allOf.map(typeExpr);
    return members.length === 1 ? members[0] : `(${members.join(' | ')})`;
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  }

  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `Array<${typeExpr(schema.items)}>`;
    case 'object':
      return 'Object';
    default:
      return 'unknown';
  }
}

function describe(schema) {
  const doc = schema.description ?? schema.title ?? '';
  return oneLine(doc) || 'Схема контракта.';
}

function oneLine(text) {
  return String(text).replace(/\s*\n\s*/g, ' ').trim();
}

// --- routes.js -------------------------------------------------------------

function renderRoutes(banner, operations) {
  const byResource = new Map();
  for (const op of operations) {
    if (!byResource.has(op.resource)) byResource.set(op.resource, []);
    byResource.get(op.resource).push(op);
  }

  const routers = [...byResource.entries()].map(([resource, ops]) =>
    renderRouter(resource, ops),
  );

  const mounts = [...byResource.keys()]
    .map((resource) => `  apiRouter.use(${camel(resource)}Router);`)
    .join('\n');

  return `${banner}
import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';

// Заготовка обработчика: маршрут зарегистрирован по контракту, но логика ещё
// не написана. Ответ 501 — временная заглушка каркаса, в контракт не входит.
function stub(operationId) {
  return (req, res) => {
    res.status(501).json({
      error: {
        status: 501,
        code: 'not_implemented',
        message: \`Обработчик «\${operationId}» ещё не реализован\`,
      },
    });
  };
}

/**
 * Собирает Express-роутер из маршрутов контракта. Тела запросов проверяются
 * схемами OpenAPI; реализацию подставляет вызывающий — по \`operationId\`.
 *
 * @param {Record<string, import('express').RequestHandler>} [handlers]
 *   обработчики операций по \`operationId\`; для операции без обработчика
 *   маршрут отвечает 501 not_implemented.
 * @returns {import('express').Router}
 */
export function createApiRouter(handlers = {}) {
${routers.join('\n')}
  /** Все сгенерированные маршруты контракта. */
  const apiRouter = Router();
${mounts}
  return apiRouter;
}
`;
}

function renderRouter(resource, ops) {
  const name = `${camel(resource)}Router`;
  const routes = ops
    .map((op) => {
      const middlewares = op.bodySchema ? `validateBody('${op.bodySchema}'), ` : '';
      const handler = `handlers['${op.operationId}'] ?? stub('${op.operationId}')`;
      return `  // ${op.summary}\n  ${name}.${op.method}('${op.expressPath}', ${middlewares}${handler});`;
    })
    .join('\n');

  return `  /** Ресурс «${resource}». */
  const ${name} = Router();
${routes}
`;
}

function camel(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
