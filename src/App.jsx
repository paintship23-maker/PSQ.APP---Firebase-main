import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, HardHat, LoaderCircle, Save, Sparkles } from 'lucide-react'
import { supabase } from './lib/supabase'
import ExteriorElevations from './components/ExteriorElevations'
import Rooms from './components/Rooms'

const toNumber = (value) => Number(value) || 0
const calculateElevationSqft = (elevation) => Math.max(0, toNumber(elevation.height) * toNumber(elevation.width) - toNumber(elevation.deductions))
const calculateWallSqft = (wall) => Math.max(0, toNumber(wall.height) * toNumber(wall.width) - toNumber(wall.deductions))

const defaultElevations = [
  { id: 'front', label: 'Front', height: '', width: '', deductions: '', sqft: 0 },
  { id: 'rear', label: 'Rear', height: '', width: '', deductions: '', sqft: 0 },
  { id: 'left', label: 'Left', height: '', width: '', deductions: '', sqft: 0 },
  { id: 'right', label: 'Right', height: '', width: '', deductions: '', sqft: 0 },
]

const defaultRooms = [
  { id: 'living-room', name: 'Living room', room_sqft: 0, walls: [1, 2, 3, 4].map((number) => ({ id: `living-wall-${number}`, label: `Wall ${number}`, height: '', width: '', deductions: '', sqft: 0 })) },
]

function App() {
  const [projectId, setProjectId] = useState(null)
  const [projectName, setProjectName] = useState('New painting estimate')
  const [elevations, setElevations] = useState(defaultElevations)
  const [rooms, setRooms] = useState(defaultRooms)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadMessage, setLoadMessage] = useState('')

  const exteriorSqft = useMemo(() => elevations.reduce((sum, elevation) => sum + calculateElevationSqft(elevation), 0), [elevations])
  const roomTotals = useMemo(() => rooms.map((room) => room.walls.reduce((sum, wall) => sum + calculateWallSqft(wall), 0)), [rooms])
  const interiorSqft = useMemo(() => roomTotals.reduce((sum, total) => sum + total, 0), [roomTotals])
  const totalProjectSqft = exteriorSqft + interiorSqft

  useEffect(() => {
    let active = true
    const loadProject = async () => {
      const { data: project, error } = await supabase.from('projects').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (error || !project || !active) return
      const [{ data: elevationRows }, { data: roomRows }] = await Promise.all([
        supabase.from('exterior_elevations').select('*').eq('project_id', project.id).order('created_at'),
        supabase.from('rooms').select('*, room_walls(*)').eq('project_id', project.id).order('created_at'),
      ])
      setProjectId(project.id)
      setProjectName(project.name || 'New painting estimate')
      if (elevationRows?.length) setElevations(elevationRows)
      if (roomRows?.length) setRooms(roomRows.map((room) => ({ ...room, walls: room.room_walls || [] })))
    }
    loadProject()
    return () => { active = false }
  }, [])

  const saveEstimate = async () => {
    setIsSaving(true)
    setSaved(false)
    setLoadMessage('')
    const projectPayload = { name: projectName.trim() || 'New painting estimate', exterior_sqft: exteriorSqft, total_project_sqft: totalProjectSqft }
    const projectResult = projectId
      ? await supabase.from('projects').update(projectPayload).eq('id', projectId).select().maybeSingle()
      : await supabase.from('projects').insert(projectPayload).select().maybeSingle()
    if (projectResult.error || !projectResult.data) {
      setLoadMessage('Unable to save this estimate. Please try again.')
      setIsSaving(false)
      return
    }
    const currentProjectId = projectResult.data.id
    setProjectId(currentProjectId)
    await Promise.all([
      supabase.from('exterior_elevations').delete().eq('project_id', currentProjectId),
      supabase.from('rooms').delete().eq('project_id', currentProjectId),
    ])
    const elevationPayload = elevations.map((elevation) => ({ project_id: currentProjectId, label: elevation.label || 'Elevation', height: toNumber(elevation.height), width: toNumber(elevation.width), deductions: toNumber(elevation.deductions), sqft: calculateElevationSqft(elevation) }))
    const roomPayload = rooms.map((room, index) => ({ project_id: currentProjectId, name: room.name || 'Untitled room', room_sqft: roomTotals[index] || 0 }))
    const { data: savedRooms, error: roomError } = await supabase.from('rooms').insert(roomPayload).select()
    if (!roomError && savedRooms?.length) {
      const walls = savedRooms.flatMap((savedRoom, index) => rooms[index].walls.map((wall) => ({ room_id: savedRoom.id, label: wall.label || 'Wall', height: toNumber(wall.height), width: toNumber(wall.width), deductions: toNumber(wall.deductions), sqft: calculateWallSqft(wall) })))
      if (walls.length) await supabase.from('room_walls').insert(walls)
    }
    await supabase.from('exterior_elevations').insert(elevationPayload)
    setSaved(true)
    setIsSaving(false)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><HardHat size={22} /></div><span>Paint<span className="brand-accent">Pro</span></span></div>
        <div className="topbar-actions"><span className="save-status">{saved && <><Check size={15} /> Saved just now</>}</span><button className="button button-primary" onClick={saveEstimate} disabled={isSaving} type="button">{isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{isSaving ? 'Saving' : 'Save estimate'}</button></div>
      </header>
      <main className="main-content">
        <div className="page-intro">
          <div><div className="breadcrumb"><ClipboardList size={15} /> Estimates <span>/</span> Takeoff</div><input className="project-title" value={projectName} onChange={(event) => setProjectName(event.target.value)} /><p className="page-subtitle">Calculate paintable areas with confidence.</p></div>
          <div className="intro-badge"><Sparkles size={16} /><span>Live calculations</span></div>
        </div>
        {loadMessage && <div className="notice notice-error">{loadMessage}</div>}
        <div className="summary-grid"><div className="summary-card summary-primary"><div className="summary-label">Total project area</div><div className="summary-value">{totalProjectSqft.toLocaleString()} <small>sq ft</small></div><div className="summary-detail">Exterior + interior paintable area</div></div><div className="summary-card"><div className="summary-label">Exterior</div><div className="summary-value">{exteriorSqft.toLocaleString()} <small>sq ft</small></div><div className="summary-detail">{elevations.length} elevations measured</div></div><div className="summary-card"><div className="summary-label">Interior rooms</div><div className="summary-value">{interiorSqft.toLocaleString()} <small>sq ft</small></div><div className="summary-detail">{rooms.length} rooms measured</div></div></div>
        <ExteriorElevations elevations={elevations} onChange={setElevations} />
        <Rooms rooms={rooms.map((room, index) => ({ ...room, room_sqft: roomTotals[index] || 0 }))} onChange={setRooms} />
        <div className="bottom-note"><Check size={16} /><span>All calculations update automatically as you enter dimensions.</span></div>
      </main>
    </div>
  )
}

export default App
