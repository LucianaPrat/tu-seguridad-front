import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { TIMEZONES } from "@/data/timezones"

interface TimezoneComboboxProps {
  value: string
  onChange: (iana: string) => void
  error?: string
}

/**
 * shadcn/ui combobox pattern (Popover + Command). Replaces the handrolled
 * dropdown, which positioned its panel with `absolute` but had no positioned
 * ancestor. Search still matches IANA name, label and UTC offset.
 */
export default function TimezoneCombobox({ value, onChange, error }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = TIMEZONES.find((tz) => tz.iana === value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="timezone">Zona horaria</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id="timezone"
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2.5 text-sm transition-colors hover:border-ring/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
          >
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected ? `${selected.iana} — ${selected.offset}` : "Seleccioná una zona horaria"}
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar zona horaria..." />
            <CommandList>
              <CommandEmpty>Sin resultados</CommandEmpty>
              <CommandGroup>
                {TIMEZONES.map((tz) => (
                  <CommandItem
                    key={tz.iana}
                    value={`${tz.iana} ${tz.label} ${tz.offset}`}
                    onSelect={() => {
                      onChange(tz.iana)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("size-4", tz.iana === value ? "opacity-100" : "opacity-0")}
                    />
                    <span className="flex-1">{tz.iana}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">{tz.offset}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
