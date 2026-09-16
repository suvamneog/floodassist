import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader'
import { ListSkeleton } from '../components/ui/Skeleton'
import DataFreshnessBanner from '../components/DataSourceBanner'
import { useFetch } from '../hooks/useFetch'
import { getUpdates } from '../services/updateService'
import { getMeta } from '../services/metaService'
import { formatDateTime } from '../utils/helpers'

export default function Updates() {
  const { data: updates, loading } = useFetch(getUpdates, [])
  const { data: meta } = useFetch(getMeta, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="ASDMA Report Notes"
        subtitle="Short notes derived from the latest ASDMA / SDRF Daily Flood Report — not a live IMD or district advisory feed."
      />

      {meta && (
        <div className="mb-6">
          <DataFreshnessBanner meta={meta} compact />
        </div>
      )}

      {loading || !updates ? (
        <ListSkeleton count={5} />
      ) : (
        <div className="relative space-y-0">
          <div className="absolute bottom-0 left-[15px] top-2 w-px bg-border dark:bg-border-dark sm:left-[19px]" />
          {updates.map((u, i) => (
            <motion.article
              key={u.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="relative flex gap-4 pb-8 sm:gap-6"
            >
              <div className="relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary-500 bg-white dark:bg-surface-dark sm:h-10 sm:w-10">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
              </div>
              <div className="flex-1 rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark-muted">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    {u.source}
                  </span>
                  <time className="text-slate-400">{formatDateTime(u.date)}</time>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {u.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {u.summary}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  )
}
