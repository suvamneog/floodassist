import { Filter } from 'lucide-react'

export default function MapFilters({
  districts,
  district,
  status,
  onDistrictChange,
  onStatusChange,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Filter className="h-4 w-4" />
        Filter
      </div>
      <select
        value={district}
        onChange={(e) => onDistrictChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 dark:border-border-dark dark:bg-surface-dark-muted dark:text-slate-100 sm:w-auto"
      >
        <option value="all">All Districts</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 dark:border-border-dark dark:bg-surface-dark-muted dark:text-slate-100 sm:w-auto"
      >
        <option value="all">All Status</option>
        <option value="affected">Affected (ASDMA)</option>
        <option value="safe">Not listed</option>
      </select>
    </div>
  )
}
