import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { theme } from '../app/providers'

// Обёртка для тестов: MantineProvider + контекст роутера.
// Ссылки и хуки react-router (Link, NavLink) вне роутера падают,
// поэтому MemoryRouter подставляем всегда, а стартовый URL — через `route`.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/' }: { route?: string } = {},
) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MantineProvider>,
  )
}
