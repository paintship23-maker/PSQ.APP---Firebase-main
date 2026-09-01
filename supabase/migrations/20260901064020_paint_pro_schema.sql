/*
# Paint Pro — Project Schema (single-tenant, no auth)

1. New Tables
- `projects`: A painting project with a name and computed total square footage.
  - `id` (uuid, PK)
  - `name` (text)
  - `exterior_sqft` (numeric, default 0) — total exterior paintable area
  - `total_project_sqft` (numeric, default 0) — exterior + all room areas
  - `created_at` (timestamptz)
- `exterior_elevations`: The four sides of a building (front, rear, left, right).
  - `id` (uuid, PK)
  - `project_id` (uuid FK → projects)
  - `label` (text: Front, Rear, Left, Right)
  - `height` (numeric, default 0) — wall height in feet
  - `width` (numeric, default 0) — wall width in feet
  - `deductions` (numeric, default 0) — openings (windows/doors) in sq ft
  - `sqft` (numeric, default 0) — (height * width) - deductions
  - `created_at` (timestamptz)
- `rooms`: Interior rooms in a project.
  - `id` (uuid, PK)
  - `project_id` (uuid FK → projects)
  - `name` (text)
  - `room_sqft` (numeric, default 0) — sum of wall areas minus deductions
  - `created_at` (timestamptz)
- `room_walls`: Individual walls within a room.
  - `id` (uuid, PK)
  - `room_id` (uuid FK → rooms)
  - `label` (text: Wall 1, Wall 2, etc.)
  - `height` (numeric, default 0)
  - `width` (numeric, default 0)
  - `deductions` (numeric, default 0)
  - `sqft` (numeric, default 0) — (height * width) - deductions
  - `created_at` (timestamptz)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD on all tables (single-tenant, no sign-in).
- USING (true) / WITH CHECK (true) is acceptable because data is intentionally shared.

3. Important Notes
- `exterior_sqft` on projects is the SUM of all elevation (height * width) - deductions.
- `room_sqft` on rooms is the SUM of all wall (height * width) - deductions.
- `total_project_sqft` on projects is exterior_sqft + SUM of all room_sqft.
- The frontend calculates these values and writes them to Supabase; the schema stores them as numeric columns.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Project',
  exterior_sqft numeric NOT NULL DEFAULT 0,
  total_project_sqft numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS exterior_elevations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Front',
  height numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  sqft numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exterior_elevations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exterior_elevations" ON exterior_elevations;
CREATE POLICY "anon_select_exterior_elevations" ON exterior_elevations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exterior_elevations" ON exterior_elevations;
CREATE POLICY "anon_insert_exterior_elevations" ON exterior_elevations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exterior_elevations" ON exterior_elevations;
CREATE POLICY "anon_update_exterior_elevations" ON exterior_elevations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exterior_elevations" ON exterior_elevations;
CREATE POLICY "anon_delete_exterior_elevations" ON exterior_elevations FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Room',
  room_sqft numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS room_walls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Wall 1',
  height numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  sqft numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_walls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_room_walls" ON room_walls;
CREATE POLICY "anon_select_room_walls" ON room_walls FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_room_walls" ON room_walls;
CREATE POLICY "anon_insert_room_walls" ON room_walls FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_room_walls" ON room_walls;
CREATE POLICY "anon_update_room_walls" ON room_walls FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_room_walls" ON room_walls;
CREATE POLICY "anon_delete_room_walls" ON room_walls FOR DELETE
  TO anon, authenticated USING (true);
