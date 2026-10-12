import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('отрисовывает заголовок', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /get started/i }),
    ).toBeInTheDocument()
  })

  it('увеличивает счётчик по клику', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /count is 0/i }))

    expect(
      screen.getByRole('button', { name: /count is 1/i }),
    ).toBeInTheDocument()
  })
})
