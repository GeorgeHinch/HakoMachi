'use strict';

/* =====================================================================
   PART GENERATORS
   These return objects: { id, name, material, widthMm, heightMm, paths: [{type, d}], rects: [...], lines: [...] }
   ===================================================================== */

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
