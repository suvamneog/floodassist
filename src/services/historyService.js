import history from '../data/history.json'
import districts from '../data/districts.json'
import stats from '../data/stats.json'
import weather from '../data/weather.json'
import meta from '../data/meta.json'
import floodReports from '../data/floodReports.json'
import reliefCamps from '../data/reliefCamps.json'
import { formatReportDate } from '../utils/intelligence'

export const getHistory = async () => ({
  reports: [...(history.reports || [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  ),
  updatedAt: history.updatedAt,
})

export const getLiveReportDate = () =>
  meta.reportDate || stats.reportDate || stats.period || null

/** Sorted newest-first list of report dates available in the archive. */
export const getReportDates = async () => {
  const { reports } = await getHistory()
  const liveDate = getLiveReportDate()
  const dates = reports.map((r) => r.date)
  if (liveDate && !dates.includes(liveDate)) dates.unshift(liveDate)
  return { dates, liveDate }
}

/** Previous report relative to a given date (default: latest live report). */
export const getPreviousReport = async (relativeToDate) => {
  const { reports } = await getHistory()
  const anchor = relativeToDate || getLiveReportDate()
  const older = reports.filter((r) => r.date < anchor)
  return older[0] || null
}

export const getReportByDate = async (date) => {
  const { reports } = await getHistory()
  return reports.find((r) => r.date === date) || null
}

const STATUS_FROM_SEVERITY = {
  affected: 'affected',
  severe: 'affected',
  moderate: 'affected',
  waterlogging: 'affected',
  normal: 'safe',
}

/** Build map pin rows from a district list (used for historical dates). */
export function floodReportsFromDistricts(districtRows = [], reportDate) {
  const label = formatReportDate(reportDate)
  return districtRows
    .filter(
      (d) =>
        d.severity !== 'normal' ||
        (d.populationAffected || 0) > 0 ||
        (d.reliefCamps || 0) > 0 ||
        (d.affectedVillages || 0) > 0
    )
    .map((d) => ({
      id: `asdma-${d.id}`,
      district: d.name,
      districtId: d.id,
      location: `${d.name} district`,
      status: STATUS_FROM_SEVERITY[d.severity] || 'safe',
      description: `ASDMA report ${label}: ${(d.populationAffected || 0).toLocaleString('en-IN')} people affected, ${d.affectedVillages || 0} villages, ${d.reliefCamps || 0} relief camps.`,
      lastUpdated: d.lastUpdated || `${reportDate}T08:00:00Z`,
      coordinates: d.coordinates,
      coordinatesNote: d.coordinatesNote,
      source: 'ASDMA Daily Flood Report',
    }))
}

/** Build district camp aggregates from a district list (historical dates). */
export function campsFromDistricts(districtRows = [], reportDate) {
  const label = formatReportDate(reportDate)
  return districtRows
    .filter((d) => (d.reliefCamps || 0) > 0)
    .map((d) => ({
      id: `asdma-camp-${d.id}`,
      name: `${d.name} — district relief camps (total)`,
      district: d.name,
      districtId: d.id,
      campCount: d.reliefCamps,
      campInmates: d.campInmates || 0,
      summary: `${d.reliefCamps} relief camp(s) reported open in ${d.name} district with ${(d.campInmates || 0).toLocaleString('en-IN')} inmates (ASDMA ${label}). Individual camp addresses are published by the District Administration — call District Control Room (1077).`,
      phone: '1077',
      coordinates: d.coordinates,
      coordinatesNote: d.coordinatesNote,
      source: 'ASDMA Daily Flood Report',
    }))
}

/**
 * Dashboard payload for a selected date.
 * Live (latest meta.reportDate) uses current JSON files;
 * historical dates use history snapshots.
 */
export const getDashboardForDate = async (date) => {
  const liveDate = getLiveReportDate()

  if (!date || date === liveDate) {
    return {
      isLive: true,
      date: liveDate,
      districts: [...districts],
      stats: { ...stats },
      weather: [...weather],
      meta: { ...meta },
      floodReports: [...floodReports],
      reliefCamps: [...reliefCamps],
    }
  }

  const snap = (history.reports || []).find((r) => r.date === date)
  if (!snap) return null

  const districtRows = snap.districts || []
  const snapStats = snap.stats || {}

  return {
    isLive: false,
    date: snap.date,
    districts: districtRows,
    stats: {
      ...snapStats,
      peopleAffected: snapStats.peopleAffected || 0,
      floodedDistricts: snapStats.floodedDistricts || 0,
      reliefCamps: snapStats.reliefCamps || 0,
      campInmates: snapStats.campInmates || 0,
      activeAlerts: snapStats.riverWarnings ?? snapStats.activeAlerts ?? 0,
      lastUpdated: `${snap.date}T08:00:00Z`,
      reportDate: snap.date,
      period: snap.date,
      source: 'ASDMA Daily Flood Report (historical snapshot)',
    },
    weather: [
      {
        id: 'asdma-cwc-danger',
        type: 'river-level',
        title: 'Rivers Above Danger Level',
        level: (snap.rivers?.danger || []).length ? 'red' : 'green',
        value: (snap.rivers?.danger || []).length
          ? `${snap.rivers.danger.length} rivers`
          : 'None',
        unit: 'CWC bulletin · 8 AM (via ASDMA)',
        description:
          (snap.rivers?.danger || []).join(', ') ||
          'No rivers above danger level.',
        validUntil: `${snap.date}T08:00:00Z`,
        source: 'CWC via ASDMA Daily Flood Report',
      },
      {
        id: 'asdma-cwc-flood',
        type: 'river-level',
        title: 'Rivers Above Highest Flood Level',
        level: (snap.rivers?.flood || []).length ? 'red' : 'green',
        value: (snap.rivers?.flood || []).length
          ? `${snap.rivers.flood.length} rivers`
          : 'None',
        unit: 'CWC bulletin · 8 AM (via ASDMA)',
        description:
          (snap.rivers?.flood || []).join(', ') ||
          'No rivers above highest flood level.',
        validUntil: `${snap.date}T08:00:00Z`,
        source: 'CWC via ASDMA Daily Flood Report',
      },
    ],
    meta: {
      reportDate: snap.date,
      scrapedAt: snap.scrapedAt,
      floodDataOrigin: 'asdma-daily-pdf-history',
      period: snap.date,
    },
    floodReports: floodReportsFromDistricts(districtRows, snap.date),
    reliefCamps: campsFromDistricts(districtRows, snap.date),
  }
}
