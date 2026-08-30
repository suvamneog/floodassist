import {
  Shield,
  Ambulance,
  Flame,
  LifeBuoy,
  Building2,
  PhoneCall,
  Phone,
} from 'lucide-react'
import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useFetch } from '../hooks/useFetch'
import { getContacts } from '../services/contactService'
import { telLink } from '../utils/helpers'

const ICONS = {
  Shield,
  Ambulance,
  Flame,
  LifeBuoy,
  Building2,
  PhoneCall,
}

const COLOR_MAP = {
  blue: 'from-primary-500 to-primary-600 shadow-primary-600/25',
  red: 'from-emergency to-emergency-dark shadow-emergency/25',
  orange: 'from-warning to-warning-dark shadow-warning/25',
  green: 'from-success to-success-dark shadow-success/25',
  slate: 'from-slate-600 to-slate-700 shadow-slate-600/25',
}

export default function Emergency() {
  const { data: contacts, loading } = useFetch(getContacts, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="Emergency Contacts"
        subtitle="Published Assam / national emergency numbers. Same published lines — not a live call-centre feed. Tap any card to call."
      />

      {loading || !contacts ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c, i) => {
            const Icon = ICONS[c.icon] || Phone
            const gradient = COLOR_MAP[c.color] || COLOR_MAP.blue
            return (
              <motion.a
                key={c.id}
                href={telLink(c.number)}
                aria-label={`Call ${c.name} at ${c.number}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-sm transition dark:border-border-dark dark:bg-surface-dark-muted"
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${gradient}`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {c.description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {c.number}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition group-hover:bg-primary-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200">
                    <Phone className="h-4 w-4" />
                    Call
                  </span>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  Source: {c.source}
                  {c.lastVerified ? ` · Verified ${c.lastVerified}` : ''}
                  {c.sourceUrl ? (
                    <>
                      {' · '}
                      <span className="underline decoration-slate-300">
                        {new URL(c.sourceUrl).hostname}
                      </span>
                    </>
                  ) : null}
                </p>
              </motion.a>
            )
          })}
        </div>
      )}
    </div>
  )
}
