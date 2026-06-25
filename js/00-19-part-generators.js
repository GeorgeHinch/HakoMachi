'use strict';

/* =====================================================================
   PART GENERATORS
   These return objects: { id, name, material, widthMm, heightMm, paths: [{type, d}], rects: [...], lines: [...] }
   ===================================================================== */

/* Legacy fixture-hole entry point used by the wall generators. The canonical
 * implementation lives in js/00-35-fixture-parts-generator.js as
 * addFixtureThroughHolesToWall(). Keep this thin compatibility wrapper until
 * the segmented wall generator call sites are renamed in place.
 */
function cutFixtureHolesInCore(rects, paths, cfg, face, xMirror) {
  if (typeof addFixtureThroughHolesToWall !== 'function') {
    throw new Error('addFixtureThroughHolesToWall is not loaded');
  }
  return addFixtureThroughHolesToWall(rects, paths, cfg, face, xMirror);
}

/* Compute window grid for a wall. Returns array of {x, y, width, height, isGround} in WALL local frame.
   
   Windows are placed at CANONICAL floor center Y positions, identical across all 
   walls so they align horizontally. A window at any floor center Y is rejected only 
   if it intersects a wall-specific obstacle (bay opening, door reserve zone, slot 
   cut). Column X positions are computed per-wall (different walls have different 
   widths) but consistent within one wall so windows stack vertically.
   
   Ground-floor override: if groundWinDims is provided AND groundFloorCenterY 
   matches one of the floorCenterYs, that floor's windows use groundWinDims instead 
   of winDims. Each window in the result has isGround=true if it sits on the ground 
   floor (lets callers tag them for the correct window-parts file). */
