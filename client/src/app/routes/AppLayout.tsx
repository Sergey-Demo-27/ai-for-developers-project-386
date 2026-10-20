import { Box } from '@mantine/core'
import { Outlet } from 'react-router'
import { Header } from '../../widgets/header'

// Общая рамка приложения: шапка остаётся на месте, контент страницы приходит
// в outlet. Layout живёт в app/routes, а не в widgets: срезу слоя widgets
// запрещено импортировать другой срез того же слоя (widgets/layout → widgets/header).
export function AppLayout() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Outlet />
    </Box>
  )
}
