import { Badge, Button, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { routes } from '../../../shared/routes'

// Герой главной страницы: оффер и кнопка «Записаться».
// Кнопка — ссылка роутера на страницу записи: переход без перезагрузки.
export function Hero() {
  return (
    <Stack gap="lg" align="flex-start">
      <Badge
        variant="light"
        color="gray"
        radius="xl"
        size="lg"
        tt="uppercase"
        fw={600}
        style={{ letterSpacing: '0.06em' }}
      >
        Быстрая запись на звонок
      </Badge>

      <Title order={1} fz="3.5rem" lh={1.1} fw={800}>
        Calendar
      </Title>

      <Text size="lg" c="dimmed" maw={520}>
        Один экран, понятные слоты, быстрая бронь. Выберите время и запишитесь
        на звонок без лишних шагов.
      </Text>

      <Button
        component={Link}
        to={routes.booking}
        size="lg"
        radius="md"
        rightSection={<span aria-hidden="true">→</span>}
      >
        Записаться
      </Button>
    </Stack>
  )
}
