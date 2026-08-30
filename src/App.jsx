import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ui/ErrorBoundary'
import PageLoader from './components/ui/PageLoader'
import Home from './pages/Home'

const FloodMap = lazy(() => import('./pages/FloodMap'))
const DistrictStatus = lazy(() => import('./pages/DistrictStatus'))
const ReliefCamps = lazy(() => import('./pages/ReliefCamps'))
const Emergency = lazy(() => import('./pages/Emergency'))
const Checklist = lazy(() => import('./pages/Checklist'))
const Updates = lazy(() => import('./pages/Updates'))
const Weather = lazy(() => import('./pages/Weather'))
const SafetyTips = lazy(() => import('./pages/SafetyTips'))
const Timeline = lazy(() => import('./pages/Timeline'))
const Donate = lazy(() => import('./pages/Donate'))
const About = lazy(() => import('./pages/About'))

const SITE = 'https://floodassist-assam.vercel.app'

const PAGE_SEO = {
  '/': {
    title: 'FloodAssist Assam — Assam Flood Map, Relief Camps & Emergency Helplines',
    description:
      'Independent Assam flood dashboard by Suvam Neog (not a government site). Latest ASDMA daily report: district status, flood map, relief camps, river alerts, helplines 1079 1070 108.',
  },
  '/flood-map': {
    title: 'Assam Flood Map — District Status | FloodAssist Assam',
    description:
      'Assam flood map shaded by ASDMA people-affected counts from the latest official daily flood report. Pins mark approximate district HQ — not camp GPS. Same-day figures, not realtime gauges.',
  },
  '/districts': {
    title: 'Assam District Flood Status | FloodAssist Assam',
    description:
      'ASDMA affected districts with people, villages, and camps from the official daily flood report.',
  },
  '/relief-camps': {
    title: 'Assam Relief Camps — ASDMA Camp Totals | FloodAssist',
    description:
      'District-level Assam relief camp and inmate totals from the ASDMA daily flood report. Confirm addresses with District Administration / 1077.',
  },
  '/emergency': {
    title: 'Assam Flood Emergency Helplines (1079, 1070, 108) | FloodAssist',
    description:
      'Flood-first Assam emergency contacts: ASDMA 1079, SEOC 1070, ambulance 108, police 100, fire 101, and District Control Room 1077.',
  },
  '/checklist': {
    title: 'Flood Emergency Checklist | FloodAssist Assam',
    description:
      'Interactive Assam flood preparedness checklist — pack essentials, documents, and safety steps before and during floods.',
  },
  '/updates': {
    title: 'Assam Flood Updates — ASDMA Advisories | FloodAssist',
    description:
      'Short Assam flood advisories derived from the latest ASDMA daily flood report and CWC river notes.',
  },
  '/timeline': {
    title: 'Past Assam Flood Reports | FloodAssist Assam',
    description:
      'Browse past ASDMA daily flood reports for Assam — people affected, districts, camps, and river alerts by date.',
  },
  '/weather': {
    title: 'Assam River & Impact Alerts | FloodAssist Assam',
    description:
      'Rivers above danger level and flood impact snapshot from CWC figures in the ASDMA daily flood report for Assam.',
  },
  '/safety-tips': {
    title: 'Flood Safety Tips for Assam | FloodAssist',
    description:
      'Practical Assam flood safety tips: before, during, and after flooding. Follow official ASDMA and district guidance.',
  },
  '/donate': {
    title: 'Donate for Assam Flood Relief (Outbound Links) | FloodAssist',
    description:
      'Outbound Assam flood relief donation links only. FloodAssist does not collect money or verify how funds are spent.',
  },
  '/about': {
    title: 'About FloodAssist Assam — Built by Suvam Neog',
    description:
      'FloodAssist Assam is an independent unofficial project by Suvam Neog. Not affiliated with ASDMA or the Government of Assam. Figures come from the public ASDMA daily flood report.',
  },
}

function setMeta(name, content, attr = 'name') {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    const seo = PAGE_SEO[pathname] || {
      title: 'FloodAssist Assam',
      description:
        'Assam flood map, district status, relief camps, and emergency helplines from ASDMA daily reports.',
    }
    document.title = seo.title
    setMeta('description', seo.description)
    setMeta('og:title', seo.title, 'property')
    setMeta('og:description', seo.description, 'property')
    setMeta('og:url', `${SITE}${pathname === '/' ? '/' : pathname}`, 'property')
    setMeta('twitter:title', seo.title)
    setMeta('twitter:description', seo.description)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute(
      'href',
      `${SITE}${pathname === '/' ? '/' : pathname}`
    )
  }, [pathname])
  return null
}

function LazyPage({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Analytics />
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route
              index
              element={
                <LazyPage>
                  <Home />
                </LazyPage>
              }
            />
            <Route
              path="flood-map"
              element={
                <LazyPage>
                  <FloodMap />
                </LazyPage>
              }
            />
            <Route
              path="districts"
              element={
                <LazyPage>
                  <DistrictStatus />
                </LazyPage>
              }
            />
            <Route
              path="relief-camps"
              element={
                <LazyPage>
                  <ReliefCamps />
                </LazyPage>
              }
            />
            <Route
              path="emergency"
              element={
                <LazyPage>
                  <Emergency />
                </LazyPage>
              }
            />
            <Route
              path="checklist"
              element={
                <LazyPage>
                  <Checklist />
                </LazyPage>
              }
            />
            <Route
              path="updates"
              element={
                <LazyPage>
                  <Updates />
                </LazyPage>
              }
            />
            <Route
              path="timeline"
              element={
                <LazyPage>
                  <Timeline />
                </LazyPage>
              }
            />
            <Route
              path="weather"
              element={
                <LazyPage>
                  <Weather />
                </LazyPage>
              }
            />
            <Route
              path="safety-tips"
              element={
                <LazyPage>
                  <SafetyTips />
                </LazyPage>
              }
            />
            <Route
              path="donate"
              element={
                <LazyPage>
                  <Donate />
                </LazyPage>
              }
            />
            <Route
              path="about"
              element={
                <LazyPage>
                  <About />
                </LazyPage>
              }
            />
            <Route
              path="*"
              element={
                <LazyPage>
                  <NotFound />
                </LazyPage>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-white p-8 text-center dark:border-border-dark dark:bg-surface-dark-muted">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
          404
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          That link doesn’t exist. Head home to check the latest flood report.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Back to home
        </a>
      </div>
    </div>
  )
}
