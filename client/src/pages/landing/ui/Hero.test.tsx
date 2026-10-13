import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import { Hero } from './Hero'

describe('Hero', () => {
  it('показывает оффер сервиса', () => {
    renderWithProviders(<Hero />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Calendar' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/быстрая запись на звонок/i)).toBeInTheDocument()
    expect(screen.getByText(/один экран, понятные слоты/i)).toBeInTheDocument()
  })

  it('ведёт на страницу записи', () => {
    renderWithProviders(<Hero />)

    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute(
      'href',
      '/booking',
    )
  })
})
