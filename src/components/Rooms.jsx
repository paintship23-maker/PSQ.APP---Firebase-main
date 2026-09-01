import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

const toNumber = (value) => Number(value) || 0
const wallSqft = (wall) => Math.max(0, toNumber(wall.height) * toNumber(wall.width) - toNumber(wall.deductions))

const createWall = (number) => ({ id: `new-wall-${Date.now()}-${number}`, label: `Wall ${number}`, height: '', width: '', deductions: '', sqft: 0 })

export default function Rooms({ rooms, onChange }) {
  const [openRoomId, setOpenRoomId] = useState(rooms[0]?.id ?? null)

  const updateRoom = (roomId, updater) => {
    onChange(rooms.map((room) => room.id === roomId ? updater(room) : room))
  }

  const addRoom = () => {
    const room = { id: `new-room-${Date.now()}`, name: `Room ${rooms.length + 1}`, room_sqft: 0, walls: [createWall(1), createWall(2), createWall(3), createWall(4)] }
    onChange([...rooms, room])
    setOpenRoomId(room.id)
  }

  const removeRoom = (roomId) => onChange(rooms.filter((room) => room.id !== roomId))

  const updateWall = (roomId, wallId, field, value) => {
    updateRoom(roomId, (room) => ({
      ...room,
      walls: room.walls.map((wall) => wall.id === wallId ? { ...wall, [field]: value } : wall),
    }))
  }

  const addWall = (roomId) => {
    updateRoom(roomId, (room) => ({ ...room, walls: [...room.walls, createWall(room.walls.length + 1)] }))
  }

  const removeWall = (roomId, wallId) => {
    updateRoom(roomId, (room) => ({ ...room, walls: room.walls.filter((wall) => wall.id !== wallId) }))
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Interior takeoff</p>
          <h2>Rooms</h2>
          <p className="section-copy">Room totals recalculate from every wall as you edit dimensions or deductions.</p>
        </div>
        <button className="button button-secondary" onClick={addRoom} type="button"><Plus size={16} /> Add room</button>
      </div>
      <div className="room-list">
        {rooms.map((room) => {
          const total = room.walls.reduce((sum, wall) => sum + wallSqft(wall), 0)
          const isOpen = openRoomId === room.id
          return (
            <div className={`room-card ${isOpen ? 'is-open' : ''}`} key={room.id}>
              <div className="room-header">
                <button className="room-toggle" onClick={() => setOpenRoomId(isOpen ? null : room.id)} type="button">
                  <span className="room-number">{rooms.indexOf(room) + 1}</span>
                  <span className="room-name-wrap"><input value={room.name} onClick={(event) => event.stopPropagation()} onChange={(event) => updateRoom(room.id, (current) => ({ ...current, name: event.target.value }))} /><small>{room.walls.length} walls</small></span>
                  <strong>{total.toLocaleString()} <small>sq ft</small></strong>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {rooms.length > 1 && <button className="icon-button danger" onClick={() => removeRoom(room.id)} type="button" aria-label={`Remove ${room.name}`}><Trash2 size={16} /></button>}
              </div>
              {isOpen && (
                <div className="room-body">
                  {room.walls.map((wall, index) => (
                    <div className="wall-row" key={wall.id}>
                      <span className="wall-label">{index + 1}</span>
                      <input className="wall-name" value={wall.label} onChange={(event) => updateWall(room.id, wall.id, 'label', event.target.value)} />
                      <div className="compact-input"><input min="0" type="number" value={wall.height} onChange={(event) => updateWall(room.id, wall.id, 'height', event.target.value)} placeholder="Height" /><span>ft</span></div>
                      <div className="compact-input"><input min="0" type="number" value={wall.width} onChange={(event) => updateWall(room.id, wall.id, 'width', event.target.value)} placeholder="Width" /><span>ft</span></div>
                      <div className="compact-input"><input min="0" type="number" value={wall.deductions} onChange={(event) => updateWall(room.id, wall.id, 'deductions', event.target.value)} placeholder="Deduct" /><span>sq ft</span></div>
                      <strong className="wall-total">{wallSqft(wall).toLocaleString()}</strong>
                      {room.walls.length > 1 && <button className="icon-button danger" onClick={() => removeWall(room.id, wall.id)} type="button" aria-label={`Remove ${wall.label}`}><Trash2 size={14} /></button>}
                    </div>
                  ))}
                  <button className="add-wall" onClick={() => addWall(room.id)} type="button"><Plus size={15} /> Add wall</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
