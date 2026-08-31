import { supabase } from "./supabaseClient";
import { serializeMasterJSON } from "../utils/paintShipSerializer";

const LOCAL_KEY = "paintpro_v9";

const isSupabaseReady = () => Boolean(supabase);

function readLocalAll() {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] Error reading localStorage:", e);
  }
  return [];
}

function writeLocalAll(arr) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr));
    return true;
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] Error writing localStorage:", e);
    return false;
  }
}

function upsertLocal(project) {
  const all = readLocalAll();
  const idx = all.findIndex(p => String(p.id) === String(project.id));
  if (idx >= 0) all[idx] = project; else all.unshift(project);
  writeLocalAll(all);
}

function removeLocal(projectId) {
  writeLocalAll(readLocalAll().filter(p => String(p.id) !== String(projectId)));
}

function safeJson(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] JSON serialization error:", e);
    return {};
  }
}

async function findOrCreateClient(customerData) {
  const mobile = customerData?.mobile || "0000000000";

  const { data: existingClients, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("mobile", mobile)
    .single();

  if (findError && findError.code !== "PGRST116") {
    throw findError;
  }

  if (existingClients) {
    return existingClients.id;
  }

  const { data: newClient, error: insertError } = await supabase
    .from("clients")
    .insert([
      {
        name: customerData?.name || "",
        mobile: mobile,
        email: customerData?.email || "",
        address: customerData?.address || "",
        pincode: customerData?.pincode || "",
        location: customerData?.location || "",
      },
    ])
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return newClient.id;
}

function formatProjectFromSnapshot(row) {
  if (!row) return null;

  const rawData = row.snapshot_data || row.full_json || row.snapshot || {};
  const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  const customer = data.customer || {};
  const projectInfo = data.projectInfo || {};
  const summaryMetrics = data.summaryMetrics || {};

  return {
    id: data.projectInfo?.projectId || row.project_id || row.id || "",
    clientName: customer.name || "Unnamed",
    clientMobile: customer.mobile || "",
    email: customer.email || "",
    pincode: customer.pincode || "",
    address: customer.address || "",
    location: customer.location || "",
    projectCategory: projectInfo.projectCategory || data.projectCategory || "residential",
    projectType: projectInfo.projectType || data.projectType || "fresh",
    scope: data.scope || "Both",
    quoteMode: projectInfo.quoteMode || data.quoteMode || "with_material",
    grandTotal: summaryMetrics.grandTotal ?? data.grandTotal ?? data.totalAmount ?? 0,
    totalArea: summaryMetrics.totalInteriorSqft ?? data.totalArea ?? 0,
    totalInteriorSqft: summaryMetrics.totalInteriorSqft ?? 0,
    totalExteriorSqft: summaryMetrics.totalExteriorSqft ?? 0,
    estimatedTotalDays: summaryMetrics.estimatedTotalDays ?? null,
    estimatedWorkersPerDay: summaryMetrics.estimatedWorkersPerDay ?? null,
    createdAt: projectInfo.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || row.updated_at || new Date().toISOString(),
    customer,
    projectInfo,
    summaryMetrics,
    materialBillOfQuantities: data.materialBillOfQuantities || [],
    exteriorWork: data.exteriorWork || {},
    floors: data.floors || [],
    woodAndMetalItems: data.woodAndMetalItems || [],
    warranties: data.warranties || [],
    specialFeatures: data.specialFeatures || {},
  };
}

export async function saveProject(project) {
  if (import.meta.env.DEV) console.log("--> SUPABASE SAVE_PROJECT CALLED WITH:", project);
  if (!project || !project.id) {
    const errorMsg = "saveProject: invalid project object or missing project.id";
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence]", errorMsg);
    return { ok: false, synced: false, error: errorMsg };
  }

  upsertLocal(project);

  if (!isSupabaseReady()) {
    if (import.meta.env.DEV) console.warn("[supabaseProjectPersistence] Supabase not ready — saved to localStorage only.");
    return { ok: true, synced: false, project };
  }

  try {
    const normalizedProject = {
      ...project,
      customer: {
        ...(project.customer || {}),
        name: project.customer?.name || project.clientName || project.name || "Unnamed Client",
        mobile: project.customer?.mobile || project.clientMobile || project.mobile || "",
        email: project.customer?.email || project.clientEmail || "",
        address: project.customer?.address || project.address || "",
        pincode: project.customer?.pincode || project.pincode || "",
        location: project.customer?.location || project.location || "",
      },
      projectInfo: {
        projectId: String(project.id || project.projectInfo?.projectId || ("proj_" + Date.now())),
        projectName:
          project.projectName ||
          project.name ||
          project.projectInfo?.projectName ||
          project.clientName ||
          "Paint Project",
        projectCategory: project.projectInfo?.projectCategory || project.projectCategory || "residential",
        projectType: project.projectInfo?.projectType || project.projectType || "fresh",
        quoteMode:
          project.projectInfo?.quoteMode ||
          (project.quoteMode === "labor_only" ? "labor_only" : "with_material"),
        totalBudget:
          project.projectInfo?.totalBudget ??
          project.totalBudget ??
          Number(project.grandTotal || project.totalAmount || 0),
        createdAt: project.projectInfo?.createdAt || project.createdAt || new Date().toISOString(),
        notes: project.projectInfo?.notes || project.notes || "",
        ...(project.projectInfo || {}),
      },
    };

  let serializedProject;
  try {
    serializedProject = serializeMasterJSON(normalizedProject);
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] Serialization error:", e);
  }
  const projectId = String(serializedProject?.projectInfo?.projectId || project?.id || ("proj_" + Date.now()));
  const customer = serializedProject?.customer || {};

  // 1. Client Table Sync
  const clientUUID = await findOrCreateClient({
    name: customer.name || project?.customer?.name || project?.clientName || project?.name || "Unnamed Client",
    mobile: customer.mobile || project?.customer?.mobile || project?.clientMobile || project?.mobile || "0000000000",
    email: customer.email || project?.customer?.email || project?.clientEmail || "",
    address: customer.address || project?.customer?.address || project?.address || "",
    pincode: customer.pincode || project?.customer?.pincode || project?.pincode || "",
    location: customer.location || project?.customer?.location || project?.location || "",
  });

  // 2. Projects Table Sync
  const exteriors = project.exteriorWork?.sides || project.exteriorSides || project.exteriors || serializedProject?.exteriors || [];
  const joinery = project.woodAndMetalItems || project.joineryItems || project.joinery || serializedProject?.woodAndMetalItems || [];
  const rooms = project.floors?.flatMap(f => f.rooms || []) || project.rooms || [];
  const calcExteriorSqFt = exteriors.reduce((acc, item) => acc + Number(item.netSqFt || item.net_sqft || item.area || 0), 0);
  const calcInteriorSqFt = rooms.reduce((acc, r) => acc + Number(r.carpetArea || r.area || r.sqft || 0), 0);
  const calcDoorsWindows = joinery.reduce((acc, j) => acc + Number(j.quantity || j.qty || 1), 0);

  const projectPayload = {
    id: projectId,
    client_id: clientUUID,
    project_name: project.projectName || project.name || 'Painting Project',
    total_interior_sqft: Number(project.totalInteriorSqFt || calcInteriorSqFt || 0),
    total_exterior_sqft: Number(project.totalExteriorSqFt || calcExteriorSqFt || 0),
    total_doors_windows_qty: Number(project.totalDoorsWindowsQty || calcDoorsWindows || 0),
    updated_at: new Date().toISOString()
  };

  console.log("PROJECT PAYLOAD SENT:", projectPayload);

  const { error: projectError } = await supabase
    .from("projects")
    .upsert(projectPayload, { onConflict: "id" });

  if (projectError) throw projectError;

  // 3. Project Rooms Sync
  try {
    await supabase.from("project_rooms").delete().eq("project_id", projectId);
    const floors = serializedProject?.floors || [];
    if (floors.length > 0) {
      const roomsToInsert = [];
      for (const floor of floors) {
        const floorName = floor.floorName || "";
        for (const room of floor.rooms || []) {
          if (!room) continue;
          roomsToInsert.push({
            project_id: projectId,
            floor_name: floorName,
            room_type: room.roomType || "",
            room_height_ft: Number(room.roomHeightFt || 0),
            net_wall_sqft: Number(room.netWallSqft || 0),
            ceiling_sqft: Number(room.ceilingSqft || 0),
            total_sqft: Number(room.totalSqft || 0),
            package: room.package || "",
            brand: room.brand || "",
          });
        }
      }
      if (roomsToInsert.length > 0) {
        await supabase.from("project_rooms").insert(roomsToInsert);
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] Rooms insert error:", e);
  }

  // 4. Project Exteriors Sync
  try {
    await supabase.from("project_exteriors").delete().eq("project_id", projectId);
    console.log("EXTERIOR DATA SOURCES:", project.exteriorWork, project.exteriors, serializedProject?.exteriors);
    const exteriorsList = project.exteriorWork?.sides || project.exteriorSides || project.exteriors || serializedProject?.exteriorWork?.sides || serializedProject?.exteriors || [];
    const exteriorPayload = exteriorsList.map((ext) => ({
      id: ext.id || crypto.randomUUID(),
      project_id: projectId,
      side_name: ext.sideName || ext.name || ext.side_name || 'Exterior Wall',
      net_sqft: Number(ext.netSqFt || ext.net_sqft || ext.area || 0),
      condition: ext.condition || 'good'
    }));

    if (exteriorPayload.length > 0) {
      const { error: extError } = await supabase.from("project_exteriors").insert(exteriorPayload);
      if (extError) console.error("[supabaseProjectPersistence] Exteriors insert error:", extError);
    }
  } catch (e) {
    console.error("[supabaseProjectPersistence] Exteriors insert error:", e);
  }

  // 5. Project Joinery Items Sync
  try {
    await supabase.from("project_joinery_items").delete().eq("project_id", projectId);
    const joineryItems = project.woodAndMetalItems || project.joineryItems || project.joinery || serializedProject?.woodAndMetalItems || [];
    if (joineryItems.length > 0) {
      const joineryToInsert = joineryItems.map((item) => ({
        project_id: projectId,
        item_id: item?.itemId || item?.id || "",
        item_type: item?.itemType || item?.type || "",
        custom_label: item?.customLabel || item?.name || "",
        floor_name: item?.location?.floorName || item?.floorName || "",
        room_name: item?.location?.roomName || item?.roomName || "",
        width_ft: Number(item?.dimensions?.widthFt || item?.width || 0),
        height_ft: Number(item?.dimensions?.heightFt || item?.height || 0),
        qty: Number(item?.dimensions?.qty || item?.qty || 1),
        total_sqft: Number(item?.dimensions?.totalSqft || item?.totalSqft || 0),
        finish_type: item?.finishType || "",
        product_name: item?.productName || "",
        coats: Number(item?.coats || 0),
      }));
      const { error: joineryError } = await supabase.from("project_joinery_items").insert(joineryToInsert);
      if (joineryError) console.error("[supabaseProjectPersistence] Joinery insert error:", joineryError);
    }
  } catch (e) {
    console.error("[supabaseProjectPersistence] Joinery insert error:", e);
  }

  // 6. Project Warranties Sync
  try {
    await supabase.from("project_warranties").delete().eq("project_id", projectId);
    const warranties = project.warranties || serializedProject.warranties || [];
    if (warranties.length > 0) {
      const warrantiesToInsert = warranties.map((w) => ({
        project_id: projectId,
        system_name: w?.system_name || w?.systemName || "",
        warranty_years: Number(w?.warranty_years || w?.years || 0),
        details: w?.details || ""
      }));
      const { error: warrantyError } = await supabase.from("project_warranties").insert(warrantiesToInsert);
      if (warrantyError) console.error("[supabaseProjectPersistence] Warranties insert error:", warrantyError);
    }
  } catch (e) {
    console.error("[supabaseProjectPersistence] Warranties insert error:", e);
  }

  // 7. Snapshots Sync (Safe Payload to prevent NULL constraints)
  const snapshotPayload = {
    project_id: projectId,
    snapshot_data: safeJson(serializedProject || normalizedProject),
    full_json: safeJson(serializedProject || normalizedProject),
    created_at: new Date().toISOString()
  };

  const { error: snapshotError } = await supabase
    .from("project_snapshots")
    .upsert(snapshotPayload, { onConflict: "project_id" });

  if (snapshotError) {
    if (import.meta.env.DEV) console.error("SNAPSHOT ERROR:", snapshotError);
    await supabase.from("project_snapshots").insert(snapshotPayload);
  }

  if (import.meta.env.DEV) console.log("--> SUPABASE SUCCESS WRITE FOR:", projectId);
  return { ok: true, synced: true, project: serializedProject };
} catch (error) {
  if (import.meta.env.DEV) console.error("--> SUPABASE WRITE FAILED:", error);
  return { ok: false, synced: false, project, error: error.message };
}
}

