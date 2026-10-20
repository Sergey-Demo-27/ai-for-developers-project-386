import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { ListState } from './ListState'

describe('ListState', () => {
  it('показывает спиннер на время загрузки', () => {
    renderWithProviders(
      <ListState loading>
        <p>Содержимое</p>
      </ListState>,
    )

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()
    expect(screen.queryByText('Содержимое')).not.toBeInTheDocument()
  })

  it('показывает сообщение и повторяет запрос по кнопке', async () => {
    const onRetry = vi.fn()

    renderWithProviders(
      <ListState error="Что-то сломалось" onRetry={onRetry}>
        <p>Содержимое</p>
      </ListState>,
    )

    expect(screen.getByText('Что-то сломалось')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('показывает содержимое, когда нет загрузки и ошибки', () => {
    renderWithProviders(
      <ListState>
        <p>Содержимое</p>
      </ListState>,
    )

    expect(screen.getByText('Содержимое')).toBeInTheDocument()
  })
})
