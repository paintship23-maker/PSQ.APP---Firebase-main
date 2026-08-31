// ─── Estimation Engine ──────────────────────────────────────────────────
// Pure calculation functions for the section estimation pipeline:
//   Base Rate Split → Surface Condition → Wastage → Scaffolding → Discount → GST
//
// Every function here is pure (no side effects, no DOM/React/Firebase
// dependencies) so it can be unit tested and reused by calcSectionTotal()
// in App.jsx as well as by the invoice line-item breakdown.
//
// Rounding: intermediate steps are NOT rounded (to avoid compounding
// rounding error across the pipeline). Round only at display/output time.

/**
 * Step 1 — Base Rate Split.
 * Splits a gross section subtotal (Base SF Rate × Total Area) into
 * Material and Labour using a tier's labour share percentage.
 *
 * @param {number} grossSubtotal - Base SF Rate × Total Area for the section.
 * @param {number} laborSharePct - % of grossSubtotal that is Labour
 *   (defaults per tier: Putty 45, Paint 35, Texture 50).
 * @returns {{ material: number, labour: number }}
 */
export function splitLineItems(grossSubtotal, laborSharePct) {
  const gross = Number(grossSubtotal) || 0;
  const laborPct = Number(laborSharePct) || 0;
  const labour = gross * (laborPct / 100);
  const material = gross - labour;
  return { material, labour };
}

/**
 * Step 2 — Surface Condition Adjustment.
 * Fresh paint uses the standard (100%) material cost. Repaint/touchup
 * work needs less material, so a reduction is applied to material only;
 * labour is unaffected.
 *
 * @param {number} materialAmt - Material subtotal before adjustment.
 * @param {"fresh"|"repaint"} condition - Surface condition.
 * @param {number} [touchupReductionPct=15] - % reduction applied to
 *   material cost when condition is "repaint".
 * @returns {number} Adjusted material amount.
 */
export function getSurfaceConditionAdjustment(materialAmt, condition, touchupReductionPct = 15) {
  const mat = Number(materialAmt) || 0;
  if (condition === "repaint") {
    const pct = Number(touchupReductionPct) || 0;
    return mat * (1 - pct / 100);
  }
  return mat; // "fresh" (default) — standard rate, no reduction
}

/**
 * Step 3 — Material Wastage Buffer.
 * Applies a fixed buffer on top of the (already surface-condition-adjusted)
 * material subtotal to account for consumption losses (spillage, offcuts,
 * touch-up reserve, etc).
 *
 * @param {number} materialAmt - Material subtotal after surface condition adjustment.
 * @param {number} [wastagePct=5] - Wastage buffer percentage.
 * @returns {number} Material amount with wastage buffer applied.
 */
export function applyMaterialWastage(materialAmt, wastagePct = 5) {
  const mat = Number(materialAmt) || 0;
  const pct = Number(wastagePct) || 0;
  return mat * (1 + pct / 100);
}

/**
 * Step 4 — Scaffolding Surcharge.
 * Applies a surcharge on the Labour subtotal only, and only when
 * scaffolding is enabled for the section (e.g. auto-suggested when
 * working height exceeds a threshold, or manually toggled).
 *
 * @param {number} labourAmt - Labour subtotal.
 * @param {boolean} enabled - Whether scaffolding is required/toggled on.
 * @param {number} [surchargePct=10] - Surcharge percentage on labour.
 * @returns {number} Labour amount with scaffolding surcharge applied.
 */
export function applyScaffoldingSurcharge(labourAmt, enabled, surchargePct = 10) {
  const lab = Number(labourAmt) || 0;
  if (!enabled) return lab;
  const pct = Number(surchargePct) || 0;
  return lab * (1 + pct / 100);
}

/**
 * Step 5 — Discount.
 * Applies a section discount to the combined (Material + Labour) subtotal.
 * Supports either a flat ₹ amount or a percentage.
 * NOTE: not one of the 5 explicitly named engine functions, but required
 * to complete the pipeline before GST — kept here as a pure helper.
 * Not yet wired into any UI; discount TYPE selection is a Phase 2/3 concern.
 *
 * @param {number} subtotal - Material + Labour subtotal (post wastage/scaffolding).
 * @param {number} discountValue - The discount amount or percentage value.
 * @param {"percent"|"flat"} [discountType="percent"] - How to interpret discountValue.
 * @returns {{ discountAmt: number, afterDiscount: number }}
 */
