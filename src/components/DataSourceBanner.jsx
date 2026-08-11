import { Link } from 'react-router-dom'
import { ExternalLink, Circle, History } from 'lucide-react'
import {
  formatReportDate,
  formatSyncTime,
  isTodayUnavailable,
} from '../utils/intelligence'

export default function DataFreshnessBanner({ meta, compact = false }) {
  if (!meta) return null

  const reportDate = meta.reportDate || meta.period
  const todayMissing = isTodayUnavailable(reportDate)

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-surface-dark-muted ${
        compact ? 'px-4 py-3' : 'px-5 py-4'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            ASDMA Daily Report
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Unofficial site · not ASDMA
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-400">Latest Report</span>{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {formatReportDate(reportDate)}
            </span>
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-400">Last Synced</span>{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {formatSyncTime(meta.scrapedAt)}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!compact && (
            <Link
              to="/timeline"
              className="past-reports-cta inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-primary-600/40 transition hover:bg-primary-700"
            >
              <History className="h-4 w-4" />
              Browse past reports
            </Link>
          )}
          <a
            href="https://sdrf.assam.gov.in/dfr/download?type=flood"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Official PDF portal
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {todayMissing && !compact && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Today&apos;s official report has not yet been published. Showing the
          latest available report — you can still open earlier days with{' '}
          <span className="font-semibold">Browse past reports</span> above.
        </p>
      )}
    </div>
  )
}
