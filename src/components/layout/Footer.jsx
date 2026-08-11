import { Link } from 'react-router-dom'
import { Waves } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-muted dark:border-border-dark dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Waves className="h-4 w-4" />
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                FloodAssist Assam
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Helping people across Assam quickly access flood situations, relief
              camps and emergency information. Independent project by{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Suvam Neog
              </span>
              — not affiliated with ASDMA or the Government of Assam.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/flood-map" className="hover:text-primary-600">
                  Flood Map
                </Link>
              </li>
              <li>
                <Link to="/relief-camps" className="hover:text-primary-600">
                  Relief Camps
                </Link>
              </li>
              <li>
                <Link to="/emergency" className="hover:text-primary-600">
                  Emergency Contacts
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary-600">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emergency">
              Emergency Disclaimer
            </h4>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              This platform is for informational purposes only. Always follow
              official updates from{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ASDMA
              </span>
              ,{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                District Administration
              </span>{' '}
              and{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                IMD
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-slate-500 dark:border-border-dark sm:flex-row">
          <p>
            © {new Date().getFullYear()} FloodAssist Assam · Built by Suvam Neog ·
            Unofficial · not a government site
          </p>
          <div className="flex gap-4">
            <Link to="/safety-tips" className="hover:text-primary-600">
              Safety Tips
            </Link>
            <Link to="/weather" className="hover:text-primary-600">
              River Alerts
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
