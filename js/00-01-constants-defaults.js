'use strict';

/* =====================================================================
   CONSTANTS & DEFAULTS
   ===================================================================== */

const PT_PER_MM = 1 / 0.3528;  // ≈ 2.8346  (1pt = 0.3528mm)

// Color palette for SVG output
const COLOR_CUT = '#FF0000';
const COLOR_ETCH = '#0000FF';
// Disposable cutouts / drop-out pieces. These are through-cuts whose inside
// material is fully discarded and does not need laser hold-in tabs.
const COLOR_DISCARD_CUT = '#00A651';
