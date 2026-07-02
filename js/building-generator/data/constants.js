/* =====================================================================
   CONSTANTS & DEFAULTS
   ===================================================================== */

export const PT_PER_MM = 1 / 0.3528;  // ≈ 2.8346  (1pt = 0.3528mm)

// Color palette for SVG output
export const SVG_OPERATION_ENGRAVE = 'engrave';
export const SVG_OPERATION_CUT_RETAINED = 'cut-retained';
export const SVG_OPERATION_CUT_SCRAP = 'cut-scrap';

export const COLOR_CUT = '#ff0000';
export const COLOR_ETCH = '#0000ff';
// Disposable cutouts / drop-out pieces. These are through-cuts whose inside
// material is fully discarded and does not need laser hold-in tabs.
export const COLOR_DISCARD_CUT = '#008000';
