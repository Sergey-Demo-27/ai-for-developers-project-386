import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRouter } from './app/routes'
import { Providers } from './app/providers'

// Точка входа Vite: только монтирование. Провайдеры — в app/providers,
// роутер и layout — в app/routes.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
)
