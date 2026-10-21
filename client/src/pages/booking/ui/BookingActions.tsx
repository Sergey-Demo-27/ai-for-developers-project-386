import { Button, Group } from '@mantine/core'
import { Link } from 'react-router'
import { routes } from '../../../shared/routes'

// Нижний ряд правой панели: «Назад» на лендинг — предыдущего шага у потока нет —
// и «Продолжить», активная только при выбранных типе, дате и свободном слоте.
// До этого она видна, но заблокирована.
export function BookingActions({
  canContinue,
  onContinue,
}: {
  canContinue: boolean
  onContinue?: () => void
}) {
  return (
    <Group justify="space-between">
      <Button component={Link} to={routes.landing} variant="default">
        Назад
      </Button>
      <Button disabled={!canContinue} onClick={onContinue}>
        Продолжить
      </Button>
    </Group>
  )
}
