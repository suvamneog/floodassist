import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MapPin,
  Tent,
  Users,
  Waves,
  AlertTriangle,
  Home,
  Share2,
  Check,
} from 'lucide-react'
import Badge from './Badge'
import { SEVERITY, normalizeSeverity } from '../../utils/helpers'
import {
  formatIndianNumber,
  generateDistrictSummary,
} from '../../utils/intelligence'

export default function DistrictDrawer({ district, open, onClose }) {
  const [shared, setShared] = useState(false)

  useEffect(() => setShared(false), [district?.id, open])

  const shareDistrict = async () => {
    if (!district) return
    const url = `${window.location.origin}/districts?district=${encodeURIComponent(district.id)}`
    const sev = SEVERITY[normalizeSeverity(district.severity)] || SEVERITY.normal
    const text = `${district.name}: ${sev.label} — ${formatIndianNumber(
      district.populationAffected
    )} people affected (ASDMA), ${formatIndianNumber(
      district.reliefCamps
    )} relief camps. Via FloodAssist Assam.`

    try {
      if (navigator.share) {
        await navigator.share({ title: `${district.name} — Flood Status`, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
      }
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      /* user cancelled the share sheet */
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const sev = district
    ? SEVERITY[normalizeSeverity(district.severity)] || SEVERITY.normal
    : null
  const summary = district ? generateDistrictSummary(district) : ''

  const metrics = district
    ? [
        { label: 'Population affected', value: formatIndianNumber(district.populationAffected), icon: Users },
        { label: 'Villages', value: formatIndianNumber(district.affectedVillages), icon: Home },
        { label: 'Relief camps', value: formatIndianNumber(district.reliefCamps), icon: Tent },
        { label: 'Camp inmates', value: formatIndianNumber(district.campInmates), icon: Users },
        { label: 'Human lives lost', value: formatIndianNumber(district.humanLivesLost || 0), icon: AlertTriangle },
        { label: 'River / waterway', value: district.river || '—', icon: Waves },
      ]
    : []

  return createPortal(
    <AnimatePresence>
      {open && district && (
        <div className="fixed inset-0 z-[1100] flex justify-end">
          <motion.button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${district.name} insights`}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 dark:border-border-dark">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    District insights
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {district.name}
                </h2>
                {sev && (
                  <Badge className={`mt-2 ${sev.color}`} toneDot={sev.dot}>{sev.label}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={shareDistrict}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-95 ${
                    shared
                      ? 'bg-success/10 text-success-dark'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300'
                  }`}
                  aria-label="Share district status"
                >
                  {shared ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/40">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  District summary
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {metrics.map((m) => {
                  const Icon = m.icon
                  return (
                    <div
                      key={m.label}
                      className="rounded-2xl border border-border bg-slate-50 p-3.5 dark:border-border-dark dark:bg-slate-900/50"
                    >
                      <div className="mb-2 flex items-center gap-1.5 text-slate-400">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">
                          {m.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {m.value}
                      </p>
                    </div>
                  )
                })}
              </div>

              {district.cropAreaHa > 0 && (
                <p className="mt-4 text-sm text-slate-500">
                  Crop area submerged:{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatIndianNumber(district.cropAreaHa)} ha
                  </span>
                </p>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
