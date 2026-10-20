import type { ReactNode } from 'react'
import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core'

type ListStateProps = {
  /** Идёт загрузка — показываем спиннер вместо содержимого. */
  loading?: boolean
  /** Текст ошибки; `null`/`undefined` — ошибки нет. */
  error?: string | null
  /** Повторный запрос по кнопке «Повторить». */
  onRetry?: () => void
  children: ReactNode
}

// Переиспользуемый блок состояния списка: спиннер на время загрузки, сообщение
// с кнопкой «Повторить» при сбое и содержимое во всех остальных случаях.
// Тот же паттерн нужен владельцу, слот-календарю и списку броней (#10, #11).
export function ListState({ loading, error, onRetry, children }: ListStateProps) {
  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader aria-label="Загрузка" />
      </Group>
    )
  }

  if (error) {
    return (
      <Alert color="red" title="Не удалось загрузить данные">
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{error}</Text>
          {onRetry && (
            <Button variant="light" color="red" onClick={onRetry}>
              Повторить
            </Button>
          )}
        </Stack>
      </Alert>
    )
  }

  return <>{children}</>
}
