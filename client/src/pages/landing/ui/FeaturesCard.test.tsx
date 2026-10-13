import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import { FeaturesCard } from './FeaturesCard'

describe('FeaturesCard', () => {
  it('перечисляет возможности сервиса', () => {
    renderWithProviders(<FeaturesCard />)

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Что доступно прямо сейчас',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/фиксированные 30-минутные слоты/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/проверка конфликта при бронировании/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/просмотр предстоящих событий/i),
    ).toBeInTheDocument()
  })
})
