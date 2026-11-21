import { useState } from "react"
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min"
import type { CountryCode } from "libphonenumber-js/min"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useT } from "@/hooks/useT"
import { isTranslationKey } from "@/lib/i18n"

interface PhoneFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  name?: string
  placeholder?: string
}

const COUNTRIES = getCountries()

// Regional-indicator emoji. ponytail: Windows/Chrome shows "UY" instead of a flag; swap for SVGs if it bothers.
const flag = (iso: string) =>
  String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)))

function detectCountry(text: string): CountryCode | undefined {
  if (!text.startsWith("+")) return undefined
  const typed = new AsYouType()
  typed.input(text)
  return typed.getCountry()
}

/**
 * Country picker + free-form number. Emits E.164 whenever the text parses for
 * the selected country, the raw text otherwise (the schema rejects that).
 */
export default function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  name,
  placeholder,
}: PhoneFieldProps) {
  const { t, locale } = useT()
  const [country, setCountry] = useState<CountryCode>(() => detectCountry(value) ?? "UY")
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const names = new Intl.DisplayNames([locale], { type: "region" })
  const fieldId = name ?? "phone"
  const errorText = error && isTranslationKey(error) ? t(error) : error
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  function emit(nextText: string, nextCountry: CountryCode) {
    onChange(parsePhoneNumberFromString(nextText, nextCountry)?.number ?? nextText)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-label={t("phone.country")}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2.5 text-sm transition-colors hover:border-ring/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <span>{flag(country)}</span>
              <span>+{getCountryCallingCode(country)}</span>
              <ChevronsUpDown size={14} className="text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command>
              <CommandInput placeholder={t("phone.searchCountry")} />
              <CommandList>
                <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((iso) => (
                    <CommandItem
                      key={iso}
                      value={`${names.of(iso)} ${iso} +${getCountryCallingCode(iso)}`}
                      onSelect={() => {
                        setCountry(iso)
                        setOpen(false)
                        emit(text, iso)
                      }}
                    >
                      <Check
                        className={cn("size-4", iso === country ? "opacity-100" : "opacity-0")}
                      />
                      <span>{flag(iso)}</span>
                      <span className="flex-1 truncate">{names.of(iso)}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        +{getCountryCallingCode(iso)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          id={fieldId}
          name={name}
          type="tel"
          value={text}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="h-auto min-w-0 flex-1 bg-card py-2.5"
          onBlur={onBlur}
          onChange={(e) => {
            const next = e.target.value
            const detected = detectCountry(next)
            const nextCountry = detected ?? country
            setText(next)
            setCountry(nextCountry)
            emit(next, nextCountry)
          }}
        />
      </div>
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-destructive">
          {errorText}
        </p>
      )}
    </div>
  )
}
