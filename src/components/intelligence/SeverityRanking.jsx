import { motion } from 'framer-motion'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { SEVERITY, normalizeSeverity } from '../../utils/helpers'
import {
  formatIndianNumber,
  rankDistricts,
} from '../../utils/intelligence'

export default function SeverityRanking({ districts, onSelectDistrict }) {
  const ranked = rankDistricts(districts, 10)
  const maxPop = Math.max(...ranked.map((d) => d.populationAffected || 0), 1)

  if (!ranked.length) {
    return (
      <EmptyState
        title="No ranked districts"
        description="Affected districts will appear here once population impact is reported."
      />
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Most affected districts
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranked by ASDMA people-affected totals (not an official severity code)
        </p>
      </div>

      <div className="space-y-2.5">
        {ranked.map((d, i) => {
          const sev = SEVERITY[normalizeSeverity(d.severity)] || SEVERITY.normal
          const pct = Math.round(((d.populationAffected || 0) / maxPop) * 100)
          return (
            <motion.button
              key={d.id}
              type="button"
              onClick={() => onSelectDistrict?.(d)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group w-full rounded-2xl border border-border bg-white p-4 text-left transition hover:border-primary-300 hover:shadow-md dark:border-border-dark dark:bg-surface-dark-muted dark:hover:border-primary-700"
            >
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                    i < 3
                      ? 'bg-emergency text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 group-hover:text-primary-600 dark:text-white">
                      {d.name}
                    </p>
                    <Badge className={sev.color} toneDot={sev.dot}>{sev.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatIndianNumber(d.reliefCamps)} relief camps ·{' '}
                    {formatIndianNumber(d.affectedVillages)} villages
                  </p>
                </div>
                <p className="text-right text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatIndianNumber(d.populationAffected)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emergency to-warning"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.1 + i * 0.03 }}
                />
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