export function applyDiscount(subtotal, discountValue, discountType = "percent") {
  const sub = Number(subtotal) || 0;
  const val = Number(discountValue) || 0;
  const discountAmt = discountType === "flat" ? val : sub * (val / 100);
  const afterDiscount = sub - discountAmt;
  return { discountAmt, afterDiscount };
}

/**
 * Step 6 — GST.
 * Applies GST on the post-discount taxable amount.
 *
 * @param {number} taxableAmount - Subtotal after discount.
 * @param {number} [gstPct=18] - GST percentage.
 * @returns {{ gstAmt: number, total: number }}
 */
export function applyGST(taxableAmount, gstPct = 18) {
  const taxable = Number(taxableAmount) || 0;
  const pct = Number(gstPct) || 0;
  const gstAmt = taxable * (pct / 100);
  return { gstAmt, total: taxable + gstAmt };
}

/**
 * Convenience orchestrator — runs the full pipeline in the confirmed order:
 *   Base Rate Split → Surface Condition → Wastage → Scaffolding → Discount → GST
 *
 * Not part of the originally-named function list; provided for Phase 2
 * wiring into calcSectionTotal() so the call site doesn't have to
 * re-implement step ordering. Pure function, no side effects.
 *
 * @param {Object} params
 * @param {number} params.grossSubtotal - Base SF Rate × Total Area.
 * @param {number} params.laborSharePct - Labour share % for the tier.
 * @param {"fresh"|"repaint"} [params.surfaceCondition="fresh"]
 * @param {number} [params.touchupReductionPct=15]
 * @param {number} [params.wastagePct=5]
 * @param {boolean} [params.scaffoldingEnabled=false]
 * @param {number} [params.scaffoldingSurchargePct=10]
 * @param {number} [params.discountValue=0]
 * @param {"percent"|"flat"} [params.discountType="percent"]
 * @param {number} [params.gstPct=18]
 * @returns {{
 *   matBase: number, labBase: number,
 *   matAfterCondition: number,
 *   matFinal: number, labFinal: number,
 *   wastageAmt: number, scaffoldingAmt: number,
 *   sub: number, discountAmt: number, afterDiscount: number,
 *   gstOn: number, gstAmt: number, total: number
 * }}
 */
export function runEstimationPipeline({
  grossSubtotal,
  laborSharePct,
  surfaceCondition = "fresh",
  touchupReductionPct = 15,
  wastagePct = 5,
  scaffoldingEnabled = false,
  scaffoldingSurchargePct = 10,
  discountValue = 0,
  discountType = "percent",
  gstPct = 18,
}) {
  // Step 1
  const { material: matBase, labour: labBase } = splitLineItems(grossSubtotal, laborSharePct);

  // Step 2 — material only, labour untouched
  const matAfterCondition = getSurfaceConditionAdjustment(matBase, surfaceCondition, touchupReductionPct);

  // Step 3 — material only
  const matFinal = applyMaterialWastage(matAfterCondition, wastagePct);
  const wastageAmt = matFinal - matAfterCondition;

  // Step 4 — labour only
  const labFinal = applyScaffoldingSurcharge(labBase, scaffoldingEnabled, scaffoldingSurchargePct);
  const scaffoldingAmt = labFinal - labBase;

  // Step 5 — combined
  const sub = matFinal + labFinal;
  const { discountAmt, afterDiscount } = applyDiscount(sub, discountValue, discountType);

  // Step 6
  const gstOn = afterDiscount;
  const { gstAmt, total } = applyGST(gstOn, gstPct);

  return {
    matBase, labBase,
    matAfterCondition,
    matFinal, labFinal,
    wastageAmt, scaffoldingAmt,
    sub, discountAmt, afterDiscount,
    gstOn, gstAmt, total,
  };
}
