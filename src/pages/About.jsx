import { motion } from 'framer-motion'
import { Heart, Map, Phone, Shield } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'

const pillars = [
  {
    icon: Map,
    title: 'Clear information',
    desc: 'Flood status, camps and alerts in one calm, readable place.',
  },
  {
    icon: Phone,
    title: 'Fast emergency access',
    desc: 'One-tap SOS for police, ambulance, fire, SDRF and ASDMA.',
  },
  {
    icon: Shield,
    title: 'Preparedness first',
    desc: 'Checklists and safety tips so families can pack and plan ahead.',
  },
  {
    icon: Heart,
    title: 'Built for Assam',
    desc: 'Designed around Assam’s districts, rivers and flood season reality.',
  },
]

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="About FloodAssist Assam"
        subtitle="Built by Suvam Neog — an independent Assam flood information site, not a government website."
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="prose prose-slate dark:prose-invert mb-10 space-y-4"
      >
        <Card>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            What is FloodAssist Assam?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white">
              FloodAssist Assam
            </strong>{' '}
            is an independent, unofficial flood information dashboard for Assam.
            It turns the public ASDMA / SDRF Daily Flood Report into a clear,
            mobile-first experience: district status, flood map, relief-camp
            totals, river alerts, emergency helplines, past reports, safety tips,
            and a preparedness checklist.
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
            Every monsoon, floods disrupt lives across Assam. Critical
            information — which districts are affected, camp totals, whom to
            call — is often scattered. FloodAssist Assam brings those public
            figures together so people can check them quickly without clutter.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Who is Suvam Neog?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white">Suvam Neog</strong>{' '}
            is the creator, author, and developer of FloodAssist Assam. He built
            this project independently to make Assam flood information easier to
            access on a phone.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
            <li>
              Creator of{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                FloodAssist Assam
              </strong>{' '}
              (
              <a
                href="https://floodassist-assam.vercel.app/"
                className="font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
              >
                floodassist-assam.vercel.app
              </a>
              )
            </li>
            <li>
              Source code:{' '}
              <a
                href="https://github.com/suvamneog/floodassist"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
              >
                github.com/suvamneog/floodassist
              </a>
            </li>
            <li>
              GitHub:{' '}
              <a
                href="https://github.com/suvamneog"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
              >
                github.com/suvamneog
              </a>
            </li>
          </ul>
        </Card>

        <Card>
          <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>Not a government website.</strong> FloodAssist Assam is an
            independent, unofficial project by Suvam Neog. It is{' '}
            <strong>not</strong> run by ASDMA, SDRF, or the Government of Assam.
            Flood figures are taken from the public ASDMA / SDRF Daily Flood
            Report PDF for easier reading — same-day official report figures,
            not realtime gauges.
          </p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            This platform is informational only. Always follow official guidance
            from ASDMA, District Administration and IMD. Attribution: FloodAssist
            Assam by Suvam Neog.
          </p>
        </Card>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p, i) => {
          const Icon = p.icon
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full">
                <Icon className="mb-3 h-6 w-6 text-primary-600 dark:text-primary-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {p.desc}
                </p>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
