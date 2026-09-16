import { useMemo, useState, lazy, Suspense } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Phone, History, HeartHandshake } from 'lucide-react'
import Button from '../components/ui/Button'
import floodHero from '../assets/flood-hero.jpeg'
import StatsCards from '../components/home/StatsCards'
import DataFreshnessBanner from '../components/DataSourceBanner'
import AiDailySummary from '../components/intelligence/AiDailySummary'
import SituationComparison from '../components/intelligence/SituationComparison'
import SeverityRanking from '../components/intelligence/SeverityRanking'
import AiRecommendations from '../components/intelligence/AiRecommendations'
import RiverIntelligence from '../components/intelligence/RiverIntelligence'
import DistrictDrawer from '../components/ui/DistrictDrawer'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useFetch } from '../hooks/useFetch'
import { getHistory, getDashboardForDate, getPreviousReport } from '../services/historyService'
import { formatReportDate } from '../utils/intelligence'
import FaqSection from '../components/seo/FaqSection'
import { HOME_FAQS } from '../data/seoFaqs'

const TrendCharts = lazy(() => import('../components/intelligence/TrendCharts'))

export default function Home() {
  const [params] = useSearchParams()
  const selectedDate = params.get('date') || null
  const [selectedDistrict, setSelectedDistrict] = useState(null)

  const { data: dashboard, loading, error } = useFetch(
    () => getDashboardForDate(selectedDate),
    [selectedDate]
  )

  const reportDate = dashboard?.date
  const { data: previousReport } = useFetch(
    () => getPreviousReport(reportDate),
    [reportDate]
  )
  const { data: history } = useFetch(getHistory, [])

  const stats = dashboard?.stats
  const districts = dashboard?.districts || []
  const weather = dashboard?.weather || []
  const meta = dashboard?.meta

  const viewingHistorical = Boolean(selectedDate && dashboard && !dashboard.isLive)

  const content = useMemo(() => {
    if (loading) return null
    if (error) {
      return (
        <ErrorState
          title="Could not load flood dashboard"
          description="Please check your connection and try again. Official figures will reappear once data loads."
          onRetry={() => window.location.reload()}
        />
      )
    }
    if (!dashboard) {
      return (
        <EmptyState
          title="Report not found"
          description="That date is not in the local history archive yet."
          action={
            <Button to="/" variant="soft" size="sm">
              Back to latest
            </Button>
          }
        />
      )
    }
    return (
      <>
        <AiDailySummary
          stats={stats}
          districts={districts}
          weather={weather}
          meta={meta}
        />

        <SituationComparison stats={stats} previousReport={previousReport} />

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SeverityRanking
              districts={districts}
              onSelectDistrict={setSelectedDistrict}
            />
          </div>
          <div className="lg:col-span-2">
            <AiRecommendations
              stats={stats}
              districts={districts}
              weather={weather}
            />
          </div>
        </div>

        <RiverIntelligence
          weather={weather}
          historyReports={history?.reports || []}
        />

        <Suspense fallback={<CardSkeleton count={2} />}>
          <TrendCharts historyReports={history?.reports || []} />
        </Suspense>
      </>
    )
  }, [
    loading,
    error,
    dashboard,
    stats,
    districts,
    weather,
    meta,
    previousReport,
    history,
  ])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border dark:border-border-dark">
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400"
            >
              FloodAssist Assam · by Suvam Neog
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] dark:text-white"
            >
              Assam flood status from the official ASDMA daily report
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400"
            >
              FloodAssist Assam shows the latest public ASDMA / SDRF Daily Flood
              Report figures — districts, people affected, relief camps, river
              alerts, and helplines — in one place. Independent site by Suvam
              Neog; same-day official report figures, not realtime gauges.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button size="lg" to="/flood-map">
                View Flood Map
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" to="/emergency">
                <Phone className="h-4 w-4" />
                Emergency Contacts
              </Button>
              <Link to="/donate" className="donate-glow-cta">
                <span className="donate-glow-inner">
                  <HeartHandshake className="h-4 w-4" />
                  Donate for relief
                </span>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative"
          >
            <figure className="relative overflow-hidden rounded-xl border border-border dark:border-border-dark">
              <img
                src={floodHero}
                alt="Residents wading through a flooded street in Assam past a submerged car"
                width={735}
                height={488}
                loading="eager"
                className="w-full object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 py-3 text-xs font-medium text-white/90">
                Flooding in Assam during the monsoon season
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </section>

      {/* Intelligence dashboard */}
      <section className="border-t border-border bg-surface-muted py-12 dark:border-border-dark dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          {meta && <DataFreshnessBanner meta={meta} />}

          {viewingHistorical && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm dark:border-primary-800 dark:bg-primary-950/40">
              <span className="font-medium text-primary-800 dark:text-primary-200">
                Viewing archived report · {formatReportDate(selectedDate)}
              </span>
              <Link
                to="/"
                className="font-bold text-primary-700 hover:underline dark:text-primary-300"
              >
                Return to latest
              </Link>
            </div>
          )}

          {loading ? (
            <CardSkeleton count={4} />
          ) : (
            <>
              {content}

              {stats && (
                <div>
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Report Snapshot
                      </h2>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Key figures from the selected ASDMA report
                      </p>
                    </div>
                    <Button to="/timeline" variant="soft" size="sm">
                      <History className="h-4 w-4" />
                      Report timeline
                    </Button>
                  </div>
                  <StatsCards stats={stats} loading={false} />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted py-14 dark:border-border-dark dark:bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FaqSection
            title="Assam flood FAQ"
            subtitle="Direct answers for search and AI assistants — based on how FloodAssist Assam works."
            faqs={HOME_FAQS}
            schemaId="https://floodassist-assam.vercel.app/#faq"
            injectSchema={false}
          />
        </div>
      </section>

      {/* Quick links */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            What you need right now
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                to: '/districts',
                title: 'District Status',
                desc: 'ASDMA affected / not-listed status and villages for every district.',
              },
              {
                to: '/relief-camps',
                title: 'Relief Camps',
                desc: 'District-level camp and inmate totals from the ASDMA daily report.',
              },
              {
                to: '/donate',
                title: 'Help flood-hit families',
                desc: 'External link to the Bondhu Streams Assam flood 2026 relief campaign.',
              },
              {
                to: '/timeline',
                title: 'Report Timeline',
                desc: 'Browse every imported ASDMA daily report by date.',
              },
              {
                to: '/updates',
                title: 'ASDMA Report Notes',
                desc: 'Short notes derived from the latest ASDMA daily flood report.',
              },
              {
                to: '/weather',
                title: 'River & Impact Alerts',
                desc: 'CWC river danger levels and ASDMA flood impact figures.',
              },
              {
                to: '/safety-tips',
                title: 'Safety Tips',
                desc: 'Practical steps to stay safe before and during floods.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={item.to}
                  className="group block h-full rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-border-dark dark:bg-surface-dark-muted dark:hover:border-primary-700"
                >
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    Open{' '}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <DistrictDrawer
        district={selectedDistrict}
        open={Boolean(selectedDistrict)}
        onClose={() => setSelectedDistrict(null)}
      />
    </div>
  )
}
