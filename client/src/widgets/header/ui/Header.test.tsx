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

  it('содержит навигацию на запись и предстоящие события', () => {
    renderWithProviders(<Header />)

    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    )
    expect(
      screen.getByRole('link', { name: 'Предстоящие события' }),
    ).toHaveAttribute('href', '/events')
  })
})
