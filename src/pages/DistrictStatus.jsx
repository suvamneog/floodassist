import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Waves, Clock, Users } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DataFreshnessBanner from '../components/DataSourceBanner'
import DistrictDrawer from '../components/ui/DistrictDrawer'
import DistrictSearch from '../components/ui/DistrictSearch'
import ReportDateFilter from '../components/ui/ReportDateFilter'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useFetch } from '../hooks/useFetch'
import { getDashboardForDate, getReportDates } from '../services/historyService'
import { SEVERITY, normalizeSeverity, formatRelative } from '../utils/helpers'
import { formatReportDate } from '../utils/intelligence'

export default function DistrictStatus() {
  const [searchParams, setSearchParams] = useSearchParams()
  const districtId = searchParams.get('district')
  const selectedDate = searchParams.get('date') || null

  const { data: dateInfo } = useFetch(getReportDates, [])
  const { data: dashboard, loading, error } = useFetch(
    () => getDashboardForDate(selectedDate),
    [selectedDate]
  )

  const districts = dashboard?.districts || []
  const meta = dashboard?.meta
  const viewingHistorical = Boolean(selectedDate && dashboard && !dashboard.isLive)
  const [selected, setSelected] = useState(null)

  const setDate = useCallback(
    (date) => {
      const next = {}
      if (date) next.date = date
      if (districtId) next.district = districtId
      setSearchParams(next, { replace: true })
      setSelected(null)
    },
    [districtId, setSearchParams]
  )

  useEffect(() => {
    if (districtId && districts.length) {
      const match = districts.find((d) => d.id === districtId)
      if (match) {
        setSelected((current) => (current?.id === match.id ? current : match))
      }
    }
  }, [districts, districtId])

  const openDistrict = useCallback(
    (d) => {
      setSelected(d)
      const next = { district: d.id }
      if (selectedDate) next.date = selectedDate
      setSearchParams(next, { replace: true })
    },
    [selectedDate, setSearchParams]
  )

  const closeDrawer = useCallback(() => {
    setSelected(null)
    const next = {}
    if (selectedDate) next.date = selectedDate
    setSearchParams(next, { replace: true })
  }, [selectedDate, setSearchParams])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        title="District Status"
        subtitle="ASDMA affected districts and verified people / village / camp totals — tap a card for details."
      />

      <div className="mb-4">
        <ReportDateFilter
          dates={dateInfo?.dates || []}
          liveDate={dateInfo?.liveDate}
          value={selectedDate}
          onChange={setDate}
        />
      </div>

      {meta && (
        <div className="mb-6">
          <DataFreshnessBanner meta={meta} compact />
        </div>
      )}

      {viewingHistorical && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm dark:border-primary-800 dark:bg-primary-950/40">
          <span className="font-medium text-primary-800 dark:text-primary-200">
            Viewing archived report · {formatReportDate(selectedDate)}
          </span>
          <button
            type="button"
            onClick={() => setDate(null)}
            className="font-bold text-primary-700 hover:underline dark:text-primary-300"
          >
            Return to latest
          </button>
        </div>
      )}

      <div className="mb-6 max-w-md">
        <DistrictSearch districts={districts} onSelect={openDistrict} />
      </div>

      {error ? (
        <ErrorState
          title="Could not load districts"
          description="District status is temporarily unavailable. Please try again."
          onRetry={() => window.location.reload()}
        />
      ) : loading ? (
        <CardSkeleton count={8} />
      ) : !dashboard ? (
        <EmptyState
          title="Report not found"
          description="That date is not in the archive. Pick another report date or return to the latest."
          action={
            <button
              type="button"
              onClick={() => setDate(null)}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white"
            >
              Return to latest
            </button>
          }
        />
      ) : districts.length === 0 ? (
        <EmptyState
          title="No district data"
          description="Import an ASDMA daily flood report to populate district status."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {districts.map((d, i) => {
            const sev = SEVERITY[normalizeSeverity(d.severity)] || SEVERITY.normal
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.04 }}
              >
                <Card className="h-full" onClick={() => openDistrict(d)}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${sev.dot}`} />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {d.name}
                      </h3>
                    </div>
                    <Badge className={sev.color} toneDot={sev.dot}>
                      {sev.label}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {d.affectedVillages} affected villages
                    </p>
                    <p className="flex items-center gap-2">
                      <Waves className="h-4 w-4 text-slate-400" />
                      River: {d.river || '—'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {(d.populationAffected || 0).toLocaleString('en-IN')} people
                      affected
                    </p>
                    <p className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {formatRelative(d.lastUpdated)}
                    </p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <DistrictDrawer
        district={selected}
        open={Boolean(selected)}
        onClose={closeDrawer}
      />
    </div>
  )
}
