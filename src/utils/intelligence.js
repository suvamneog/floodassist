/**
 * Dynamic intelligence helpers — all values derived from live JSON.
 * No hardcoded flood figures.
 */

export function formatIndianNumber(n = 0) {
  return Number(n || 0).toLocaleString('en-IN')
}

export function toLakhPhrase(n = 0) {
  const num = Number(n) || 0
  if (num >= 100000) {
    const lakh = num / 100000
    const rounded = lakh >= 10 ? Math.round(lakh) : Math.round(lakh * 10) / 10
    return `more than ${rounded} lakh`
  }
  if (num >= 1000) return `about ${formatIndianNumber(num)}`
  return formatIndianNumber(num)
}

export function formatReportDate(isoDate) {
  if (!isoDate) return '—'
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatSyncTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function isTodayUnavailable(reportDate) {
  if (!reportDate) return true
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return reportDate !== `${y}-${m}-${d}`
}

/** Natural-language daily brief from stats + districts + weather. */
export function generateDailySummary({ stats, districts = [], weather = [], meta }) {
  if (!stats) return null

  const affected = [...districts]
    .filter(
      (d) =>
        (d.populationAffected || 0) > 0 ||
        d.severity === 'affected' ||
        d.severity === 'severe' ||
        d.severity === 'moderate' ||
        d.severity === 'waterlogging'
    )
    .sort((a, b) => (b.populationAffected || 0) - (a.populationAffected || 0))

  const flooded = stats.floodedDistricts ?? affected.length
  const people = stats.peopleAffected || 0
  const camps = stats.reliefCamps || 0
  const inmates = stats.campInmates || 0
  const rivers =
    stats.activeAlerts ??
    stats.riverWarnings ??
    weather.find((w) => w.id === 'asdma-cwc-danger')?.value

  const reportLabel = formatReportDate(meta?.reportDate || stats.reportDate || stats.period)
  const top = affected.slice(0, 3).map((d) => d.name)

  const paragraphs = []

  paragraphs.push(
    `According to the official ASDMA report dated ${reportLabel}, ${flooded} district${
      flooded === 1 ? ' is' : 's are'
    } affected across Assam with ${toLakhPhrase(people)} people impacted.`
  )

  if (top.length >= 3) {
    paragraphs.push(
      `${top[0]} remains the worst affected district followed by ${top[1]} and ${top[2]}.`
    )
  } else if (top.length === 2) {
    paragraphs.push(
      `${top[0]} remains the worst affected district followed by ${top[1]}.`
    )
  } else if (top.length === 1) {
    paragraphs.push(`${top[0]} is currently the most affected district.`)
  }

  const riverCard = weather.find((w) => w.id === 'asdma-cwc-danger')
  const riverCount = stats.activeAlerts ?? stats.riverWarnings ?? 0
  let campSentence = `${formatIndianNumber(camps)} relief camp${camps === 1 ? ' is' : 's are'} operational`
  if (inmates > 0) {
    campSentence += ` housing ${formatIndianNumber(inmates)} inmates`
  }
  if (riverCount > 0) {
    campSentence += ` while ${riverCount === 1 ? 'one river is' : `${riverCount} rivers are`} flowing above the danger level`
    if (riverCard?.description && !/^no rivers/i.test(riverCard.description)) {
      // keep sentence short — details live in River Intelligence
    }
  }
  paragraphs.push(`${campSentence}.`)

  return {
    title: 'Daily Brief',
    paragraphs,
    reportDate: meta?.reportDate || stats.reportDate || stats.period,
  }
}

/** Short AI blurb for a single district. */
export function generateDistrictSummary(district) {
  if (!district) return ''
  const pop = district.populationAffected || 0
  const camps = district.reliefCamps || 0
  const villages = district.affectedVillages || 0
  const inmates = district.campInmates || 0
  const severity = district.severity || 'normal'
  const listed =
    severity === 'affected' ||
    ['severe', 'moderate', 'waterlogging'].includes(severity)

  if (!listed && pop === 0) {
    return `${district.name} is not listed as affected in the latest ASDMA daily report. Continue monitoring local advisories.`
  }

  const parts = [
    `${district.name} is listed as affected in the ASDMA daily report with ${formatIndianNumber(pop)} people affected`,
  ]
  if (villages > 0) parts[0] += ` across ${formatIndianNumber(villages)} villages`
  parts[0] += '.'

  if (camps > 0) {
    parts.push(
      `${formatIndianNumber(camps)} relief camp${camps === 1 ? '' : 's'} ${
        camps === 1 ? 'is' : 'are'
      } operational${inmates > 0 ? ` with ${formatIndianNumber(inmates)} inmates` : ''}.`
    )
  } else if (pop > 0) {
    parts.push(
      'No relief camps are reported open for this district despite population impact — coordination with the District Control Room is advised.'
    )
  }

  if (district.humanLivesLost > 0) {
    parts.push(
      `Human lives lost reported: ${formatIndianNumber(district.humanLivesLost)}. Treat this figure with care and verify with official channels.`
    )
  }

  if (district.river) {
    parts.push(`Key waterway under watch: ${district.river}.`)
  }

  return parts.join(' ')
}

/** Rule-based recommendations from current situation. */
export function generateRecommendations({ stats, districts = [], weather = [] }) {
  const tips = []
  const people = stats?.peopleAffected || 0
  const camps = stats?.reliefCamps || 0
  const riverCard = weather.find((w) => w.id === 'asdma-cwc-danger')
  const riverFlood = weather.find((w) => w.id === 'asdma-cwc-flood')
  const riverCount = stats?.activeAlerts ?? stats?.riverWarnings ?? 0
  const highImpact = districts.filter(
    (d) => (d.populationAffected || 0) >= 10000 || (d.reliefCamps || 0) >= 5
  )
  const shortage = districts.filter(
    (d) => (d.populationAffected || 0) > 0 && (d.reliefCamps || 0) === 0
  )

  if (people > 100000) {
    tips.push({
      id: 'cap-camps',
      priority: 'high',
      title: 'Increase relief camp capacity',
      description: `${formatIndianNumber(people)} people are affected statewide. Expand camp capacity and ensure food, water and medical stocks.`,
      icon: 'Tent',
    })
  }

  if (riverCount > 0 || (riverCard && riverCard.level === 'red')) {
    tips.push({
      id: 'riverside',
      priority: 'high',
      title: 'Avoid riverside travel',
      description:
        riverCard?.description && !/^no rivers/i.test(riverCard.description)
          ? `Rivers above danger level: ${riverCard.description}. Stay away from embankments and low-lying riverbanks.`
          : `${riverCount} river warning${riverCount === 1 ? '' : 's'} are active. Avoid riverside travel and crossings.`,
      icon: 'Waves',
    })
  }

  if (riverFlood && riverFlood.level === 'red') {
    tips.push({
      id: 'hfl',
      priority: 'critical',
      title: 'Highest flood level alert',
      description: riverFlood.description,
      icon: 'AlertTriangle',
    })
  }

  if (shortage.length > 0) {
    tips.push({
      id: 'shortage',
      priority: 'high',
      title: 'Potential relief resource shortage',
      description: `${shortage
        .slice(0, 3)
        .map((d) => d.name)
        .join(', ')}${
        shortage.length > 3 ? ` and ${shortage.length - 3} more` : ''
      } report affected population with zero open relief camps.`,
      icon: 'PackageX',
    })
  }

  if (highImpact.length >= 3) {
    tips.push({
      id: 'multi-high-impact',
      priority: 'medium',
      title: 'Multi-district high impact',
      description: `${highImpact.length} districts have 10,000+ people affected or 5+ camps (${highImpact
        .slice(0, 3)
        .map((d) => d.name)
        .join(', ')}). Prioritise SDRF deployment and inter-district coordination.`,
      icon: 'Siren',
    })
  }

  const inmates = stats?.campInmates || 0
  if (camps > 0 && inmates / Math.max(camps, 1) > 800) {
    tips.push({
      id: 'crowding',
      priority: 'medium',
      title: 'Camp crowding risk',
      description: `Average occupancy is high (${formatIndianNumber(
        Math.round(inmates / camps)
      )} people per camp). Open additional centres where feasible.`,
      icon: 'Users',
    })
  }

  if (tips.length === 0) {
    tips.push({
      id: 'monitor',
      priority: 'low',
      title: 'Continue monitoring',
      description:
        'No critical thresholds were crossed in the latest snapshot. Keep following ASDMA, district administration and IMD updates.',
      icon: 'Radio',
    })
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return tips.sort((a, b) => order[a.priority] - order[b.priority])
}

/** Compare current stats with previous history entry. */
export function compareSituations(currentStats, previousReport) {
  if (!previousReport?.stats) {
    return { available: false, items: [] }
  }

  const prev = previousReport.stats
  const metrics = [
    {
      key: 'peopleAffected',
      label: 'Affected Population',
      current: currentStats?.peopleAffected || 0,
      previous: prev.peopleAffected || 0,
      worseWhenUp: true,
    },
    {
      key: 'floodedDistricts',
      label: 'Affected Districts',
      current: currentStats?.floodedDistricts || 0,
      previous: prev.floodedDistricts || 0,
      worseWhenUp: true,
    },
    {
      key: 'reliefCamps',
      label: 'Relief Camps',
      current: currentStats?.reliefCamps || 0,
      previous: prev.reliefCamps || 0,
      // More camps can mean worse flood OR better response — treat rise as "worsened pressure" for flood impact framing
      worseWhenUp: true,
    },
    {
      key: 'riverWarnings',
      label: 'River Warnings',
      current: currentStats?.activeAlerts ?? currentStats?.riverWarnings ?? 0,
      previous: prev.riverWarnings ?? prev.activeAlerts ?? 0,
      worseWhenUp: true,
    },
  ]

  return {
    available: true,
    previousDate: previousReport.date,
    items: metrics.map((m) => {
      const delta = m.current - m.previous
      const worsened = m.worseWhenUp ? delta > 0 : delta < 0
      const improved = m.worseWhenUp ? delta < 0 : delta > 0
      return {
        ...m,
        delta,
        tone: delta === 0 ? 'neutral' : worsened ? 'worse' : improved ? 'better' : 'neutral',
      }
    }),
  }
}

/** Parse river intelligence cards from weather + history trends. */
export function buildRiverIntelligence(weather = [], historyReports = []) {
  const dangerCard = weather.find((w) => w.id === 'asdma-cwc-danger')
  const floodCard = weather.find((w) => w.id === 'asdma-cwc-flood')

  const parseList = (desc) => {
    if (!desc || /^no rivers/i.test(desc) || /^none$/i.test(desc.trim())) return []
    return desc
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !/^no rivers/i.test(s))
  }

  const dangerRivers = parseList(dangerCard?.description || '')
  const floodRivers = parseList(floodCard?.description || '')

  const prevDanger = new Set(
    historyReports[1]?.rivers?.danger || []
  )

  const cards = []

  for (const entry of floodRivers) {
    const name = entry.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || entry
    const districtMatch = entry.match(/\(([^)]+)\)/)
    cards.push({
      id: `flood-${name}`,
      river: name,
      status: 'Above Highest Flood Level',
      badge: 'critical',
      trend: prevDanger.has(entry) || prevDanger.has(name) ? 'Persistent' : 'New / Escalated',
      warning: 'Immediate evacuation readiness near banks',
      affectedDistricts: districtMatch ? [districtMatch[1].split(/[,/]/)[0].trim()] : [],
      raw: entry,
    })
  }

  for (const entry of dangerRivers) {
    if (floodRivers.includes(entry)) continue
    const name = entry.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || entry
    const districtMatch = entry.match(/\(([^)]+)\)/)
    const wasPresent = [...prevDanger].some(
      (p) => p === entry || p.includes(name) || name.includes(p.split('(')[0].trim())
    )
    cards.push({
      id: `danger-${name}`,
      river: name,
      status: 'Above Danger',
      badge: 'danger',
      trend: wasPresent ? 'Persistent' : 'Rising',
      warning: 'Avoid riverside travel and embankment areas',
      affectedDistricts: districtMatch
        ? [districtMatch[1].replace(/\bFFS\b/gi, '').split(/[,/]/)[0].trim()].filter(Boolean)
        : [],
      raw: entry,
    })
  }

  return cards
}

/** Chart series from history (oldest → newest). */
export function buildTrendSeries(historyReports = []) {
  return [...historyReports]
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      label: formatReportDate(r.date),
      peopleAffected: r.stats?.peopleAffected || 0,
      reliefCamps: r.stats?.reliefCamps || 0,
      floodedDistricts: r.stats?.floodedDistricts || 0,
      riverWarnings: r.stats?.riverWarnings ?? r.stats?.activeAlerts ?? 0,
    }))
}

export function rankDistricts(districts = [], limit = 10) {
  return [...districts]
    .filter((d) => (d.populationAffected || 0) > 0 || d.severity === 'affected' || d.severity === 'severe' || d.severity === 'moderate' || d.severity === 'waterlogging')
    .sort((a, b) => (b.populationAffected || 0) - (a.populationAffected || 0))
    .slice(0, limit)
}
