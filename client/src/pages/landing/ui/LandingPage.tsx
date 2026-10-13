import { Box, Container, Grid } from '@mantine/core'
import { FeaturesCard } from './FeaturesCard'
import { Hero } from './Hero'

// Главная страница: рассказывает про сервис и ведёт на запись.
// Фон — градиент голубой → персиковый (как в макете).
export function LandingPage() {
  return (
    <Box
      component="main"
      style={{
        flex: 1,
        background:
          'linear-gradient(120deg, #d8e5f7 0%, #eef1f4 45%, #fbe4d0 100%)',
      }}
    >
      <Container size="lg" pt={56} pb="xl">
        <Grid gap="xl" align="flex-start">
          <Grid.Col span={6}>
            <Hero />
          </Grid.Col>
          <Grid.Col span={6}>
            <FeaturesCard />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  )
}
