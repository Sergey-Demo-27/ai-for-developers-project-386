namespace CallCalendar;

/**
 * Локальная календарная дата в формате `YYYY-MM-DD`.
 *
 * Время в проекте — локальное настенное (ADR 0002), поэтому это не `plainDate`
 * в смысле часового пояса, а именно настенная дата.
 */
@pattern("^\\d{4}-\\d{2}-\\d{2}$")
@doc("Календарная дата, `YYYY-MM-DD`")
scalar LocalDate extends string;

/**
 * Локальное настенное время суток в формате `HH:MM` (24 часа).
 */
@pattern("^([01]\\d|2[0-3]):[0-5]\\d$")
@doc("Время суток, `HH:MM`")
scalar LocalTime extends string;
