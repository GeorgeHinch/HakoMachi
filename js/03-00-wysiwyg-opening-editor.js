/* =====================================================================
   WYSIWYG OPENING EDITOR
   Lets the user click-place, drag, and erase windows and doors on each
   wall face. Openings are stored in CONFIG.manualOpenings and override
   the algorithmic placement in generateFrontBackWall / generateSideWall.
   ===================================================================== */

let oeWall = 'front';
// When non-null, the editor is scoped to a wing's manualOpenings (the wing
// at CONFIG.wings[oeWingIndex]) — its wall is the canvas, and oeApply
// writes back to that wing's own manual* fields rather than the main
// building's. null = main-building editing (the default mode).
let oeWingIndex = null;
let oeWingCfg   = null;   // cached buildWingCfg result for the active wing
let oeWingPlan  = null;   // cached buildEdgePlans result for the active wing
let oeEditorOpen = false;  // pause Three.js render loop while the opening editor is visible
let oeExtraTop   = 0;   // SVG px above the eave level (for slant / gable peaks)
let oeWallEffH   = 0;   // effective wall height (may exceed plan.H for high-eave walls)
let oeWallLeftPx = 0;   // extra SVG px to the left of the main wall (coplanar wing extensions)
let oeTool = 'window';
let oeSnapGrid = 1;             // legacy toolbox value; 0 = no snapping
// Placement grid for the opening editor. Objects can snap either by their
// top-left corner or by their centre/anchor point. X/Y spacing and origins
// are controlled from the canvas top properties bar.
let oeGrid = {
  enabled: true,
  xStep: 1,
  yStep: 1,
  xOrigin: 0,
  yOrigin: 0,
  anchor: 'center',             // 'center' or 'bottomLeft'
};
let oeShowExposureZones = true;   // visibility toggle for segmented exposure overlays
let oeZoom = 1.0;               // zoom multiplier for the opening editor canvas
// Pan state — space-held + left drag, or middle-mouse drag, scrolls the
// canvas container. Document-level mousemove/mouseup listeners are
// attached during a pan and removed when it ends.
let oePanning     = false;
let oePanStartPx  = null;       // {x, y} = client coords at mousedown
let oePanStartScroll = null;    // {l, t} = container.scrollLeft / scrollTop at mousedown
let oeSpaceDown   = false;
let oeCustomSizes = {};         // { styleKey: { w, h } } — per-style size overrides
let oeToolboxSearch = '';       // live filter for the opening-editor object toolbox
let oeMobilePanMode = false;      // iPad/touch fallback for canvas panning without a keyboard
let oeLastPointerType = 'mouse';    // last pointer kind: mouse | pen | touch
