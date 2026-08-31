// ─── Modular Master Rates: finish pricing master data & persistence ───────
// Centralized per-sq.ft. rate definitions for every finish category and tier.
// Rates are persisted in localStorage so they can be updated dynamically and
// survive page reloads. Use `getRateForFinish(category, tierId)` for lookups in
// calculation code; it always returns the active (possibly overridden) rate.

// ── Types ───────────────────────────────────────────────────────────────────

export type FinishBase = "water" | "oil" | "none";

export type FinishTier = {
  /** true for user-added finishes created via "+ Add Custom Finish" */
  isCustom?: boolean;
  id: string;
  label: string;
  base: FinishBase;
  /** default per-sq.ft. rate (₹) */
  r: number;
};

export type FinishCategoryKey =
  | "interior"
  | "exterior"
  | "woodMetal"
  | "texture"
  | "wallpaper";

export type FinishSubCategoryKey =
  | "putty"
  | "primer"
  | "paint"
  | "topcoat"
  | "oilPaint"
  | "polish"
  | "texture"
  | "protection"
  | "wallpaper";

export type FinishCategory = {
  key: FinishCategoryKey;
  label: string;
  icon: string;
  /** sub-finish groups under this category */
  subCategories: {
    key: FinishSubCategoryKey;
    label: string;
    icon: string;
    tiers: FinishTier[];
  }[];
};

// ── Default master rate data ────────────────────────────────────────────────
// Mirrors the rates currently hardcoded in src/components/shared.jsx so the
// app can migrate to this single source of truth without behavior change.

const INTERIOR: FinishCategory = {
  key: "interior",
  label: "Interior",
  icon: "🏠",
  subCategories: [
    {
      key: "putty",
      label: "Wall Putty",
      icon: "🪣",
      tiers: [
        { id: "white_cement", label: "White Cement Putty", base: "none", r: 8 },
        { id: "wall_putty", label: "Wall Putty", base: "none", r: 10 },
        { id: "acrylic_putty", label: "Acrylic Putty", base: "none", r: 14 },
        { id: "polymer", label: "Polymer Putty", base: "none", r: 15 },
        { id: "waterproof", label: "Waterproof Putty", base: "none", r: 20 },
      ],
    },
    {
      key: "primer",
      label: "Primer",
      icon: "🧴",
      tiers: [
        { id: "interior", label: "Interior Primer", base: "water", r: 7 },
        { id: "acrylic_p", label: "Acrylic Primer", base: "water", r: 8 },
        { id: "wood", label: "Wood Primer", base: "oil", r: 11 },
        { id: "metal", label: "Metal Primer", base: "oil", r: 12 },
      ],
    },
    {
      key: "paint",
      label: "Wall Paint",
      icon: "🎨",
      tiers: [
        { id: "distemper", label: "Distemper", base: "water", r: 10 },
        { id: "economy_emulsion", label: "Economy Emulsion", base: "water", r: 18 },
        { id: "premium_emulsion", label: "Premium Emulsion", base: "water", r: 32 },
        { id: "luxury_emulsion", label: "Luxury Emulsion", base: "water", r: 45 },
        { id: "designer_finish", label: "Designer Finish", base: "water", r: 60 },
        { id: "anti_fungal", label: "Anti-Fungal Paint", base: "water", r: 28 },
        { id: "washable", label: "Washable Paint", base: "water", r: 25 },
        { id: "synthetic_enamel", label: "Synthetic Enamel", base: "oil", r: 25 },
        { id: "high_gloss", label: "High Gloss Enamel", base: "oil", r: 30 },
      ],
    },
    {
      key: "topcoat",
      label: "Topcoat",
      icon: "✨",
      tiers: [
        { id: "clear_varnish", label: "Clear Varnish", base: "none", r: 12 },
        { id: "polyurethane", label: "Polyurethane", base: "none", r: 18 },
      ],
    },
  ],
};

const EXTERIOR: FinishCategory = {
  key: "exterior",
  label: "Exterior",
  icon: "🏗",
  subCategories: [
    {
      key: "putty",
      label: "Surface Prep / Putty",
      icon: "🪣",
      tiers: [
        { id: "white_cement_ext", label: "White Cement", base: "none", r: 8 },
        { id: "exterior_putty", label: "Exterior Putty", base: "none", r: 12 },
      ],
    },
    {
      key: "primer",
      label: "Primer",
      icon: "🧴",
      tiers: [
        { id: "exterior_primer", label: "Exterior Primer", base: "water", r: 9 },
        { id: "alkali_primer", label: "Alkali Resistant Primer", base: "water", r: 11 },
      ],
    },
    {
      key: "paint",
      label: "Exterior Paint",
      icon: "🎨",
      tiers: [
        { id: "economy_ext", label: "Economy Exterior Emulsion", base: "water", r: 20 },
        { id: "premium_ext", label: "Premium Exterior Emulsion", base: "water", r: 32 },
        { id: "luxury_ext", label: "Luxury Exterior Emulsion", base: "water", r: 50 },
        { id: "ultra_luxury_ext", label: "Ultra Luxury Exterior Emulsion", base: "water", r: 75 },
      ],
    },
    {
      key: "protection",
      label: "Protection Coating",
      icon: "🛡",
      tiers: [
        { id: "waterproof", label: "Waterproof Coating", base: "none", r: 18 },
        { id: "elastomeric", label: "Elastomeric Coating", base: "none", r: 25 },
        { id: "anti_fungal_ext", label: "Anti-Fungal Coating", base: "none", r: 20 },
      ],
    },
    {
      key: "texture",
      label: "Decorative Finish",
      icon: "🏔",
      tiers: [
        { id: "exterior_texture", label: "Exterior Texture", base: "none", r: 35 },
        { id: "stone_finish", label: "Stone Finish", base: "none", r: 55 },
        { id: "sand_texture", label: "Sand Texture", base: "none", r: 28 },
      ],
    },
  ],
};

