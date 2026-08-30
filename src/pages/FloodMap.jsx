import { useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import FloodMapView from '../components/map/FloodMapView'
import MapFilters from '../components/map/MapFilters'
import DataFreshnessBanner from '../components/DataSourceBanner'
import DistrictSearch from '../components/ui/DistrictSearch'
import DistrictDrawer from '../components/ui/DistrictDrawer'
import ReportDateFilter from '../components/ui/ReportDateFilter'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { FLOOD_STATUS, formatRelative, normalizeFloodStatus } from '../utils/helpers'
import Badge from '../components/ui/Badge'
import { useFetch } from '../hooks/useFetch'
import { getDashboardForDate, getReportDates } from '../services/historyService'
import { formatReportDate } from '../utils/intelligence'

export default function FloodMapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDate = searchParams.get('date') || null
  const [district, setDistrict] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedDistrict, setSelectedDistrict] = useState(null)

  const { data: dateInfo } = useFetch(getReportDates, [])
  const { data: dashboard, loading, error } = useFetch(
    () => getDashboardForDate(selectedDate),
    [selectedDate]
  )

  const districts = dashboard?.districts || []
  const meta = dashboard?.meta
  const viewingHistorical = Boolean(selectedDate && dashboard && !dashboard.isLive)

  const reports = useMemo(() => {
    let rows = [...(dashboard?.floodReports || [])]
    if (district !== 'all') {
      rows = rows.filter(
        (r) =>
          r.districtId === district ||
          r.district.toLowerCase() === district.toLowerCase()
      )
    }
    if (status !== 'all') {
      rows = rows.filter((r) => normalizeFloodStatus(r.status) === status)
    }
    return rows
  }, [dashboard, district, status])

  const setDate = useCallback(
    (date) => {
      setSearchParams(date ? { date } : {}, { replace: true })
      setDistrict('all')
      setStatus('all')
      setSelectedDistrict(null)
    },
    [setSearchParams]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        title="Flood Map"
        subtitle="Shaded by ASDMA people-affected counts. Pins mark approximate district HQ — not camp GPS. Same-day official report, not realtime gauges."
      >
        <div className="mb-4">
          <ReportDateFilter
            dates={dateInfo?.dates || []}
            liveDate={dateInfo?.liveDate}
            value={selectedDate}
            onChange={setDate}
          />
        </div>

        {meta && (
          <div className="mb-4">
            <DataFreshnessBanner meta={meta} compact />
          </div>
        )}

        {viewingHistorical && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm dark:border-primary-800 dark:bg-primary-950/40">
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

        <div className="mb-4 max-w-md">
          <DistrictSearch
            districts={districts}
            onSelect={(d) => {
              setDistrict(d.id)
              setSelectedDistrict(d)
            }}
          />
        </div>

        <MapFilters
          districts={districts}
          district={district}
          status={status}
          onDistrictChange={setDistrict}
          onStatusChange={setStatus}
        />
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
          {Object.entries(FLOOD_STATUS).map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: val.map }}
              />
              {val.label} · district HQ pin
            </span>
          ))}
        </div>
      </PageHeader>

      {error ? (
        <ErrorState
          title="Could not load the flood map"
          description="Please try again in a moment."
          onRetry={() => window.location.reload()}
        />
      ) : loading ? (
        <Skeleton className="h-[420px] w-full rounded-2xl sm:h-[520px] lg:h-[560px]" />
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
      ) : (
        <FloodMapView
          reports={reports}
          districts={districts}
          onDistrictClick={setSelectedDistrict}
        />
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          Reports ({reports.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const s =
              FLOOD_STATUS[normalizeFloodStatus(r.status)] || FLOOD_STATUS.safe
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-muted"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {r.location}
                    </p>
                    <p className="text-xs text-slate-500">{r.district}</p>
                  </div>
                  <Badge className={s.color}>{s.label}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                  {r.description}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {formatRelative(r.lastUpdated)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <DistrictDrawer
        district={selectedDistrict}
        open={Boolean(selectedDistrict)}
        onClose={() => setSelectedDistrict(null)}
      />
    </div>
  )
}