export const updateProject = saveProject;
export const saveProjectData = saveProject;

export async function loadProject(projectId) {
  if (!isSupabaseReady()) {
    return readLocalAll().find(p => String(p.id) === String(projectId)) || null;
  }

  try {
    const { data: row, error } = await supabase
      .from("project_snapshots")
      .select("*")
      .eq("project_id", String(projectId))
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] loadProject error:", error);
      return null;
    }

    if (row) {
      return formatProjectFromSnapshot(row);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] loadProject exception:", e);
  }

  return readLocalAll().find(p => String(p.id) === String(projectId)) || null;
}

export const getProjectData = loadProject;

export async function loadAllProjects() {
  const local = readLocalAll();

  if (!isSupabaseReady()) {
    return local;
  }

  try {
    const { data: rows, error } = await supabase
      .from("project_snapshots")
      .select("*");

    if (error || !rows || rows.length === 0) {
      return local;
    }

    const remote = rows
      .filter(row => !row.is_deleted)
      .map(row => formatProjectFromSnapshot(row))
      .filter(p => p !== null);

    const mergedMap = new Map();
    local.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });
    remote.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

    const merged = Array.from(mergedMap.values());
    writeLocalAll(merged);
    return merged;
  } catch (e) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] loadAllProjects exception:", e);
    return local;
  }
}

export async function deleteProject(projectId) {
  removeLocal(projectId);

  if (!isSupabaseReady()) return { ok: true, synced: false };

  try {
    await supabase
      .from("projects")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", String(projectId));

    await supabase
      .from("project_snapshots")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("project_id", String(projectId));

    return { ok: true, synced: true };
  } catch (error) {
    if (import.meta.env.DEV) console.error("[supabaseProjectPersistence] deleteProject error:", error);
    return { ok: false, synced: false, error: error.message };
  }
}