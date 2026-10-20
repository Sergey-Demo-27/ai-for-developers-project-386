import { Anchor, Container, Stack, Title } from '@mantine/core'
import { Link } from 'react-router'
import { routes } from '../../../shared/routes'

// Страница «не найдено» для неизвестных адресов — внутри общего layout'а.
// К `404 not_found` из API отношения не имеет: тот отвечает за неизвестный путь /api/…
export function NotFoundPage() {
  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="sm" align="flex-start">
        <Title order={1}>Страница не найдена</Title>
        <Anchor component={Link} to={routes.landing}>
          На главную
        </Anchor>
      </Stack>
    </Container>
  )
}