const WOOD_METAL: FinishCategory = {
  key: "woodMetal",
  label: "Wood & Metal",
  icon: "🚪",
  subCategories: [
    {
      key: "oilPaint",
      label: "Enamel / Trim",
      icon: "🛢",
      tiers: [
        { id: "synthetic_enamel", label: "Synthetic Enamel", base: "oil", r: 25 },
        { id: "high_gloss", label: "High Gloss", base: "oil", r: 30 },
        { id: "oil_paint", label: "Oil Paint", base: "oil", r: 28 },
        { id: "duco_finish", label: "Duco Finish", base: "oil", r: 55 },
      ],
    },
    {
      key: "polish",
      label: "Polish",
      icon: "💅",
      tiers: [
        { id: "melamine", label: "Melamine Polish", base: "none", r: 35 },
        { id: "pu", label: "PU Polish", base: "none", r: 45 },
        { id: "nc", label: "NC Polish", base: "none", r: 28 },
        { id: "french", label: "French Polish", base: "none", r: 50 },
        { id: "wood_stain", label: "Wood Stain", base: "none", r: 20 },
      ],
    },
    {
      key: "topcoat",
      label: "Topcoat",
      icon: "✨",
      tiers: [
        { id: "clear_varnish", label: "Clear Varnish", base: "none", r: 12 },
        { id: "polyurethane", label: "Polyurethane", base: "none", r: 18 },
      ],
    },
  ],
};

const TEXTURE: FinishCategory = {
  key: "texture",
  label: "Texture",
  icon: "🧱",
  subCategories: [
    {
      key: "texture",
      label: "Texture",
      icon: "🏔",
      tiers: [
        { id: "roller", label: "Roller Texture", base: "none", r: 22 },
        { id: "metallic", label: "Metallic Finish", base: "none", r: 50 },
        { id: "venetian", label: "Venetian Finish", base: "none", r: 70 },
        { id: "stucco", label: "Stucco Finish", base: "none", r: 35 },
      ],
    },
  ],
};

const WALLPAPER: FinishCategory = {
  key: "wallpaper",
  label: "Wallpaper",
  icon: "🖼",
  subCategories: [
    {
      key: "wallpaper",
      label: "Wallpaper",
      icon: "🖼",
      tiers: [
        { id: "vinyl", label: "Vinyl Wallpaper", base: "none", r: 40 },
        { id: "non_woven", label: "Non-Woven Wallpaper", base: "none", r: 55 },
        { id: "fabric", label: "Fabric Wallpaper", base: "none", r: 80 },
      ],
    },
  ],
};

export const DEFAULT_MASTER_RATES: FinishCategory[] = [
  INTERIOR,
  EXTERIOR,
  WOOD_METAL,
  TEXTURE,
  WALLPAPER,
];

// ── localStorage persistence ───────────────────────────────────────────────

const STORAGE_KEY = "paintpro_master_rates_v1";

/**
 * True for a leftover hardcoded "custom" placeholder tier from before these
 * were removed from DEFAULT_MASTER_RATES (id === "custom" exactly) — never
 * for a real user-added finish, which always has a generated id like
 * "custom_<slug>_<timestamp>", not the bare string "custom".
 */
function isLegacyCustomPlaceholder(t: FinishTier): boolean {
  return t.id === "custom";
}

export function getStoredMasterRates(): FinishCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MASTER_RATES;
    const parsed = JSON.parse(raw) as FinishCategory[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MASTER_RATES;

    // Self-heal: purge any legacy hardcoded "custom" placeholder tiers still
    // sitting in a browser's previously-saved rates. Real custom finishes
    // (isCustom:true) are never touched, no matter what they're named.
    let purged = false;
    const cleaned = parsed.map((cat) => ({
      ...cat,
      subCategories: (cat.subCategories || []).map((sub) => {
        const tiers = (sub.tiers || []).filter((t) => {
          if (isLegacyCustomPlaceholder(t)) { purged = true; return false; }
          return true;
        });
        return { ...sub, tiers };
      }),
    }));

    if (purged) saveMasterRates(cleaned); // persist once so this only runs a single time per browser

    return cleaned;
  } catch {
    return DEFAULT_MASTER_RATES;
  }
}

