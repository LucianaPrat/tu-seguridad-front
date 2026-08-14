import { useState, useRef, useEffect } from "react"
import { ChevronDown, Search } from "lucide-react"
import { TIMEZONES, type Timezone } from "@/data/timezones"

interface TimezoneComboboxProps {
  value: string
  onChange: (iana: string) => void
  error?: string
}

export default function TimezoneCombobox({ value, onChange, error }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = TIMEZONES.find((tz) => tz.iana === value)
  const filtered = TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(query.toLowerCase()) ||
      tz.iana.toLowerCase().includes(query.toLowerCase()) ||
      tz.offset.includes(query),
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(tz: Timezone) {
    onChange(tz.iana)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700">Zona horaria</label>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 ${
          error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? `${selected.iana} — ${selected.offset}` : "Seleccioná una zona horaria"}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar zona horaria..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 focus:border-[#1a6b61]"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
            ) : (
              filtered.map((tz) => (
                <li key={tz.iana}>
                  <button
                    type="button"
                    onClick={() => handleSelect(tz)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      tz.iana === value ? "text-[#1a6b61] font-medium bg-teal-50" : "text-gray-700"
                    }`}
                  >
                    <span>{tz.iana}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{tz.offset}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
