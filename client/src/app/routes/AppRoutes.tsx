import { Route, Routes } from 'react-router'
import { BookingPage } from '../../pages/booking'
import { BookingsPage } from '../../pages/bookings'
import { EventTypesPage } from '../../pages/event-types'
import { LandingPage } from '../../pages/landing'
import { NotFoundPage } from '../../pages/not-found'
import { routes } from '../../shared/routes'
import { AppLayout } from './AppLayout'

// Дерево маршрутов без BrowserRouter — его удобно тестировать под MemoryRouter.
// Все маршруты обёрнуты общим layout'ом «шапка + содержимое», включая «не найдено».
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path={routes.booking} element={<BookingPage />} />
        <Route path={routes.bookings} element={<BookingsPage />} />
        <Route path={routes.eventTypes} element={<EventTypesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
