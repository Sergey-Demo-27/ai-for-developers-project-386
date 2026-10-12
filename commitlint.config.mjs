/**
 * Правила проверки сообщений коммитов (Conventional Commits).
 * Соглашение описано в CONTRIBUTING.md.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Заголовок коммита короче стандартного лимита config-conventional (100).
    'header-max-length': [2, 'always', 72],
    // Допустимые области (scope) — по структуре проекта.
    // `main` нужен для коммитов release-please (`chore(main): release ...`).
    'scope-enum': [
      2,
      'always',
      ['server', 'client', 'db', 'api', 'ui', 'ci', 'deps', 'docs', 'main'],
    ],
    // Регистр описания не проверяем: допускаются русский и английский.
    'subject-case': [0],
    // Точка в конце заголовка недопустима.
    'subject-full-stop': [2, 'never', '.'],
  },
};
