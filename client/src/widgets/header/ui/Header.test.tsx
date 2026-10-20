import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import { Header } from './Header'

describe('Header', () => {
  it('ведёт на главную через логотип', () => {
    renderWithProviders(<Header />)

    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('содержит навигацию по трём разделам', () => {
    renderWithProviders(<Header />)

    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    )
    expect(
      screen.getByRole('link', { name: 'Предстоящие брони' }),
    ).toHaveAttribute('href', '/bookings')
    expect(
      screen.getByRole('link', { name: 'Типы событий' }),
    ).toHaveAttribute('href', '/event-types')
  })

  it('подсвечивает текущий раздел', () => {
    renderWithProviders(<Header />, { route: '/bookings' })

    expect(
      screen.getByRole('link', { name: 'Предстоящие брони' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: 'Записаться' }),
    ).not.toHaveAttribute('aria-current')
  })
})
