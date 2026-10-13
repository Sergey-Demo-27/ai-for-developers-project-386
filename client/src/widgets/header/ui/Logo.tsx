// Оранжевая иконка-логотип: календарь с круговой стрелкой.
// Инлайн-SVG без внешних зависимостей; цвет берём из темы (primary orange).
export function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ color: 'var(--mantine-color-orange-6)', flexShrink: 0 }}
    >
      <rect
        x="3"
        y="4.5"
        width="18"
        height="16.5"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 2.5v3M16 2.5v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12.4 12.2a2.5 2.5 0 1 0 2.3 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 11.6l-.2 2.6-2.5-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
