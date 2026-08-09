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

const PAGE_TITLES = {
  '/': 'FloodAssist Assam — Flood Map, Relief Camps & Emergency Helplines',
  '/flood-map': 'Assam Flood Map — Live District Severity | FloodAssist',
  '/districts': 'Assam District Flood Status | FloodAssist',
  '/relief-camps': 'Assam Relief Camps — ASDMA Totals | FloodAssist',
  '/emergency': 'Assam Flood Emergency Helplines (1079, 1070, 108) | FloodAssist',
  '/checklist': 'Flood Emergency Checklist | FloodAssist Assam',
  '/updates': 'Assam Flood Updates — ASDMA Advisories | FloodAssist',
  '/timeline': 'Past Assam Flood Reports | FloodAssist',
  '/weather': 'Assam River & Impact Alerts | FloodAssist',
  '/safety-tips': 'Flood Safety Tips for Assam | FloodAssist',
  '/donate': 'Donate for Assam Flood Relief (Outbound Links) | FloodAssist',
  '/about': 'About FloodAssist Assam — Unofficial ASDMA Dashboard',
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] || 'FloodAssist Assam'
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
