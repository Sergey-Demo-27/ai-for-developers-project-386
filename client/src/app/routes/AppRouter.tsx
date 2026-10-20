import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'

// Точка входа роутинга: Declarative-режим react-router (v8), SPA без SSR.
export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
