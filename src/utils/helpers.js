/**
 * District status from the ASDMA daily report.
 * "affected" = named in the PDF (or has verified pop/camps/villages).
 * Not an official ASDMA severity code — ASDMA does not publish Severe/Moderate.
 */
export const SEVERITY = {
  affected: {
    label: 'Affected (ASDMA)',
    color:
      'bg-red-100 text-red-950 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-700',
    dot: 'bg-emergency',
    map: '#ef4444',
  },
  normal: {
    label: 'Not listed',
    color:
      'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700',
    dot: 'bg-success',
    map: '#22c55e',
  },
}

/** Map pin status — same ASDMA affected / not-listed split. */
export const FLOOD_STATUS = {
  affected: {
    label: 'Affected (ASDMA)',
    color:
      'bg-red-100 text-red-950 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-700',
    map: '#ef4444',
  },
  safe: {
    label: 'Not listed',
    color:
      'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700',
    map: '#22c55e',
  },
}

/**
 * Map heat bands from verified ASDMA people/camp counts (not an official severity label).
 */
export const IMPACT_BAND = {
  high: {
    label: '10,000+ people',
    map: '#ef4444',
    note: 'ASDMA population / camp totals',
  },
  mid: {
    label: '1,000–9,999 people',
    map: '#f97316',
    note: 'ASDMA population / camp totals',
  },
  low: {
    label: 'Listed, under 1,000',
    map: '#f59e0b',
    note: 'ASDMA affected list or low totals',
  },
  none: {
    label: 'Not listed',
    map: '#22c55e',
    note: 'Not in this day’s ASDMA report',
  },
}

/** Map legacy Severe/Moderate/Waterlogging → ASDMA affected/normal. */
export function normalizeSeverity(severity) {
  if (!severity || severity === 'normal' || severity === 'safe') return 'normal'
  if (severity === 'affected') return 'affected'
  if (['severe', 'moderate', 'waterlogging', 'flooded'].includes(severity)) {
    return 'affected'
  }
  return 'normal'
}

export function normalizeFloodStatus(status) {
  if (!status || status === 'safe' || status === 'normal') return 'safe'
  if (status === 'affected') return 'affected'
  if (['flooded', 'waterlogging', 'severe', 'moderate'].includes(status)) {
    return 'affected'
  }
  return 'safe'
}

/** Heat-map band from ASDMA people & camp counts. */
export function impactBand(district) {
  const pop = Number(district?.populationAffected) || 0
  const camps = Number(district?.reliefCamps) || 0
  const villages = Number(district?.affectedVillages) || 0
  const listed = normalizeSeverity(district?.severity) === 'affected'
  const hasImpact = listed || pop > 0 || camps > 0 || villages > 0
  if (!hasImpact) return 'none'
  if (pop >= 10_000 || camps >= 5) return 'high'
  if (pop >= 1_000 || camps >= 1) return 'mid'
  return 'low'
}

export const ALERT_LEVEL = {
  red: 'bg-red-100 text-red-950 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-700',
  orange:
    'bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-700',
  warning:
    'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700',
  green:
    'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-700',
}

export const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelative = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Google Maps search URL — returns null if coords are invalid / out of Assam+NE buffer. */
export const googleMapsUrl = (lat, lng, label = '') => {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  // Assam / NE India with modest buffer
  if (la < 22 || la > 29.5 || ln < 88 || ln > 98) return null
  const query = label
    ? `${la},${ln} (${String(label).slice(0, 80)})`
    : `${la},${ln}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Safe tel: link — digits and leading + only (blocks javascript:/data: abuse). */
export const telLink = (number) => {
  const raw = String(number || '').trim()
  if (!raw || /^(javascript|data|vbscript):/i.test(raw) || /[a-z]/i.test(raw)) {
    return '#'
  }
  const cleaned = raw.replace(/[^\d+]/g, '')
  const normalized = cleaned.startsWith('+')
    ? `+${cleaned.slice(1).replace(/\D/g, '')}`
    : cleaned.replace(/\D/g, '')
  // Emergency short codes (100/101/108) and longer lines
  if (!/^\+?\d{2,15}$/.test(normalized)) return '#'
  return `tel:${normalized}`
}

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/flood-map', label: 'Flood Map' },
  { to: '/districts', label: 'District Status' },
  { to: '/relief-camps', label: 'Relief Camps' },
  { to: '/emergency', label: 'Emergency' },
  { to: '/donate', label: 'Donate' },
  { to: '/timeline', label: 'Past Reports' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/updates', label: 'Updates' },
]