export function saveMasterRates(rates: FinishCategory[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    return true;
  } catch {
    return false;
  }
}

export function resetMasterRates(): FinishCategory[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return DEFAULT_MASTER_RATES;
}

// ── Rate lookup ────────────────────────────────────────────────────────────

/**
 * Returns the active per-sq.ft. rate for a given category + tier.
 *
 * @param category  one of: "interior" | "exterior" | "woodMetal" | "texture" | "wallpaper"
 * @param tierId    the tier id within the category (e.g. "premium_emulsion")
 * @param subCategory  optional sub-category key to disambiguate when the same
 *                     tier id exists under multiple sub-categories
 * @returns the rate in ₹/sq.ft., or 0 if not found
 */
export function getRateForFinish(
  category: FinishCategoryKey,
  tierId: string,
  subCategory?: FinishSubCategoryKey,
): number {
  const rates = getStoredMasterRates();
  const cat = rates.find((c) => c.key === category);
  if (!cat) return 0;

  for (const sub of cat.subCategories) {
    if (subCategory && sub.key !== subCategory) continue;
    const tier = sub.tiers.find((t) => t.id === tierId);
    if (tier) return tier.r;
  }

  if (!subCategory) {
    for (const sub of cat.subCategories) {
      const tier = sub.tiers.find((t) => t.id === tierId);
      if (tier) return tier.r;
    }
  }

  return 0;
}

// ── Dynamic custom finishes ────────────────────────────────────────────────
// User-added finishes ("+ Add Custom Finish" in Master Rates Manager). These
// are stored as ordinary tiers (isCustom:true) inside the target sub-category
// so they persist in localStorage alongside standard rates and are picked up
// automatically anywhere getStoredMasterRates()/getRateForFinish() is used.

function slugifyItemName(name: string): string {
  return (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "") || "item";
}

/**
 * Adds a user-defined custom finish (name + base rate) to a category's
 * sub-category and returns a NEW rates array (does not mutate `rates`).
 * Does not persist — call saveMasterRates(result) to write it to storage.
 */
export function addCustomTier(
  rates: FinishCategory[],
  categoryKey: FinishCategoryKey,
  subCategoryKey: FinishSubCategoryKey,
  name: string,
  rate: number,
): FinishCategory[] {
  const trimmed = (name || "").trim();
  if (!trimmed) return rates;
  const id = `custom_${slugifyItemName(trimmed)}_${Date.now().toString(36)}`;
  const newTier: FinishTier = { id, label: trimmed, base: "none", r: Number(rate) || 0, isCustom: true };

  return rates.map((cat) => {
    if (cat.key !== categoryKey) return cat;
    return {
      ...cat,
      subCategories: cat.subCategories.map((sub) => {
        if (sub.key !== subCategoryKey) return sub;
        // insert before the built-in "custom" placeholder tier if one exists,
        // otherwise append
        const idx = sub.tiers.findIndex((t) => t.id === "custom");
        const tiers =
          idx === -1
            ? [...sub.tiers, newTier]
            : [...sub.tiers.slice(0, idx), newTier, ...sub.tiers.slice(idx)];
        return { ...sub, tiers };
      }),
    };
  });
}

/**
 * Removes a previously-added custom tier by id. Refuses to remove built-in
 * (non-custom) tiers. Returns a NEW rates array; call saveMasterRates() to persist.
 */
export function removeCustomTier(
  rates: FinishCategory[],
  categoryKey: FinishCategoryKey,
  subCategoryKey: FinishSubCategoryKey,
  tierId: string,
): FinishCategory[] {
  return rates.map((cat) => {
    if (cat.key !== categoryKey) return cat;
    return {
      ...cat,
      subCategories: cat.subCategories.map((sub) => {
        if (sub.key !== subCategoryKey) return sub;
        return {
          ...sub,
          tiers: sub.tiers.filter((t) => !(t.id === tierId && t.isCustom)),
        };
      }),
    };
  });
}

/**
 * Returns the full FinishTier object for a given category + tier id.
 */
export function getTierForFinish(
  category: FinishCategoryKey,
  tierId: string,
  subCategory?: FinishSubCategoryKey,
): FinishTier | null {
  const rates = getStoredMasterRates();
  const cat = rates.find((c) => c.key === category);
  if (!cat) return null;

  for (const sub of cat.subCategories) {
    if (subCategory && sub.key !== subCategory) continue;
    const tier = sub.tiers.find((t) => t.id === tierId);
    if (tier) return tier;
  }

  if (!subCategory) {
    for (const sub of cat.subCategories) {
      const tier = sub.tiers.find((t) => t.id === tierId);
      if (tier) return tier;
    }
  }

  return null;
}
