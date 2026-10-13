import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { theme } from '../app/providers'

// Обёртка для тестов: компонентам Mantine нужен MantineProvider в дереве.
export function renderWithProviders(ui: ReactElement) {
  return render(<MantineProvider theme={theme}>{ui}</MantineProvider>)
}
