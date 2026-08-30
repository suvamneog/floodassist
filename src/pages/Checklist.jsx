import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import { ListSkeleton } from '../components/ui/Skeleton'
import { useFetch } from '../hooks/useFetch'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getChecklistItems } from '../services/contentService'

export default function Checklist() {
  const { data: items, loading } = useFetch(getChecklistItems, [])
  const [checked, setChecked] = useLocalStorage('fa-checklist', {})

  const toggle = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const done = items ? items.filter((i) => checked[i.id]).length : 0
  const total = items?.length || 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="Emergency Checklist"
        subtitle="Preparedness kit items aligned with ASDMA flood safety guidance. Progress is saved on this device — not a live inventory feed."
      />

      {loading || !items ? (
        <ListSkeleton count={5} />
      ) : (
        <>
          <div className="mb-8 rounded-2xl border border-border bg-white p-5 dark:border-border-dark dark:bg-surface-dark-muted">
            <ProgressBar value={done} max={total || 1} />
            <p className="mt-2 text-sm text-slate-500">
              {done} of {total} items packed
            </p>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => {
              const isChecked = !!checked[item.id]
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition sm:p-5 ${
                    isChecked
                      ? 'border-success/30 bg-success/5 dark:bg-success/10'
                      : 'border-border bg-white hover:border-primary-300 dark:border-border-dark dark:bg-surface-dark-muted dark:hover:border-primary-700'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                      isChecked
                        ? 'border-success bg-success text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isChecked && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span>
                    <span
                      className={`block font-bold ${
                        isChecked
                          ? 'text-slate-500 line-through dark:text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  </span>
                </motion.button>
              )
            })}
          </div>
          {items[0]?.sourceUrl ? (
            <p className="mt-6 text-xs text-slate-500">
              Based on{' '}
              <a
                href={items[0].sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-700 underline dark:text-primary-300"
              >
                ASDMA Flood Safety Tips
              </a>
              {items[0].lastVerified
                ? ` · Verified ${items[0].lastVerified}`
                : ''}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
