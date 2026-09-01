import { Plus, Trash2 } from 'lucide-react'

const elevationLabels = ['Front', 'Rear', 'Left', 'Right']

const toNumber = (value) => Number(value) || 0

export default function ExteriorElevations({ elevations, onChange }) {
  const updateElevation = (id, field, value) => {
    onChange(elevations.map((elevation) => (
      elevation.id === id ? { ...elevation, [field]: value } : elevation
    )))
  }

  const addElevation = () => {
    const nextNumber = elevations.length + 1
    onChange([
      ...elevations,
      { id: `new-elevation-${Date.now()}`, label: `Elevation ${nextNumber}`, height: '', width: '', deductions: '', sqft: 0 },
    ])
  }

  const removeElevation = (id) => onChange(elevations.filter((elevation) => elevation.id !== id))

  const getSqft = (elevation) => Math.max(0, toNumber(elevation.height) * toNumber(elevation.width) - toNumber(elevation.deductions))

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Exterior takeoff</p>
          <h2>Exterior elevations</h2>
          <p className="section-copy">Measure each side and subtract windows, doors, and other openings.</p>
        </div>
        <button className="button button-secondary" onClick={addElevation} type="button">
          <Plus size={16} /> Add side
        </button>
      </div>
      <div className="elevation-grid">
        {elevations.map((elevation, index) => {
          const sqft = getSqft(elevation)
          return (
            <div className="measurement-card" key={elevation.id}>
              <div className="card-topline">
                <div className="side-icon">{(elevation.label || elevationLabels[index] || 'E').slice(0, 1)}</div>
                <div>
                  <label className="card-label" htmlFor={`elevation-label-${elevation.id}`}>Side name</label>
                  <input
                    className="inline-title"
                    id={`elevation-label-${elevation.id}`}
                    value={elevation.label}
                    onChange={(event) => updateElevation(elevation.id, 'label', event.target.value)}
                  />
                </div>
                {elevations.length > 1 && (
                  <button className="icon-button danger" onClick={() => removeElevation(elevation.id)} type="button" aria-label={`Remove ${elevation.label}`}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="field-row">
                <label>
                  <span>Height</span>
                  <div className="input-unit"><input min="0" type="number" value={elevation.height} onChange={(event) => updateElevation(elevation.id, 'height', event.target.value)} placeholder="0" /><em>ft</em></div>
                </label>
                <label>
                  <span>Width</span>
                  <div className="input-unit"><input min="0" type="number" value={elevation.width} onChange={(event) => updateElevation(elevation.id, 'width', event.target.value)} placeholder="0" /><em>ft</em></div>
                </label>
              </div>
              <label className="full-field">
                <span>Deductions / openings</span>
                <div className="input-unit"><input min="0" type="number" value={elevation.deductions} onChange={(event) => updateElevation(elevation.id, 'deductions', event.target.value)} placeholder="0" /><em>sq ft</em></div>
              </label>
              <div className="calculation-line">
                <span>Paintable area</span>
                <strong>{sqft.toLocaleString()} <small>sq ft</small></strong>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
