import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { App } from './App'

describe('App', () => {
  it('собирает главную страницу: шапка, герой и карточка', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Calendar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Что доступно прямо сейчас',
      }),
    ).toBeInTheDocument()
  })

  it('ведёт на страницу записи', () => {
    renderWithProviders(<App />)

    // Ссылка «Записаться» есть и в шапке, и в кнопке героя — обе ведут на /booking.
    const links = screen.getAllByRole('link', { name: 'Записаться' })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/booking'))
  })
})
