import { Button, Paper, Stack, Text } from '@mantine/core'

// Экран успеха: карточка с подтверждением и единственной кнопкой «Забронировать
// ещё». Кнопка возвращает на шаг записи, сохраняя тип и дату и сбрасывая слот;
// ссылки на список броней здесь нет.
export function SuccessPanel({ onBookAgain }: { onBookAgain: () => void }) {
  return (
    <Paper
      component="section"
      aria-label="Бронь подтверждена"
      radius="lg"
      p="xl"
      shadow="sm"
      withBorder
      h="100%"
    >
      <Stack gap="lg" align="center" justify="center" h="100%">
        <Text fw={600} size="lg">
          Бронь подтверждена. До встречи!
        </Text>
        <Button onClick={onBookAgain}>Забронировать ещё</Button>
      </Stack>
    </Paper>
  )
}
