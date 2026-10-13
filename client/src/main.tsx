import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { Providers } from './app/providers'

// Точка входа Vite: только монтирование. Провайдеры — в app/providers,
// композиция приложения — в app/App.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
