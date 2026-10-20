import type { ReactNode } from 'react'
import { Anchor, Box, Container, Group, Text } from '@mantine/core'
import { Link, NavLink } from 'react-router'
import { routes } from '../../../shared/routes'
import { Logo } from './Logo'

// Пункт навигации: react-router NavLink даёт клиентский переход, `aria-current`
// активного раздела и рендер-проп с `isActive` — им и красим текущий раздел.
function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Text size="sm" c={isActive ? 'dark' : 'dimmed'} fw={isActive ? 600 : 400}>
          {children}
        </Text>
      )}
    </NavLink>
  )
}

// Общая шапка приложения: логотип ведёт на главную, три раздела — на /booking,
// /bookings и /event-types. Ссылки — роутера, поэтому страница не перезагружается.
export function Header() {
  return (
    <Box
      component="header"
      bg="white"
      py="md"
      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
    >
      <Container size="lg">
        <Group justify="space-between" align="center">
          <Anchor
            component={Link}
            to={routes.landing}
            underline="never"
            c="dark"
            fw={700}
            fz="xl"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Logo />
            Calendar
          </Anchor>

          <Group component="nav" gap="xl">
            <NavItem to={routes.booking}>Записаться</NavItem>
            <NavItem to={routes.bookings}>Предстоящие брони</NavItem>
            <NavItem to={routes.eventTypes}>Типы событий</NavItem>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}
