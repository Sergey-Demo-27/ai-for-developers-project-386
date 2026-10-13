import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'

// Стили Mantine: core нужен всегда, остальные — под используемые пакеты.
// (у @mantine/hooks, @mantine/form и @mantine/modals своих стилей нет)
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import '../styles/index.css'

import { theme } from './theme'

// Провайдеры приложения: тема, модалки, уведомления.
// Дизайн светлый, поэтому цветовая схема зафиксирована в 'light'.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ModalsProvider>
        <Notifications />
        {children}
      </ModalsProvider>
    </MantineProvider>
  )
}
