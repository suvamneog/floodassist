import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, MapPin, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Badge from './Badge'
import { SEVERITY, normalizeSeverity } from '../../utils/helpers'

/**
 * Autocomplete search across districts.
 * onSelect(district) fires when a result is chosen.
 */
export default function DistrictSearch({
  districts = [],
  onSelect,
  placeholder = 'Search any district…',
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return districts
      .filter((d) => d.name.toLowerCase().includes(q))
      .sort((a, b) => (b.populationAffected || 0) - (a.populationAffected || 0))
      .slice(0, 8)
  }, [query, districts])

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocClick)
    return () => document.removeEventListener('pointerdown', onDocClick)
  }, [])

  useEffect(() => setHighlight(0), [query])

  const choose = (d) => {
    onSelect?.(d)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          inputMode="search"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 dark:border-border-dark dark:bg-surface-dark-muted dark:text-slate-100"
          aria-label="Search districts"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-border bg-white p-1.5 shadow-xl dark:border-border-dark dark:bg-slate-900"
          >
            {results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">
                No district matches “{query.trim()}”
              </li>
            ) : (
              results.map((d, i) => {
                const sev = SEVERITY[normalizeSeverity(d.severity)] || SEVERITY.normal
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => choose(d)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        i === highlight
                          ? 'bg-primary-50 dark:bg-primary-900/40'
                          : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {d.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {(d.populationAffected || 0) > 0 && (
                          <span className="hidden text-xs text-slate-400 sm:inline">
                            {d.populationAffected.toLocaleString('en-IN')}
                          </span>
                        )}
                        <Badge className={sev.color} toneDot={sev.dot}>{sev.label}</Badge>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
