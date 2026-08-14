export interface Timezone {
  iana: string
  label: string
  offset: string
}

export const TIMEZONES: Timezone[] = [
  { iana: "America/Argentina/Buenos_Aires", label: "Buenos Aires", offset: "UTC-03:00" },
  { iana: "America/Argentina/Cordoba", label: "Córdoba", offset: "UTC-03:00" },
  { iana: "America/Argentina/Mendoza", label: "Mendoza", offset: "UTC-03:00" },
  { iana: "America/Sao_Paulo", label: "São Paulo", offset: "UTC-03:00" },
  { iana: "America/Santiago", label: "Santiago", offset: "UTC-04:00" },
  { iana: "America/Lima", label: "Lima", offset: "UTC-05:00" },
  { iana: "America/Bogota", label: "Bogotá", offset: "UTC-05:00" },
  { iana: "America/New_York", label: "New York", offset: "UTC-05:00" },
  { iana: "America/Chicago", label: "Chicago", offset: "UTC-06:00" },
  { iana: "America/Denver", label: "Denver", offset: "UTC-07:00" },
  { iana: "America/Los_Angeles", label: "Los Ángeles", offset: "UTC-08:00" },
  { iana: "America/Mexico_City", label: "Ciudad de México", offset: "UTC-06:00" },
  { iana: "America/Caracas", label: "Caracas", offset: "UTC-04:00" },
  { iana: "America/La_Paz", label: "La Paz", offset: "UTC-04:00" },
  { iana: "America/Asuncion", label: "Asunción", offset: "UTC-04:00" },
  { iana: "America/Montevideo", label: "Montevideo", offset: "UTC-03:00" },
  { iana: "Europe/Madrid", label: "Madrid", offset: "UTC+02:00" },
  { iana: "Europe/London", label: "Londres", offset: "UTC+01:00" },
  { iana: "Europe/Paris", label: "París", offset: "UTC+02:00" },
  { iana: "UTC", label: "UTC", offset: "UTC+00:00" },
]
