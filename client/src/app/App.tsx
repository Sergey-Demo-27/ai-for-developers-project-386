import { Box } from '@mantine/core'
import { LandingPage } from '../pages/landing'
import { Header } from '../widgets/header'

// Композиция приложения: общая шапка + контент страницы.
// Когда появятся маршруты (/booking, /events), сюда встанет роутер.
export function App() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <LandingPage />
    </Box>
  )
}
