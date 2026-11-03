import { CATEGORY_LABELS } from '../lib/format.js'

/** Category chips with live counts from the API's groupBy. */
export default function FilterBar({ categories = {}, active, onChange, total }) {
  const entries = Object.entries(categories)
  const keys = ['ALL', ...Object.keys(CATEGORY_LABELS).filter((key) => entries.some(([k]) => k === key))]

  return (
    <div className="filters" role="group" aria-label="Filter projects by category">
      {keys.map((key) => {
        const count = key === 'ALL' ? total : (categories[key] ?? 0)
        const isOn = (active ?? 'ALL') === key
        return (
          <button
            key={key}
            type="button"
            className={`filter ${isOn ? 'is-on' : ''}`}
            aria-pressed={isOn}
            onClick={() => onChange(key)}
          >
            {key === 'ALL' ? 'All work' : CATEGORY_LABELS[key] ?? key}
            <sup>{count}</sup>
          </button>
        )
      })}
    </div>
  )
}
