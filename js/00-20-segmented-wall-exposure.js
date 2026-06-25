'use strict';

/* =====================================================================
   SEGMENTED WALL EXPOSURE
   Replaces the older idea of a whole-wall / partial-height exposure with
   true zones along both wall length (T) and vertical floors.
   ===================================================================== */

const WALL_EXPOSURE_TYPES = {
  partyWall:    { claddingMode: 'none',        allowWindows: false, allowDoors: false, allowFixtures: false, allowSigns: false },
  exposedSide:  { claddingMode: 'plain',       allowWindows: true,  allowDoors: false, allowFixtures: true,  allowSigns: false },
  rearService:  { claddingMode: 'plain',       allowWindows: true,  allowDoors: true,  allowFixtures: true,  allowSigns: false },
  alley:        { claddingMode: 'detailed',    allowWindows: true,  allowDoors: true,  allowFixtures: true,  allowSigns: true  },
  serviceGap:   { claddingMode: 'plain',       allowWindows: false, allowDoors: false, allowFixtures: true,  allowSigns: false },
  sideStreet:   { claddingMode: 'detailed',    allowWindows: true,  allowDoors: true,  allowFixtures: true,  allowSigns: true  },
  mainStreet:   { claddingMode: 'fullFacade',  allowWindows: true,  allowDoors: true,  allowFixtures: true,  allowSigns: true  },
};

function defaultExposureForEdge(edgeId) {
  if (edgeId === 'front') return 'mainStreet';
  if (edgeId === 'back') return 'rearService';
  return 'exposedSide';
}

function exposureDefaults(exposure, edgeId) {
  return WALL_EXPOSURE_TYPES[exposure] || WALL_EXPOSURE_TYPES[defaultExposureForEdge(edgeId)] || WALL_EXPOSURE_TYPES.exposedSide;
}

function normalizeWallExposureZone(raw, fallbackEdge = 'front', floorCount = 1) {
  if (!raw || typeof raw !== 'object') return null;
  const edgeId = ['front','back','east','west'].includes(raw.edgeId || raw.edge || raw.face)
    ? (raw.edgeId || raw.edge || raw.face)
    : fallbackEdge;
  const exposure = WALL_EXPOSURE_TYPES[raw.exposure] ? raw.exposure : defaultExposureForEdge(edgeId);
  const defs = exposureDefaults(exposure, edgeId);

  let fromT = Number(raw.fromT);
  let toT = Number(raw.toT);
  if (!Number.isFinite(fromT)) fromT = 0;
  if (!Number.isFinite(toT)) toT = 1;
  fromT = Math.max(0, Math.min(1, fromT));
  toT = Math.max(0, Math.min(1, toT));
  if (toT < fromT) [fromT, toT] = [toT, fromT];
  if (toT - fromT < 0.0005) return null;

  let fromFloor = Number(raw.fromFloor);
  let toFloor = Number(raw.toFloor);
  if (!Number.isFinite(fromFloor)) fromFloor = 0;
  if (!Number.isFinite(toFloor)) toFloor = Math.max(1, floorCount || 1);
  fromFloor = Math.max(0, Math.floor(fromFloor));
  toFloor = Math.max(fromFloor + 1, Math.floor(toFloor));

  return {
    edgeId,
    fromT,
    toT,
    fromFloor,
    toFloor,
    exposure,
    claddingMode: raw.claddingMode || defs.claddingMode,
    allowWindows: raw.allowWindows != null ? !!raw.allowWindows : !!defs.allowWindows,
    allowDoors: raw.allowDoors != null ? !!raw.allowDoors : !!defs.allowDoors,
    allowFixtures: raw.allowFixtures != null ? !!raw.allowFixtures : !!defs.allowFixtures,
    allowSigns: raw.allowSigns != null ? !!raw.allowSigns : !!defs.allowSigns,
  };
}

function normalizeSegmentedWallExposureZones(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  const floorCount = Math.max(1, Number(cfg.floorCount || cfg.floors || 1));

  // Current canonical key.
  let zones = Array.isArray(cfg.wallExposureZones) ? cfg.wallExposureZones.slice() : [];

  // Legacy/experimental aliases accepted from Site Planner seeds.
  if (!zones.length && Array.isArray(cfg.wallExposure)) zones = cfg.wallExposure.slice();
  if (!zones.length && Array.isArray(cfg.partialHeightExposureZones)) zones = cfg.partialHeightExposureZones.slice();
  if (!zones.length && cfg.wallExposure && typeof cfg.wallExposure === 'object' && !Array.isArray(cfg.wallExposure)) {
    for (const [edgeId, val] of Object.entries(cfg.wallExposure)) {
      if (Array.isArray(val)) {
        for (const z of val) zones.push({ edgeId, ...z });
      } else if (val && typeof val === 'object') {
        zones.push({ edgeId, ...val });
      } else if (typeof val === 'string') {
        zones.push({ edgeId, exposure: val, fromT: 0, toT: 1, fromFloor: 0, toFloor: floorCount });
      }
    }
  }

  const normalized = [];
  for (const raw of zones) {
    const z = normalizeWallExposureZone(raw, raw && (raw.edgeId || raw.edge || raw.face), floorCount);
    if (z) normalized.push(z);
  }

  // Keep only explicit zones; default exposure is computed at query time.
  cfg.wallExposureZones = normalized;
  delete cfg.partialHeightExposureZones;
  return cfg;
}

function floorIndexAtWallY(plan, y) {
  if (!plan) return 0;
  const H = Number(plan.H) || 1;
  const distFromGround = Math.max(0, Math.min(H, H - y));
  const firstH = Math.max(1, Number(plan.firstFloorHeight || plan.floorHeight || H));
  const upperH = Math.max(1, Number(plan.floorHeight || firstH));
  if (distFromGround <= firstH + 0.001) return 0;
  return 1 + Math.floor((distFromGround - firstH) / upperH);
}

function yRangeForFloorSpan(plan, fromFloor, toFloor) {
  const H = Number(plan && plan.H) || 1;
  const floors = Math.max(1, Number(plan && plan.floors) || Number(CONFIG && CONFIG.floorCount) || 1);
  const firstH = Math.max(1, Number(plan && (plan.firstFloorHeight || plan.floorHeight)) || (H / floors));
  const upperH = Math.max(1, Number(plan && plan.floorHeight) || firstH);
  const f0 = Math.max(0, Math.min(floors, Number(fromFloor) || 0));
  const f1 = Math.max(f0, Math.min(floors, Number(toFloor) || floors));
  function floorBottomDistance(f) {
    if (f <= 0) return 0;
    return firstH + Math.max(0, f - 1) * upperH;
  }
  const d0 = floorBottomDistance(f0);
  const d1 = floorBottomDistance(f1);
  return {
    yTop: Math.max(0, H - d1),
    yBottom: Math.min(H, H - d0),
  };
}

function wallExposureAt(cfg, plan, edgeId, t, floorIndex) {
  const exposure = defaultExposureForEdge(edgeId);
  const base = { edgeId, fromT: 0, toT: 1, fromFloor: 0, toFloor: Math.max(1, Number(cfg && cfg.floorCount) || 1), exposure,
    ...exposureDefaults(exposure, edgeId) };
  const zones = (cfg && Array.isArray(cfg.wallExposureZones)) ? cfg.wallExposureZones : [];
  let found = base;
  for (const raw of zones) {
    const z = normalizeWallExposureZone(raw, edgeId, Math.max(1, Number(cfg && cfg.floorCount) || 1));
    if (!z || z.edgeId !== edgeId) continue;
    if (t < z.fromT - 1e-6 || t > z.toT + 1e-6) continue;
    if (floorIndex < z.fromFloor || floorIndex >= z.toFloor) continue;
    found = z; // later zones override earlier zones
  }
  return found;
}

function wallExposureAllowsRect(cfg, plan, edgeId, x, y, w, h, kind, wallW, wallH) {
  if (!cfg || !Array.isArray(cfg.wallExposureZones) || !cfg.wallExposureZones.length) return true;
  const prop = kind === 'window' ? 'allowWindows'
            : kind === 'door' ? 'allowDoors'
            : kind === 'fixture' ? 'allowFixtures'
            : kind === 'sign' ? 'allowSigns'
            : null;
  if (!prop) return true;
  const samples = [
    [x + w * 0.5, y + h * 0.5],
    [x + w * 0.15, y + h * 0.5],
    [x + w * 0.85, y + h * 0.5],
  ];
  for (const [sx, sy] of samples) {
    const t = Math.max(0, Math.min(1, sx / Math.max(0.001, wallW || 1)));
    const fl = floorIndexAtWallY(plan, sy);
    const z = wallExposureAt(cfg, plan, edgeId, t, fl);
    if (z && z[prop] === false) return false;
  }
  return true;
}

function filterWallExposureRects(items, cfg, plan, edgeId, kind, wallW, wallH, xKey = 'x', yKey = 'y', wKey = 'width', hKey = 'height') {
  if (!Array.isArray(items) || !items.length) return items;
  return items.filter(it => wallExposureAllowsRect(cfg, plan, edgeId,
    Number(it[xKey]) || 0, Number(it[yKey]) || 0,
    Number(it[wKey]) || 0, Number(it[hKey]) || 0,
    kind, wallW, wallH));
}

function wallExposureNoCladdingWallRects(cfg, plan, edgeId, wallW, wallH) {
  if (!cfg || !Array.isArray(cfg.wallExposureZones) || !cfg.wallExposureZones.length) return [];
  const out = [];
  for (const raw of cfg.wallExposureZones) {
    const z = normalizeWallExposureZone(raw, edgeId, Math.max(1, Number(cfg.floorCount) || 1));
    if (!z || z.edgeId !== edgeId) continue;
    if (!(z.exposure === 'partyWall' || z.claddingMode === 'none' || z.claddingMode === 'structuralOnly')) continue;
    const yr = yRangeForFloorSpan(plan, z.fromFloor, z.toFloor);
    const x0 = z.fromT * wallW;
    const x1 = z.toT * wallW;
    const y0 = yr.yTop;
    const y1 = yr.yBottom;
    if (x1 > x0 + 0.01 && y1 > y0 + 0.01) {
      out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, exposure: z.exposure, claddingMode: z.claddingMode });
    }
  }
  return out;
}

function computeSegmentedExposureFromNeighbors(current, neighbors = [], opts = {}) {
  // Utility for Site Planner / seeds: derive wallExposureZones from rectangles.
  // Coordinates are model/site-plan units in the current building's local frame:
  // current = {x,y,w,d,floors}
  // neighbor = {x,y,w,d,floors, gapType?}
  // This intentionally returns zones only; HakoMachi still makes the building
  // structurally independent and valid.
  const zones = [];
  if (!current) return zones;
  const eps = opts.touchEpsilon != null ? Number(opts.touchEpsilon) : 0.25;
  const alleyMax = opts.alleyMaxGap != null ? Number(opts.alleyMaxGap) : 6;
  const serviceGapMax = opts.serviceGapMaxGap != null ? Number(opts.serviceGapMaxGap) : 2;
  const curFloors = Math.max(1, Number(current.floors || current.floorCount || 1));
  function add(edgeId, a0, a1, len, nFloors, exposure, gap = 0) {
    const fromT = Math.max(0, Math.min(1, a0 / Math.max(0.001, len)));
    const toT = Math.max(0, Math.min(1, a1 / Math.max(0.001, len)));
    if (toT <= fromT + 0.001) return;
    const nf = Math.max(1, Math.min(curFloors, Math.round(Number(nFloors) || curFloors)));
    zones.push(normalizeWallExposureZone({ edgeId, fromT, toT, fromFloor: 0, toFloor: nf, exposure }, edgeId, curFloors));
    if (nf < curFloors) zones.push(normalizeWallExposureZone({ edgeId, fromT, toT, fromFloor: nf, toFloor: curFloors, exposure: 'exposedSide' }, edgeId, curFloors));
  }
  for (const n of neighbors || []) {
    const nf = Math.max(1, Number(n.floors || n.floorCount || 1));
    // west/east side contacts: overlap along depth axis
    const y0 = Math.max(current.y, n.y), y1 = Math.min(current.y + current.d, n.y + n.d);
    if (y1 > y0) {
      const westGap = Math.abs((current.x) - (n.x + n.w));
      const eastGap = Math.abs((current.x + current.w) - n.x);
      const exposureForGap = g => g <= eps ? 'partyWall' : (g <= serviceGapMax ? 'serviceGap' : (g <= alleyMax ? 'alley' : 'exposedSide'));
      if (westGap <= alleyMax) add('west', y0 - current.y, y1 - current.y, current.d, nf, exposureForGap(westGap), westGap);
      if (eastGap <= alleyMax) add('east', y0 - current.y, y1 - current.y, current.d, nf, exposureForGap(eastGap), eastGap);
    }
    // front/back contacts: overlap along width axis
    const x0 = Math.max(current.x, n.x), x1 = Math.min(current.x + current.w, n.x + n.w);
    if (x1 > x0) {
      const frontGap = Math.abs((current.y) - (n.y + n.d));
      const backGap = Math.abs((current.y + current.d) - n.y);
      const exposureForGap = g => g <= eps ? 'partyWall' : (g <= serviceGapMax ? 'serviceGap' : (g <= alleyMax ? 'alley' : 'exposedSide'));
      if (frontGap <= alleyMax) add('front', x0 - current.x, x1 - current.x, current.w, nf, exposureForGap(frontGap), frontGap);
      if (backGap <= alleyMax) add('back', x0 - current.x, x1 - current.x, current.w, nf, exposureForGap(backGap), backGap);
    }
  }
  return zones;
}

function computeWindows(wallW, wallH, opts) {
  const { density, hasOpening, openingH, slotYs, floorCenterYs, doorReserveH, winDims, groundWinDims, groundFloorCenterY, matT } = opts;
  if (density === 'none') return [];
  if (!floorCenterYs || floorCenterYs.length === 0) return [];

  // Wall-specific forbidden Y zones — windows whose bbox overlaps these are rejected.
  const slotPad = 3;
  const forbidden = [];
  for (const sy of (slotYs || [])) {
    forbidden.push([sy - slotPad, sy + matT + slotPad]);
  }
  if (hasOpening) {
    forbidden.push([wallH - openingH - 3, wallH]);
  }
  if (doorReserveH != null && doorReserveH > 0) {
    forbidden.push([wallH - doorReserveH - 3, wallH]);
  }
  // Wall edges
  forbidden.push([-Infinity, 4]);
  forbidden.push([wallH - 4, Infinity]);

  // ---- Column X positions (based on the regular winDims, since most floors use it) ----
  // For the ground floor (when override is on), we re-compute columns inside the 
  // loop using groundWinDims.
  // Edge clearance: keep window columns away from the structural joint at each wall end.
  const edgeMargin = opts.edgeMargin != null ? opts.edgeMargin : 4;

  function computeColumnsFor(win) {
    let cols;
    if (density === 'sparse') {
      cols = Math.max(1, Math.floor(wallW / Math.max(20, win.w * 3)));
    } else if (density === 'medium') {
      cols = Math.max(1, Math.floor(wallW / Math.max(15, win.w * 2)));
    } else { // dense
      cols = Math.max(1, Math.floor(wallW / Math.max(12, win.w * 1.5)));
    }
    const colSpacing = wallW / (cols + 1);
    const colXs = [];
    for (let c = 0; c < cols; c++) {
      const cx = (c + 1) * colSpacing;
      const x = cx - win.w / 2;
      if (x < edgeMargin || x + win.w > wallW - edgeMargin) continue;
      colXs.push(x);
    }
    return colXs;
  }
  const upperColXs = computeColumnsFor(winDims);
  const groundColXs = (groundWinDims && groundWinDims !== winDims)
    ? computeColumnsFor(groundWinDims)
    : upperColXs;
  if (upperColXs.length === 0 && groundColXs.length === 0) return [];

  // ---- Place windows at each canonical floor center Y on this wall ----
  const windows = [];
  for (const cy of floorCenterYs) {
    const isGround = (groundFloorCenterY != null) && Math.abs(cy - groundFloorCenterY) < 0.1;
    const win = (isGround && groundWinDims) ? groundWinDims : winDims;
    const colXs = (isGround && groundWinDims) ? groundColXs : upperColXs;
    if (colXs.length === 0) continue;
    const y = cy - win.h / 2;
    // Reject if window bbox overlaps any forbidden zone
    let blocked = false;
    for (const [zStart, zEnd] of forbidden) {
      if (y < zEnd && y + win.h > zStart) { blocked = true; break; }
    }
    if (blocked) continue;
    for (const x of colXs) {
      windows.push({ x, y, width: win.w, height: win.h, isGround: isGround });
    }
  }
  if (opts && opts.cfg && opts.plan && opts.edgeId) {
    return filterWallExposureRects(windows, opts.cfg, opts.plan, opts.edgeId, 'window', wallW, wallH);
  }
  return windows;
}

/* Compute door positions for a wall.
   Returns array of {x, y, width, height, style} in WALL local frame.
   Doors sit at the BOTTOM of the wall (resting on the floor). */
function computeDoors(wallW, wallH, opts) {
  const { doorStyle, doorCount, hasOpening, bayXStart, bayXEnd } = opts;
  if (!doorStyle || doorStyle === 'none' || !doorCount || doorCount <= 0) return [];
  const door = DOOR_STYLES[doorStyle];
  if (!door) return [];

  // Door anchored at floor: y = wallH - door.height
  const doorY = wallH - door.height;
  
  // If door is taller than wall - 5mm, skip
  if (door.height > wallH - 5) return [];

  // Compute available horizontal regions (avoiding bay opening if any)
  // Add 5mm margin from any opening
  const regions = [];
  if (hasOpening) {
    if (bayXStart > 5) regions.push({ start: 3, end: bayXStart - 3 });
    if (bayXEnd < wallW - 5) regions.push({ start: bayXEnd + 3, end: wallW - 3 });
  } else {
    regions.push({ start: 3, end: wallW - 3 });
  }
  // Filter regions that can fit at least one door + margin
  const usableRegions = regions.filter(r => (r.end - r.start) >= door.width + 4);
  if (usableRegions.length === 0) return [];

  // Distribute doorCount doors across regions (proportional to region length)
  const totalUsable = usableRegions.reduce((s, r) => s + (r.end - r.start), 0);
  const doors = [];
  let remaining = doorCount;
  for (const r of usableRegions) {
    if (remaining <= 0) break;
    const len = r.end - r.start;
    const cap = Math.max(1, Math.floor(len / (door.width + 6)));
    const fraction = len / totalUsable;
    const nForRegion = Math.min(cap, remaining, Math.max(1, Math.round(doorCount * fraction)));
    // Distribute nForRegion doors evenly within this region
    const totalDoorWidth = nForRegion * door.width;
    const totalGap = len - totalDoorWidth;
    const gap = totalGap / (nForRegion + 1);
    for (let i = 0; i < nForRegion; i++) {
      const x = r.start + gap + i * (door.width + gap);
      doors.push({ x, y: doorY, width: door.width, height: door.height, style: doorStyle });
    }
    remaining -= nForRegion;
  }
  if (opts && opts.cfg && opts.plan && opts.edgeId) {
    return filterWallExposureRects(doors, opts.cfg, opts.plan, opts.edgeId, 'door', wallW, wallH);
  }
  return doors;
}

/* Build the basic edge feature plan for the building, used by all wall generators */
function buildEdgePlans(cfg) {
  const { width, depth, coreThickness: matT, tongueWidth: tw,
          roofStyle } = cfg;
  // Only roof styles that actually build a parapet should reserve parapet
  // height in the wall plan. Flat/overhang/slanted/gabled roofs may retain a
  // stale parapetHeight value in CONFIG, but it must not consume wall height or
  // draw a parapet band in the wall editor.
  const parapetHeight = (roofStyle === 'parapet' || roofStyle === 'parapet_gable')
    ? Math.max(0, Number(cfg.parapetHeight) || 0)
    : 0;

  // Canonical cfg.height is total building height including parapet. The wall
  // generators still need the body/wall height below the parapet, so derive it
  // here in exactly one place.
  const H = wallBodyHeightFromConfig(cfg);

  // The bay opening, ground level, and first floor are all the SAME floor of the 
  // building (the lowest visible level from the outside). When the first-floor 
  // height override is enabled, it drives both the bay height (if bay exists) 
  // and the ground-band height (if no bay) — they're the same thing.
  const ffhEnabled = !!cfg.firstFloorHeightEnabled;
  const fheightCfg = (cfg.floorHeight && cfg.floorHeight > 0) ? cfg.floorHeight : 30;
  const ffh = (cfg.firstFloorHeight && cfg.firstFloorHeight > 0) ? cfg.firstFloorHeight : fheightCfg;
  // First-floor height — determines where the inter-floor panel between floors 1 and 2 sits.
  // Reads firstFloorHeight when that override is on; otherwise uses the standard floor height.
  // The bay opening height is a SEPARATE value and must not influence this.
  const firstBandH = ffhEnabled ? ffh : fheightCfg;

  const sideLen = depth - 2 * matT;
  const fbWidth = width;

  // Resolve bay from manual openings (the only source — bay placement is
  // owned entirely by the opening editor).
  const bayResolved = resolveBay(cfg, fbWidth);
  const hasFrontBay = bayResolved.hasFrontBay;
  const hasBackBay  = bayResolved.hasBackBay;
  const bayXStart   = bayResolved.bayXStart;
  const bayXEnd     = bayResolved.bayXEnd;
  const frontBayXStart = bayResolved.frontBayXStart;
  const frontBayXEnd   = bayResolved.frontBayXEnd;
  const backBayXStart  = bayResolved.backBayXStart;
  const backBayXEnd    = bayResolved.backBayXEnd;
  const resolvedBayWidth = bayResolved.bayWidth;

  const includeFloorPanels = !!cfg.floorPanels;
  const fcount  = (cfg.floorCount && cfg.floorCount > 0) ? cfg.floorCount : 1;
  const fheight = fheightCfg;
  const hasSecondFloor = fcount >= 2;

  // ── Inter-floor panels ──────────────────────────────────────────────────────
  // Placed from floor count/height. The first (lowest) panel sits at
  // H − firstBandH from the top; subsequent panels step upward by fheight.
  // When a bay exists, this first panel can act as the bay ceiling /
  // first-to-second-floor separator — but ONLY if the building actually has a
  // second floor. Single-floor bay buildings should not get an automatic
  // hidden inter-floor panel or the matching wall/floor slots.
  const interFloorYs = [];
  if ((hasFrontBay || hasBackBay) && hasSecondFloor) {
    interFloorYs.push(H - firstBandH);
  }
  // Additional inter-floor panels above (only when the setting is on and fcount >= 2).
  // Deduplicated so the bay ceiling Y is never double-added.
  if (includeFloorPanels && hasSecondFloor) {
    const lowest     = H - firstBandH;
    const upperBound = parapetHeight > 0 ? (parapetHeight + matT + 3) : 0;
    let y = lowest, safety = 20;
    while (y > upperBound && safety-- > 0) {
      if (!interFloorYs.some(iy => Math.abs(iy - y) < 0.1)) interFloorYs.push(y);
      y -= fheight;
    }
  }

  // Bay opening height — independent from the floor panel position.
  // Defaults to firstBandH if unset so it fills the first floor by default.
  let bayHeight = (bayResolved.bayHeight && bayResolved.bayHeight > 0)
    ? bayResolved.bayHeight
    : firstBandH;
  if (hasFrontBay || hasBackBay) {
    if (interFloorYs.length > 0) {
      const lowestPanelFromGround = H - Math.max(...interFloorYs); // = firstBandH
      bayHeight = Math.min(bayHeight, lowestPanelFromGround - matT);
    } else {
      bayHeight = Math.min(bayHeight, H - matT);
    }
    bayHeight = Math.max(bayHeight, 5);
  }

  // Top of the bay opening in wall coords (y=0 at top, y=H at ground)
  const bayCeilingY = H - bayHeight;

  // Slot-avoidance Ys for window placement — real panel positions only
  const slotYs = [...interFloorYs];

  // VISUAL floor boundaries — used to align windows to floor levels even when 
  // no physical inter-floor slots are cut. Always includes real slot Ys, plus 
  // implicit floor boundaries derived from floor counts.
  const visualFloorYs = [...slotYs];
  // Use the fixed first-floor panel position as the base for visual floor bands —
  // NOT bayCeilingY (the opening top), which moves when the user adjusts bay height
  // and would incorrectly add/remove window rows.
  const baseY = ((hasFrontBay || hasBackBay) && hasSecondFloor) ? (H - firstBandH) : H;
  const visTopBound = parapetHeight > 0 ? (parapetHeight + matT + 3) : 0;
  let vy = baseY - fheight;
  let safety = 30;
  while (vy > visTopBound && safety-- > 0) {
    if (!visualFloorYs.some(s => Math.abs(s - vy) < 1)) {
      visualFloorYs.push(vy);
    }
    vy -= fheight;
  }
  visualFloorYs.sort((a, b) => a - b);

  // Compute CANONICAL floor center Ys — one per visible floor band of the building.
  // These are the Y positions where windows sit on each floor, identical across 
  // all walls so windows align horizontally regardless of which wall they're on.
  // Windows are biased slightly above center (head-height look — 55% from band top).
  // The top band runs from the parapet bottom to the first boundary;
  // the bottom band from the last boundary to the floor (or bay ceiling).
  const allBoundaries = [
    (parapetHeight > 0 ? (parapetHeight + matT + 3) : 0), // top of usable wall
    ...visualFloorYs,
    baseY,                      // bottom of usable wall (bay ceiling or floor)
  ].sort((a, b) => a - b);
  // Dedupe
  const dedupBoundaries = [];
  for (const b of allBoundaries) {
    if (dedupBoundaries.length === 0 || Math.abs(dedupBoundaries[dedupBoundaries.length - 1] - b) >= 0.5) {
      dedupBoundaries.push(b);
    }
  }
  const floorCenterYs = [];
  for (let i = 0; i < dedupBoundaries.length - 1; i++) {
    const yT = dedupBoundaries[i];
    const yB = dedupBoundaries[i + 1];
    const bandH = yB - yT;
    if (bandH < 8) continue;  // band too short to fit a window with margins
    const cy = yT + bandH * 0.55;  // 55% from top
    floorCenterYs.push(cy);
  }

  // The "ground floor" center Y — the LOWEST band that contains a window 
  // AND represents the first floor of the building. When the first-floor-window-style 
  // override is enabled, this is the Y where the alternate window dims apply.
  // 
  // Per the user's design: the bay level, ground level, and first floor are all 
  // the SAME floor. So when a bay exists, the bay IS the first floor (no window) 
  // and the lowest center Y in floorCenterYs is actually FLOOR 2 (regular style).
  // groundFloorCenterY only gets set when there's no bay.
  const hasBayAnywhere = hasFrontBay || hasBackBay;
  const groundFloorCenterY = (!hasBayAnywhere && floorCenterYs.length > 0)
    ? floorCenterYs[floorCenterYs.length - 1]
    : null;

  // Last-wall side: the wall installed last in assembly, which has NO slots for 
  // inter-floor tongues (the panel's open edge rests against this wall's inner face).
  const lastWallSide = cfg.lastWallSide || 'back';

  // Ground-floor depth offset (front-face extension or recess at ground level)
  const gfoEnabled = !!cfg.groundFloorOffsetEnabled;
  const gfoAmount = (gfoEnabled && cfg.groundFloorOffsetAmount != null) ? Number(cfg.groundFloorOffsetAmount) : 0;
  const groundFloorOffset = gfoAmount;  // signed; +ve = extends forward, -ve = recessed

  // ---- Rooftop mechanical room ----
  // Sits on the roof at a user-configurable position. Computes the rectangle 
  // (in roof-local coords, where 0,0 is the roof's top-left corner = building's 
  // northwest corner from above) where the mech room sits.
  let mechRoom = null;
  if (cfg.rooftopMechRoom) {
    const mw = Math.max(5, cfg.rooftopMechRoomWidth || 25);
    const md = Math.max(5, cfg.rooftopMechRoomDepth || 20);
    const mh = Math.max(5, cfg.rooftopMechRoomHeight || 18);
    // Roof footprint (matches the parapet-recessed roof or flat roof): 
    // For parapet, roof is inset by matT from the building outer edge on each side 
    // (footprint = width-2*matT × depth-2*matT). For flat, roof = full footprint.
    // We always work in roof-piece local coords here.
    const roofW = (roofStyle === 'parapet') ? width - 2 * matT : width;
    const roofD = (roofStyle === 'parapet') ? depth - 2 * matT : depth;
    // Center of roof in its own frame
    const cx = roofW / 2;
    const cy = roofD / 2;
    // User offsets shift the mech room from center; clamp to keep it on the roof 
    // with a 3mm edge margin.
    const xOff = (cfg.rooftopMechRoomXOffset || 0);
    const yOff = (cfg.rooftopMechRoomYOffset || 0);
    let mx = cx + xOff - mw / 2;
    let my = cy + yOff - md / 2;
    // Clamp
    const edge = 3;
    if (mx < edge) mx = edge;
    if (mx + mw > roofW - edge) mx = roofW - edge - mw;
    if (my < edge) my = edge;
    if (my + md > roofD - edge) my = roofD - edge - md;
    if (mw < roofW - 2 * edge && md < roofD - 2 * edge) {
      mechRoom = { x: mx, y: my, w: mw, d: md, h: mh, roofW, roofD };
    }
  }
  // ---- Rooftop equipment placement ----
  // Placements come from cfg.rooftopItems (entries placed by the user in the
  // rooftop editor — each carries x/y in roof-local coords, an equipKey
  // identifying its ROOFTOP_EQUIPMENT entry, and its dimensions). The legacy
  // cfg.rooftopEquipment count map is honoured as a fallback so existing
  // presets that ship with counts (rather than item placements) still produce
  // a populated roof on first build — we auto-place via the original greedy
  // scan, then write the result into cfg.rooftopItems so subsequent edits in
  // the editor have something to start from.
  const rooftopEquipPlacements = [];
  const manualEquipItems = (cfg.rooftopItems || []).filter(it =>
    it && it.type === 'equipment' && it.equipKey && ROOFTOP_EQUIPMENT[it.equipKey]
  );
  if (manualEquipItems.length > 0) {
    const instanceCounts = {};
    for (const it of manualEquipItems) {
      const eq = ROOFTOP_EQUIPMENT[it.equipKey];
      instanceCounts[it.equipKey] = (instanceCounts[it.equipKey] || 0) + 1;
      rooftopEquipPlacements.push({
        key: it.equipKey, eq,
        x: it.x, y: it.y,
        w: eq.w, d: eq.d,
        instance: instanceCounts[it.equipKey],
      });
    }
  } else {
    // Legacy fallback: auto-place from cfg.rooftopEquipment counts.
    const equipReq = cfg.rooftopEquipment || {};
    const totalEquipReq = Object.values(equipReq).reduce((s, n) => s + (Number(n) || 0), 0);
    if (totalEquipReq > 0) {
      const roofW = (roofStyle === 'parapet') ? width - 2 * matT : width;
      const roofD = (roofStyle === 'parapet') ? depth - 2 * matT : depth;
      const edgeMargin = 3;
      const items = [];
      for (const [key, qty] of Object.entries(equipReq)) {
        const n = Number(qty) || 0;
        if (n <= 0) continue;
        const eq = ROOFTOP_EQUIPMENT[key];
        if (!eq) continue;
        for (let i = 0; i < n; i++) {
          items.push({ key, eq, area: eq.w * eq.d, instance: i + 1 });
        }
      }
      items.sort((a, b) => b.area - a.area);
      const stepX = 1, stepY = 1;
      function fits(rx, ry, rw, rd) {
        if (rx < edgeMargin || ry < edgeMargin) return false;
        if (rx + rw > roofW - edgeMargin || ry + rd > roofD - edgeMargin) return false;
        if (mechRoom) {
          const mx0 = mechRoom.x - 2, my0 = mechRoom.y - 2;
          const mx1 = mechRoom.x + mechRoom.w + 2, my1 = mechRoom.y + mechRoom.d + 2;
          if (!(rx + rw <= mx0 || rx >= mx1 || ry + rd <= my0 || ry >= my1)) return false;
        }
        for (const p of rooftopEquipPlacements) {
          if (!(rx + rw + 2 <= p.x || rx >= p.x + p.w + 2 || ry + rd + 2 <= p.y || ry >= p.y + p.d + 2)) return false;
        }
        return true;
      }
      for (const item of items) {
        const rw = item.eq.w, rd = item.eq.d;
        let placed = false;
        for (let ry = edgeMargin; ry + rd <= roofD - edgeMargin && !placed; ry += stepY) {
          for (let rx = edgeMargin; rx + rw <= roofW - edgeMargin && !placed; rx += stepX) {
            if (fits(rx, ry, rw, rd)) {
              rooftopEquipPlacements.push({ key: item.key, eq: item.eq, x: rx, y: ry, w: rw, d: rd, instance: item.instance });
              placed = true;
            }
          }
        }
      }
    }
  }

  return {
    H, matT, tw,
    parapetH: parapetHeight,
    roofStyle,
    sideLen, fbWidth,
    bayXStart, bayXEnd, frontBayXStart, frontBayXEnd, backBayXStart, backBayXEnd, bayWidth: resolvedBayWidth, bayHeight,
    hasFrontBay, hasBackBay, bayIsThrough: bayResolved.bayIsThrough,
    bayCeilingY,
    interFloorYs,
    slotYs,
    visualFloorYs,
    floorCenterYs,
    groundFloorCenterY,
    floorHeight: fheight,
    firstFloorHeight: firstBandH,
    lastWallSide,
    groundFloorOffset,
    mechRoom,
    rooftopEquipPlacements,
  };
}

/* Generate side wall (E or W) */
/* Apply 'open' wing connection openings to a wall's rects array.
   Called from generateSideWall and generateFrontBackWall when cfg._wingOpenings is set. */
function applyWingOpenings(rects, cfg, wallKey, wallW, wallH) {
  const openings = ((cfg._wingOpenings || {})[wallKey] || []);
  for (const op of openings) {
    // East wall laser panel uses internal-view convention (north on the
    // right of the panel) to match the openings editor's east display via
    // `oeMirrorX`. Storage keeps x=0=NORTH; flip here at the cut layer so
    // the slot lands at the right physical end of the panel.
    let x0 = op.x0, x1 = op.x1;
    if (wallKey === 'east') {
      [x0, x1] = [wallW - x1, wallW - x0];
    }
    const x = Math.max(0, x0);
    const w = Math.min(wallW, x1) - x;
    const y = Math.max(0, op.y0);
    const h = Math.min(wallH, op.y1) - y;
    if (w > 0 && h > 0) {
      rects.push({ type: 'cut', x, y, w, h, compensateKerf: false });
    }
  }
}

function generateSideWall(cfg, plan, side) {
  const { H, matT, tw, parapetH, roofStyle, sideLen: rawSideLen,
          bayCeilingY, hasFrontBay, hasBackBay } = plan;

  // Normal blocks subtract front+back wall thickness from side walls because
  // side walls sit between those two wall panels. Wings omit the connection
  // face, so their side walls sit between the main wall slot and the far wing
  // wall: only the far wall thickness should be subtracted. Without this, a
  // wing side wall is one core thickness too short and the visible connection
  // tabs do not line up with the slots cut into the main back/front wall.
  const sideLen = rawSideLen + (cfg._omitConnectionWall ? matT : 0);

  // Side walls: tongues on left, right, bottom edges. Top is flat (parapet) when roofStyle=parapet.
  // For flat roof, top has tongues into roof.

  const margin = Math.max(matT * 2, 5);
  
  // Top edge: depending on roof style
  // For slanted: side walls have different heights at each end (front lower, back higher)
  // For gabled:  side walls have a triangular peak in the centre
  // Both: tongues point upward into the roof panel; for now treat like parapet slots (interior cuts).
  // flat_overhang uses the same wall-top tongue + roof-slot mechanism as flat;
  // the only difference is the roof core extends past the wall on every side
  // (the overhang). The slot positions in the roof are offset by O but the
  // tongue layout on the wall is identical, since both compute against the
  // same edge length.
  //
  // Slanted NS-axis: side walls have trapezoidal tops (different pitches at
  // each end). The tongues here are perpendicular to the slanted edge —
  // buildSlantedWallPath handles the slanted-top tongue rendering — and
  // key into a corresponding row of slots on the roof panel's verge edge.
  const _earlySideSlopeDir = cfg.roofSlopeDirection || 'back';
  const _earlySideSlantNs  = roofStyle === 'slanted'
                           && (_earlySideSlopeDir === 'front' || _earlySideSlopeDir === 'back');
  const topTongues = (roofStyle === 'flat' || roofStyle === 'flat_overhang' || _earlySideSlantNs)
    ? placeTongues(sideLen, tw, margin, [], 3, tw / 2)
    : [];
  
  // Bottom edge: tongues into floor — but skip under door openings.
  // Pre-compute door positions so their X ranges can be excluded from tongue placement.
  const _earlySideDoorStyle = cfg.doorStyle;
  const _earlySideDoorCount = cfg.sideDoorCount || 0;
  const _earlySideManualKey = side === 'E' ? 'east' : 'west';
  const _earlySideManualOps = (cfg.manualOpenings || {})[_earlySideManualKey] || null;
  let _earlySideDoors;
  if (_earlySideManualOps) {
    _earlySideDoors = _earlySideManualOps.filter(op => op.type === 'door');
  } else if (_earlySideDoorCount > 0 && _earlySideDoorStyle && _earlySideDoorStyle !== 'none') {
    _earlySideDoors = computeDoors(sideLen, H, { doorStyle: _earlySideDoorStyle, doorCount: _earlySideDoorCount, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
  } else {
    _earlySideDoors = [];
  }
  const _sideDoorForbidden = bottomTongueForbiddenZones(_earlySideDoors, cfg, H);
  const bottomTongues = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, _sideDoorForbidden, 3, tw / 2),
    sideLen, cfg, _earlySideManualKey, _sideDoorForbidden, matT, tw, margin
  );
  
  // Left/right edges: tongues into front/back wall slots
  // Forbidden zones: top (where roof slot will be cut into wall body) and bay area
  // For a parapet roof, the roof slot is at y=parapetH to parapetH+matT.
  // The vertical edge tongues need to start BELOW that (with margin) and end ABOVE the bay 
  // ceiling slot (with margin).
  const verticalEdgeMinMargin = Math.max(parapetH + matT + 2, 8);
  const verticalEdgeMaxY = (hasFrontBay || hasBackBay) ? (bayCeilingY - 3) : (H - margin);
  const vAvail = verticalEdgeMaxY - verticalEdgeMinMargin;
  const vTongueCount = Math.max(2, Math.min(4, Math.floor(vAvail / 40)));
  // For tongues along a vertical edge, "edgeLength" is the wall HEIGHT.
  // We want tongues placed in [verticalEdgeMinMargin, verticalEdgeMaxY].
  // Use placeTongues with forbidden zones representing the regions OUTSIDE the allowed range.
  const verticalForbidden = [
    [0, verticalEdgeMinMargin],
    [verticalEdgeMaxY, H],
  ];
  const leftTongues = placeTongues(H, tw, 0.1, verticalForbidden, vTongueCount, tw / 2);
  const rightTongues = leftTongues; // mirror

  // Build perimeter path (from buildWallPath)
  const wallSpec = {
    width: sideLen, height: H, matT, kerf: cfg.kerfComp,
    edges: {
      top: { tongues: topTongues, openings: [] },
      right: { tongues: rightTongues, openings: [] },
      bottom: { tongues: bottomTongues, openings: [] },
      left: { tongues: leftTongues, openings: [] },
    }
  };
  const sideWallFace = side === 'E' ? 'east' : 'west';
  const sPitch = cfg.roofPitch || 10;
  const isSideGableEnd = isGableEndWall(cfg, sideWallFace);
  const sideSlopeTabSpec = isSideGableEnd
    ? { tw, margin, kerf: cfg.kerfComp || 0 } : null;

  // For slanted roofs, side walls perpendicular to the slope direction need a trapezoidal top.
  // Convention: x=0 is the SOUTH/front end, x=sideLen is the NORTH/back end.
  const isSlantedRoof = roofStyle === 'slanted';
  const slopeDir = cfg.roofSlopeDirection || 'back';
  const slantNsAxis = (slopeDir === 'front' || slopeDir === 'back');
  let perimeter;
  // Parapet-hidden gable: this wall's top depends on whether it has a
  // parapet under the chosen `parapetSides`. With parapet, the wall
  // extends flat upward by (pitch + parapetH) so its top sits above the
  // hidden gable peak — same shape as the high-side FB wall of an NS
  // slanted roof, just reused here. Without parapet, the wall keeps the
  // standard gabled shape: triangular peak for gable ends, flat top
  // at H for eave walls.
  const isParapetGable = (roofStyle === 'parapet_gable');
  const hasParapetHere = isParapetGable && wallHasParapet(cfg, sideWallFace);
  if (isParapetGable && hasParapetHere) {
    const ext = sPitch + (parapetH || 0);
    perimeter = buildSlantedWallPath(sideLen, H, ext, ext, wallSpec);
  } else if (isSlantedRoof && slantNsAxis) {
    // Side (E/W) walls need slanted tops for NS-axis slopes
    const pitchL = (slopeDir === 'front') ? sPitch : 0;  // south/left end pitch
    const pitchR = (slopeDir === 'back')  ? sPitch : 0;  // north/right end pitch
    perimeter = buildSlantedWallPath(sideLen, H, pitchL, pitchR, wallSpec);
  } else if (isSideGableEnd) {
    perimeter = buildGableWallPath(sideLen, H, sPitch, wallSpec, sideSlopeTabSpec);
  } else {
    perimeter = buildWallPath(wallSpec);
  }

  // Interior cuts: roof slots, bay ceiling slots, window holes
  const rects = [];
  
  // Roof slots — only for parapet/flat roofs where the roof panel has matching tongues
  if (roofStyle === 'parapet') {
    const roofSlotCount = Math.max(2, Math.min(4, Math.floor(sideLen / 30)));
    const roofTonguePoss = placeTongues(sideLen, tw, margin, [], roofSlotCount, tw / 2);
    for (const t of roofTonguePoss) {
      rects.push({
        type: 'cut',
        x: t.start, y: parapetH,
        w: t.end - t.start, h: matT,
        compensateKerf: true,
      });
    }
  }

  // Inter-floor panel slots — but skip if this side IS the "last wall" 
  // (the panel's open edge rests against the last wall's inner face).
  const sideKey = (side === 'E') ? 'east' : 'west';
  const skipInterFloorSlots = (plan.lastWallSide === sideKey);
  if (!skipInterFloorSlots && plan.interFloorYs && plan.interFloorYs.length > 0) {
    const ifTw = 6;
    const ifMargin = 3;
    const ifCount = Math.max(2, Math.min(3, Math.floor(sideLen / 35)));
    const ifPoss = placeTongues(sideLen, ifTw, ifMargin, [], ifCount, ifTw);
    for (const fy of plan.interFloorYs) {
      for (const t of ifPoss) {
        rects.push({
          type: 'cut',
          x: t.start, y: fy - matT/2,
          w: t.end - t.start, h: matT,
          compensateKerf: true,
        });
      }
    }
  }

  // Windows (avoiding bay ceiling region and reserving space for doors)
  const sideHasBay = (hasFrontBay || hasBackBay);
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);
  const doorStyle = cfg.doorStyle;
  const sideDoorCount = cfg.sideDoorCount || 0;
  const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
  const doorReserveH = (sideDoorCount > 0) ? doorH + 3 : 0;

  let sideWindowsToDraw = [], sideDoors = [];
  const _sideManualKey = side === 'E' ? 'east' : 'west';
  const _sideManualOps = manualStructuralOps(cfg, _sideManualKey);
  // East wall laser panel uses the internal-view convention (north on right
  // of panel) to match the openings editor's east display via `oeMirrorX`.
  // Storage keeps x=0=NORTH; flip op.x at the cut layer so a feature placed
  // near the wing side (right in display) cuts at the right end of the panel.
  const _sideMirrorX = (side === 'E');
  if (_sideManualOps) {
    // Manual mode: use editor-placed openings directly. Only window and door
    // entries cut here; bays cannot live on side walls and other types
    // (awning/balcony/fixture/cladding_override/printed_item) don't cut.
    for (const op of _sideManualOps) {
      const opXBase = _sideMirrorX ? (sideLen - op.x - op.w) : op.x;
      if (op.type === 'door') {
        // Per-aperture core holes for glass doors; nothing for solid doors
        // (the cladding insert glues to the wall surface).
        cutDoorCoreHoles(rects, opXBase, op.y, op.w, op.h, op.style || cfg.doorStyle, _sideMirrorX);
        sideDoors.push(op);
      } else if (op.type === 'window') {
        const winStyle = op.style ? WINDOW_STYLES[op.style] : null;
        if (winStyle && winStyle.placement === 'etched') {
          sideWindowsToDraw.push(op);
        } else {
          rects.push({ type: 'cut', x: opXBase - 1, y: op.y - 1, w: op.w + 2, h: op.h + 2, compensateKerf: false });
          sideWindowsToDraw.push(op);
        }
      }
      // All other types are no-ops in this loop.
    }
  } else {
    // Auto mode
    const windows = computeWindows(sideLen, H, {
      density: cfg.windowDensity,
      winDims: winDims,
      groundWinDims: groundWinDims,
      groundFloorCenterY: plan.groundFloorCenterY,
      hasOpening: false,
      openingY: 0, openingH: 0,
      slotYs: plan.slotYs,
      floorCenterYs: plan.floorCenterYs,
      parapetH: plan.parapetH,
      matT: matT,
      doorReserveH: doorReserveH,
      cfg, plan, edgeId: _sideManualKey,
    });
    sideWindowsToDraw = windows;
    for (const w of sideWindowsToDraw) {
      const wxBase = _sideMirrorX ? (sideLen - w.x - w.width) : w.x;
      rects.push({
        type: 'cut',
        x: wxBase - 1, y: w.y - 1,
        w: w.width + 2, h: w.height + 2,
        compensateKerf: false,
      });
    }
    // Doors (on side walls — only if user requested side doors)
    sideDoors = computeDoors(sideLen, H, {
      doorStyle: doorStyle,
      doorCount: sideDoorCount,
      hasOpening: false,
      bayXStart: 0, bayXEnd: 0,
      cfg, plan, edgeId: _sideManualKey,
    });
    for (const d of sideDoors) {
      // Per-aperture core holes for glass doors; nothing for solid doors.
      const dxBase = _sideMirrorX ? (sideLen - d.x - d.width) : d.x;
      cutDoorCoreHoles(rects, dxBase, d.y, d.width, d.height, d.style, _sideMirrorX);
    }
  }

  // Cut any 'open'-connection wing openings into this wall face
  const _sideWallKey = side === 'E' ? 'east' : 'west';
  applyWingOpenings(rects, cfg, _sideWallKey, sideLen, H);

  // Pass-through holes from cutout fixtures — east-side x is mirrored, just
  // like every other opening on the east wall, so the laser part lines up.
  const sideMirrorFn = _sideMirrorX ? (rawX, w) => (sideLen - rawX - w) : null;
  const sideWallPaths = [{ type: 'cut', d: perimeter }];
  cutFixtureHolesInCore(rects, sideWallPaths, cfg, _sideWallKey, sideMirrorFn);

  // parapet_gable VERGE SLOTS — interior cuts in this gable wall that
  // accept the roof panels' verge tongues. The slots run along the
  // verge line (from corner up to peak at center) at the panel's
  // slope angle, so the joint locks each panel at that angle rather
  // than just glueing it flat against the wall.
  //
  // Geometry: the would-be triangular peak has its apex at
  // (sideLen/2, -sPitch) and base corners at (0, 0) and (sideLen, 0).
  // The south half's verge line runs from (0,0) to (sideLen/2, -sPitch);
  // the north half's verge runs from (sideLen, 0) to (sideLen/2, -sPitch).
  // Same `placeTongues(vergeSlantLen, ...)` call as the roof panel
  // (see generateRoof's vergeTongues) so slot positions match the
  // panel's tongue positions bit-for-bit.
  //
  // Each slot is drawn as a 4-corner path (parallelogram aligned with
  // the verge), with kerf compensation applied directly to the corner
  // math because the standard `compensateKerf: true` flag on rects
  // only handles axis-aligned rectangles.
  if (roofStyle === 'parapet_gable' && isSideGableEnd) {
    const sP = sPitch;
    const vergeSlantLen = Math.hypot(sideLen / 2, sP);
    const cosA = (sideLen / 2) / vergeSlantLen;
    const sinA = sP / vergeSlantLen;
    const vergeMargin = Math.max(matT * 2, 5);
    const slotCount = Math.max(2, Math.min(4, Math.floor(vergeSlantLen / 25)));
    const slotPoss = placeTongues(vergeSlantLen, tw, vergeMargin, [], slotCount, tw / 2);
    const k = cfg.kerfComp || 0;

    for (const slot of slotPoss) {
      const s1 = slot.start + k;
      const s2 = slot.end - k;
      const hw = matT / 2 - k;

      // South half: verge from (0,0) → (sideLen/2, -sP). Corners at the
      // slot's two ends, offset perpendicular by ±hw.
      const sx2 = s2 * cosA, sy2 = -s2 * sinA;
      const sx1 = s1 * cosA, sy1 = -s1 * sinA;
      const px = hw * sinA, py = hw * cosA;
      const sPath = `M ${(sx2 + px).toFixed(3)},${(sy2 + py).toFixed(3)} `
                  + `L ${(sx2 - px).toFixed(3)},${(sy2 - py).toFixed(3)} `
                  + `L ${(sx1 - px).toFixed(3)},${(sy1 - py).toFixed(3)} `
                  + `L ${(sx1 + px).toFixed(3)},${(sy1 + py).toFixed(3)} Z`;
      sideWallPaths.push({ type: 'cut', d: sPath });

      // North half: mirror x around sideLen/2.
      const nPath = `M ${(sideLen - sx2 + px).toFixed(3)},${(sy2 + py).toFixed(3)} `
                  + `L ${(sideLen - sx2 - px).toFixed(3)},${(sy2 - py).toFixed(3)} `
                  + `L ${(sideLen - sx1 - px).toFixed(3)},${(sy1 - py).toFixed(3)} `
                  + `L ${(sideLen - sx1 + px).toFixed(3)},${(sy1 + py).toFixed(3)} Z`;
      sideWallPaths.push({ type: 'cut', d: nPath });
    }
  }

  // Bbox extension: the slanted-NS side wall has its top edge slanted from
  // y=−pitchL at x=0 to y=−pitchR at x=sideLen — the bbox already covers
  // that via `H + sPitch + matT`/`bboxOffsetY = sPitch`. When the wall ALSO
  // carries top tongues (added above for slanted-NS so the side walls key
  // into the roof's verge slots), the tongues protrude perpendicular to
  // the slanted edge by matT. The outermost tongue extent in the y-axis
  // is matT * (wallW / slantLen) — slightly less than matT in absolute
  // terms because the normal has a small x-component — but matT is the
  // safe upper bound. So when topTongues are present, grow the bbox up
  // by matT (same shape of adjustment as the high-side FB wall).
  const sideTopTongueOverhang = (topTongues.length > 0 && isSlantedRoof && slantNsAxis) ? matT : 0;
  // For parapet_gable walls that carry a parapet, the wall extends
  // upward by `pitch + parapetH` — the perimeter draws that extension
  // via buildSlantedWallPath, but the bbox needs to grow to match or
  // the upward part gets clipped from the laser preview.
  const parapetUpExt = (hasParapetHere) ? (sPitch + (parapetH || 0)) : 0;
  return {
    id: side === 'E' ? 'side_wall_east' : 'side_wall_west',
    name: side === 'E' ? 'Side Wall East' : 'Side Wall West',
    material: 'core',
    bboxW: sideLen + 2 * matT,
    bboxH: hasParapetHere
            ? H + parapetUpExt + matT
            : isSideGableEnd
            ? H + sPitch + matT
            : (isSlantedRoof && slantNsAxis) ? H + sPitch + matT + sideTopTongueOverhang
            : H + 2 * matT,
    bboxOffsetX: matT,
    bboxOffsetY: hasParapetHere
            ? parapetUpExt
            : isSideGableEnd
            ? sPitch
            : (isSlantedRoof && slantNsAxis) ? sPitch + sideTopTongueOverhang
            : matT,
    paths: sideWallPaths,
    rects: rects,
    lines: [],
    // For NS-axis slanted roofs the trapezoidal east/west outlines are
    // congruent in the wall coordinate system (both high-on-right), which
    // makes the laser-cut sheet show two identical shapes. The west panel
    // gets a render-time horizontal mirror so its outline AND internal
    // cuts (windows, doors, tongues, slots) all reflect together — the
    // floor-panel slot alignment is preserved because the tongue x-coords
    // mirror in lockstep with the perimeter they sit on. East stays as
    // cut; west is presented as its mirror.
    mirrorX: side === 'W' && isSlantedRoof && slantNsAxis,
    windows: sideWindowsToDraw.length,
    doors: sideDoors.length,
  };
}

/* Build the etch tick marks that mark the bay-door panel's far edge on
 * the wall's core. The user, after laser-cutting, sees these short
 * scored lines adjacent to the bay opening and uses them to position
 * the door panel when gluing it to the inside face of the core:
 *
 *   • Overhead doors (roller, paneled, sectional, tilt_up):
 *       Two short HORIZONTAL ticks, one just outside the left edge of
 *       the bay opening and one just outside the right edge, both at
 *       the Y of the panel's TOP edge. The panel sits with its BOTTOM
 *       glued to the bay opening's bottom edge — that matches the
 *       physical reality of an overhead door retracting upward: the
 *       BOTTOM of the door fabric is what stays visible in the opening.
 *       Aligning the panel's TOP edge with these ticks gives the correct
 *       vertical extent for the chosen "% open".
 *
 *   • Side-sliding doors (slatted):
 *       A single short VERTICAL tick just above the bay opening at the
 *       X of the panel's RIGHT edge. The panel sits against the bay
 *       opening's left edge; aligning the right with this tick gives
 *       the correct horizontal extent. Only one tick (no second above
 *       OR below) because the bay extends down to the ground line —
 *       there's no wall material below the opening.
 *
 * Returns wall-local etch line objects ready to splice into the wall's
 * `lines` array. Returns [] when the wall has no bay, the bay has no
 * door (style 'none'), the door is 100% open (no panel cut at all), or
 * the door style is unknown. */
function bayDoorAlignmentMarks(cfg, plan, which) {
  if (!plan.hasFrontBay && !plan.hasBackBay) return [];
  // A through-bay creates twin entries on both walls; only mark on the
  // wall(s) that actually have a bay record. The plan flags already
  // capture this correctly.
  const wallHasBay = (which === 'front' && plan.hasFrontBay) ||
                     (which === 'back'  && plan.hasBackBay);
  if (!wallHasBay) return [];
  // Use the canonical bay record from this face (or fall back to the
  // opposite face for an orphan-half through-bay). doorStyle and
  // doorPercentOpen are sync'd across the partner so either source
  // gives the same answer in the typical case.
  const bay = findBayOnFace(cfg, which) || findBayOnFace(cfg, which === 'front' ? 'back' : 'front');
  if (!bay) return [];
  const styleKey = bay.doorStyle || 'none';
  if (styleKey === 'none') return [];
  const style = BAY_DOOR_STYLES[styleKey];
  if (!style) return [];
  const pct = Math.max(0, Math.min(100, Number(bay.doorPercentOpen) || 0));
  const ratioClosed = 1 - pct / 100;
  if (ratioClosed <= 0.01) return [];  // 100% open — no panel, no mark

  const { H, bayWidth, bayHeight, bayCeilingY, fbWidth } = plan;
  // Through-bay alignment marks must follow the same mirror as the wall
  // cut on the back wall — without it, the tick marks on the back wall
  // would point at the mirror image of where the door panel actually
  // sits in that wall's local frame.
  const { bayXStart, bayXEnd } = planBayXFor(plan, which);
  const lines = [];
  const tickLen = 2.5;  // mm — long enough to spot, short enough not to clutter

  if (style.direction === 'side') {
    // Slatted side-sliding door: panel sits against the bay's LEFT
    // edge, extends rightward to bayXStart + bayWidth * ratioClosed.
    const panelRight = bayXStart + bayWidth * ratioClosed;
    const tickY1 = Math.max(0, bayCeilingY - tickLen);
    const tickY2 = bayCeilingY;
    lines.push({ type: 'etch', x1: panelRight, y1: tickY1, x2: panelRight, y2: tickY2 });
  } else {
    // Overhead door: panel is anchored at the BAY OPENING's BOTTOM edge
    // and rises upward by panelH = bayHeight * ratioClosed. The far edge
    // (the top of the visible panel) sits at bayCeilingY + bayHeight *
    // (1 − ratioClosed) — that's where the tick marks belong. Physically
    // this matches what an overhead door looks like when partially open:
    // the BOTTOM of the door is what stays in the opening, the top has
    // retracted into the housing.
    const panelTop = bayCeilingY + bayHeight * (1 - ratioClosed);
    const leftTickX1  = Math.max(0, bayXStart - tickLen);
    const leftTickX2  = bayXStart;
    const rightTickX1 = bayXEnd;
    const rightTickX2 = Math.min(fbWidth, bayXEnd + tickLen);
    lines.push({ type: 'etch', x1: leftTickX1,  y1: panelTop, x2: leftTickX2,  y2: panelTop });
    lines.push({ type: 'etch', x1: rightTickX1, y1: panelTop, x2: rightTickX2, y2: panelTop });
  }
  return lines;
}

/* Generate front or back wall */
function generateFrontBackWall(cfg, plan, which) {
  const { H, matT, tw, parapetH, roofStyle, fbWidth,
          bayWidth, bayHeight, bayCeilingY } = plan;
  // bayXStart / bayXEnd come from planBayXFor so the back wall sees the
  // MIRRORED coords for a through-bay (so its cut aligns with the front
  // in 3D after the wall is flipped during assembly). For side bays or
  // for the front wall, this is identity-equal to plan.bayXStart.
  const { bayXStart, bayXEnd } = planBayXFor(plan, which);
  const hasBay = (which === 'front' && plan.hasFrontBay) || (which === 'back' && plan.hasBackBay);

  const margin = Math.max(matT * 2, 5);

  // Top edge: depending on roof style. flat_overhang uses the same wall-top
  // tongue + roof-slot mechanism as flat (the overhang is purely in the
  // roof core's larger footprint; the tongue layout is identical).
  //
  // SLANTED roofs deliberately do NOT carry top tongues on the FB walls.
  // The FB walls on an NS-axis slope have FLAT, HORIZONTAL tops (the low
  // side at y=H, the high side rectangular-extended up to y=H+pitch but
  // still with a horizontal top edge), and on an EW-axis slope the FB
  // walls are themselves trapezoidal but that case isn't tongue-wired
  // either. The reason in both cases is the same: a tongue rising
  // straight UP from a horizontal wall top would meet the tilted roof
  // PANEL at the slope angle, not at a right angle. That's a bad joint
  // — the tongue would either bottom-out before it's seated or it'd
  // wedge crooked against the slot's side. The slanted SIDE walls (for
  // NS-axis slopes — handled in generateSideWall) DO get tongues,
  // because their slanted top edge follows the roof's slope, so a
  // tongue perpendicular to that edge points along the roof's normal
  // and enters its verge slot at the right angle. For the FB walls
  // here, the cleaner mechanical answer is to leave the top edge plain
  // and let the wall rest against the underside of the roof — a glue
  // joint with no mechanical key, but at the correct geometry.
  const topTongues = (roofStyle === 'flat' || roofStyle === 'flat_overhang')
    ? placeTongues(fbWidth, tw, margin, [], 3, tw / 2)
    : [];

  // Bottom edge: tongues into floor — skip bay opening AND door openings.
  // Pre-compute door positions now (before building perimeter) so their X ranges
  // can be excluded from tongue placement, preventing tabs from colliding with doorways.
  const _earlyFbDoorStyle  = cfg.doorStyle;
  const _earlyFbDoorCount  = (which === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
  const _earlyFbManualOps  = manualStructuralOps(cfg, which);
  let _earlyFbDoors;
  if (_earlyFbManualOps) {
    _earlyFbDoors = _earlyFbManualOps.filter(op => op.type === 'door');
  } else if (!hasBay && _earlyFbDoorCount > 0 && _earlyFbDoorStyle && _earlyFbDoorStyle !== 'none') {
    _earlyFbDoors = computeDoors(fbWidth, H, { doorStyle: _earlyFbDoorStyle, doorCount: _earlyFbDoorCount, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
  } else {
    _earlyFbDoors = [];
  }
  const _fbDoorForbidden = bottomTongueForbiddenZones(_earlyFbDoors, cfg, H);
  const bottomForbidden = [
    ...(hasBay ? [[bayXStart, bayXEnd]] : []),
    ..._fbDoorForbidden,
  ];
  const bottomTongues = applyWallAssemblyKeyToTongues(
    placeTongues(fbWidth, tw, margin, bottomForbidden, 3, tw / 2),
    fbWidth, cfg, which, bottomForbidden, matT, tw, margin
  );

  // Left/right edges: SLOTS for side wall tongues.
  // Use the same vertical positions as the side wall vertical-edge tongues.
  // The side wall computes one set of vertical-edge tongues per wall
  // (East L = East R, West L = West R), driven by `(hasFrontBay ||
  // hasBackBay)` — i.e. ANY bay on the building shrinks the available
  // range to leave clearance above the bay ceiling. The slots on BOTH FB
  // walls must match those side-wall tongues, so we use the same global
  // criterion here. If we used only THIS wall's `hasBay`, an asymmetric
  // bay (side-style on one wall only) would leave the no-bay FB wall's
  // slots in the full-height range while the side-wall tongues sit in
  // the bay-restricted range — they wouldn't align.
  const verticalEdgeMinMargin = Math.max(parapetH + matT + 2, 8);
  const anyBay = plan.hasFrontBay || plan.hasBackBay;
  const verticalEdgeMaxY = anyBay ? (bayCeilingY - 3) : (H - margin);
  const vAvail = verticalEdgeMaxY - verticalEdgeMinMargin;
  const vTongueCount = Math.max(2, Math.min(4, Math.floor(vAvail / 40)));
  const verticalForbidden = [
    [0, verticalEdgeMinMargin],
    [verticalEdgeMaxY, H],
  ];
  // openings on left/right edges (= slots in the wall body, perpendicular to the edge surface)
  // Actually in our edge feature model, openings cut INTO the wall body from the edge.
  // Slots for side-wall tongues are openings on left and right edges:
  const sidewallSlots = placeTongues(H, tw, 0.1, verticalForbidden, vTongueCount, tw / 2);

  const wallSpec = {
    width: fbWidth, height: H, matT, kerf: cfg.kerfComp,
    // Bay coords go here so buildFBWallWithBay sees the wall-local (mirrored
    // for back) coords from planBayXFor — without them it would read
    // plan.bayXStart directly and miss the through-bay mirror for the back
    // wall.
    bayXStart, bayXEnd,
    edges: {
      top: { tongues: topTongues, openings: [] },
      right: { tongues: [], openings: sidewallSlots },
      bottom: { tongues: bottomTongues, openings: hasBay ? [{start: bayXStart, end: bayXEnd}] : [] },
      left: { tongues: [], openings: sidewallSlots },
    }
  };
  // For the bay opening on the bottom edge, it's a NEGATIVE feature that goes UP into the body
  // by bayHeight (not just by matT). So we need to handle this specially.
  // Let's use the standard openings mechanism but override the depth manually.
  // Actually our buildWallPath uses matT depth for openings, which won't work for bay openings.
  // Let me handle bay specially: build path WITHOUT bay, then carve bay separately.

  // Rebuild without bay
  wallSpec.edges.bottom.openings = [];
  let perimeter = buildWallPath(wallSpec);

  // If there's a bay, integrate it into the perimeter manually by replacing the bottom-edge segment.
  // Simpler approach: don't try to integrate, instead build the whole path manually for fb walls.
  if (hasBay) {
    perimeter = buildFBWallWithBay(wallSpec, plan);
  }

  // Gable-end walls: replace with pentagon (triangle above eave level).
  // When a bay also sits on this wall (industrial through-bays etc.),
  // the gable peak still applies — bay is bottom cutout, peak is top
  // edge, they don't share geometry. The bay path builder accepts a
  // `gablePitch` field on the wallSpec and grows the top edge into a
  // pentagon instead of a flat rectangle when set.
  const pitch = cfg.roofPitch || 10;
  const isGableEnd = isGableEndWall(cfg, which);
  // Parapet-hidden gable: same logic as the side wall — if this FB wall
  // carries a parapet under the chosen parapetSides, replace the top
  // with a flat extension `pitch + parapetH` above the eave. Wins over
  // both isGableEnd and the slanted-FB branches below: when the user
  // picks parapet_gable, those alternate paths shouldn't apply.
  const isParapetGable = (roofStyle === 'parapet_gable');
  const hasParapetHere = isParapetGable && wallHasParapet(cfg, which);
  if (hasParapetHere) {
    const ext = pitch + (parapetH || 0);
    if (hasBay) {
      wallSpec.topExtension = ext;
      perimeter = buildFBWallWithBay(wallSpec, plan);
    } else {
      perimeter = buildSlantedWallPath(fbWidth, H, ext, ext, wallSpec);
    }
  } else if (isGableEnd) {
    const fbSlopeTabSpec = { tw, margin, kerf: cfg.kerfComp || 0 };
    if (hasBay) {
      // Bay + gable-end: the rectangular base path already handled the bay
      // notch in the previous block via buildFBWallWithBay (perimeter was
      // set above). Re-emit through the bay builder with gablePitch set so
      // the top edge becomes the triangular peak with verge tabs.
      wallSpec.gablePitch = pitch;
      wallSpec.gableSlopeTabSpec = fbSlopeTabSpec;
      perimeter = buildFBWallWithBay(wallSpec, plan);
    } else {
      perimeter = buildGableWallPath(fbWidth, H, pitch, wallSpec, fbSlopeTabSpec);
    }
  }

  // Slanted-roof: front/back walls perpendicular to an EW slope need trapezoidal tops.
  // Convention: x=0 is the WEST end, x=fbWidth is the EAST end.
  // For NS-axis slopes the front/back walls are rectangular but the HIGH-side
  // wall extends UP by the slope pitch so its top edge meets the roof angle.
  // The extension lives ABOVE y=0 (i.e. at y=−sPitch) so internal cuts
  // (windows, doors, slots, tongues) keep their stored y coordinates in
  // the base [0, H] region; the user just sees extra material above them.
  // This applies whether or not the wall has a bay — the bay sits at the
  // bottom (y=H), the slope extension sits above (y=−sPitch to 0); they
  // don't interact.
  const isSlantedFB = roofStyle === 'slanted' && !isGableEnd;
  const slopeDir = cfg.roofSlopeDirection || 'back';
  const isSlantedNS = isSlantedFB && (slopeDir === 'front' || slopeDir === 'back');
  const isHighSideFB = isSlantedNS && (
    (slopeDir === 'front' && which === 'front') ||
    (slopeDir === 'back'  && which === 'back')
  );
  if (isSlantedFB) {
    if (!isSlantedNS) {
      if (!hasBay) {
        // EW slope, no bay → front/back walls are trapezoidal (top edge follows slope)
        const pitchL = (slopeDir === 'west') ? pitch : 0;  // west/left end
        const pitchR = (slopeDir === 'east') ? pitch : 0;  // east/right end
        perimeter = buildSlantedWallPath(fbWidth, H, pitchL, pitchR, wallSpec);
      }
      // EW slope WITH bay: keep buildFBWallWithBay's existing rectangle.
      // (Trapezoidal top + bay is a future enhancement; the wall stays flat-top.)
    } else if (isHighSideFB) {
      // NS slope, high side → rectangular but extended UP by sPitch so the
      // wall top sits at y=−sPitch (reaching the roof's high edge). The
      // extension lives above y=0; the bay (if any) lives at the bottom.
      if (hasBay) {
        // Rebuild the bay-aware perimeter with the top raised. buildFBWallWithBay
        // reads spec.topExtension when present.
        wallSpec.topExtension = pitch;
        perimeter = buildFBWallWithBay(wallSpec, plan);
      } else {
        // No bay: use the rectangular extension via buildSlantedWallPath with
        // equal left/right pitches. Top edge stays featureless.
        perimeter = buildSlantedWallPath(fbWidth, H, pitch, pitch, wallSpec);
      }
    }
    // NS slope low-side wall: keep the default rectangle (perimeter already set above).
  }

  // Interior cuts
  const rects = [];

  // Roof slots — only for parapet/flat roofs where the roof panel has matching tongues
  if (roofStyle === 'parapet') {
    // Use the SAME placeTongues call as generateRoof so positions match
    // exactly. The roof sits inside the walls (interior dim = fbWidth - 2*matT),
    // so the wall's slots must be at the same positions but offset by matT
    // (wall-content x = matT + roof-local x). When the wing is small and
    // capacity becomes limiting (e.g. wing.span = 48 → fbWidth=48 capacity 2,
    // but interior=45 capacity 1), this prevents wall and roof from disagreeing
    // on tongue count.
    const interiorW = fbWidth - 2 * matT;
    const roofSlotCount = Math.max(2, Math.min(4, Math.floor(interiorW / 30)));
    const roofTonguePoss = placeTongues(interiorW, tw, margin, [], roofSlotCount, tw / 2);
    for (const t of roofTonguePoss) {
      rects.push({
        type: 'cut',
        x: t.start + matT, y: parapetH,
        w: t.end - t.start, h: matT,
        compensateKerf: true,
      });
    }
  }

  // Inter-floor panel slots — skipped if this wall IS the "last wall".
  // No bay forbidden zones needed: the bay opening is capped below the panel Y
  // so all slots land in solid wall material.
  //
  // CRITICAL: the inter-floor PANEL spans only the inner cavity between
  // the two side walls — its width is bcW = fbWidth − 2·matT, not the
  // full fbWidth that the FB wall material spans. The panel's tongues are
  // placed across bcW; this wall's matching slots must use the SAME
  // edge length (bcW) and the same target count, then offset the result
  // by matT to land at wall-local x positions [matT, fbWidth−matT].
  // Previously this code ran placeTongues on fbWidth, which produced a
  // shifted layout that drifted apart from the panel tongues by up to
  // ~matT/2 per side — tongues missed slots near the wall ends and the
  // panel didn't seat cleanly.
  const skipInterFloorSlots = (plan.lastWallSide === which);
  if (!skipInterFloorSlots && plan.interFloorYs && plan.interFloorYs.length > 0) {
    const ifTw = 6;
    const ifMargin = 3;
    const bcW = fbWidth - 2 * matT;
    const ifCount = Math.max(2, Math.min(4, Math.floor(bcW / 25)));
    const ifPoss = placeTongues(bcW, ifTw, ifMargin, [], ifCount, ifTw);
    for (const fy of plan.interFloorYs) {
      for (const t of ifPoss) {
        rects.push({
          type: 'cut',
          x: t.start + matT, y: fy - matT / 2,
          w: t.end - t.start, h: matT,
          compensateKerf: true,
        });
      }
    }
  }

  // Windows
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);
  const doorStyle = cfg.doorStyle;
  const fbDoorCount = (which === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
  const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
  // Don't reserve door space if there's a bay opening (the bay IS the entrance)
  const doorReserveH = (fbDoorCount > 0 && !hasBay) ? doorH + 3 : 0;

  // For walls with a bay opening, the bay covers the bay-ceiling-Y region already;
  // inter-floor slots above the bay still need to be avoided.
  const slotYsForThisWall = hasBay
    ? (plan.slotYs || []).filter(y => y < (H - bayHeight) - 1)
    : (plan.slotYs || []);
  // Floor center Ys: any center that falls inside the bay opening is unusable on this wall.
  const floorCenterYsForThisWall = hasBay
    ? (plan.floorCenterYs || []).filter(y => y < (H - bayHeight) - 1)
    : (plan.floorCenterYs || []);

  let windowsToDraw = [], doors = [];
  const _fbManualOps = manualStructuralOps(cfg, which);
  if (_fbManualOps) {
    // Manual mode: use editor-placed openings directly. Only window and door
    // entries cut the wall here — the bay is a separate structural feature
    // cut via buildFBWallWithBay(), and awnings/fixtures/etc don't penetrate.
    // Treating an unknown type as a window would punch a second hole at the
    // bay's raw stored dims, which is exactly the doubled-cut bug we fixed.
    for (const op of _fbManualOps) {
      if (op.type === 'door') {
        // Glass doors get per-aperture core holes (matching the window
        // sandwich pattern); solid doors get no core cut — the cladding
        // insert glues directly to the wall surface.
        cutDoorCoreHoles(rects, op.x, op.y, op.w, op.h, op.style || cfg.doorStyle, false);
        doors.push(op);
      } else if (op.type === 'window') {
        // Window: skip hole entirely for blanked (etched-on-cladding) styles.
        // The cladding has only an etched outline; no opening through the wall.
        const winStyle = op.style ? WINDOW_STYLES[op.style] : null;
        if (winStyle && winStyle.placement === 'etched') {
          windowsToDraw.push(op);
        } else {
          rects.push({ type: 'cut', x: op.x - 1, y: op.y - 1, w: op.w + 2, h: op.h + 2, compensateKerf: false });
          windowsToDraw.push(op);
        }
      }
      // All other types (bay, awning, balcony, fixture, cladding_override,
      // printed_item) are no-ops in this loop — handled elsewhere.
    }
  } else {
    // Auto mode: compute windows and doors algorithmically
    const windows = computeWindows(fbWidth, H, {
      density: cfg.windowDensity,
      winDims: winDims,
      groundWinDims: groundWinDims,
      groundFloorCenterY: plan.groundFloorCenterY,
      hasOpening: hasBay,
      openingY: H - bayHeight,
      openingH: bayHeight,
      slotYs: slotYsForThisWall,
      floorCenterYs: floorCenterYsForThisWall,
      parapetH: plan.parapetH,
      matT: matT,
      doorReserveH: doorReserveH,
      cfg, plan, edgeId: which,
    });
    // Front and back walls now produce the same windows by default (aligned). 
    // We no longer slice the front in half — that broke floor alignment. If the user 
    // wants fewer windows on the front, they should adjust density.
    windowsToDraw = windows;
    for (const w of windowsToDraw) {
      rects.push({
        type: 'cut',
        x: w.x - 1, y: w.y - 1,
        w: w.width + 2, h: w.height + 2,
        compensateKerf: false,
      });
    }
    // Doors (front/back walls — only if no bay AND user requested doors)
    if (!hasBay) {
      doors = computeDoors(fbWidth, H, {
        doorStyle: doorStyle,
        doorCount: fbDoorCount,
        hasOpening: false,
        bayXStart: 0, bayXEnd: 0,
        cfg, plan, edgeId: which,
      });
      for (const d of doors) {
        // Per-aperture core holes for glass doors; nothing for solid doors.
        cutDoorCoreHoles(rects, d.x, d.y, d.width, d.height, d.style, false);
      }
    }
  }

  // Cut any 'open'-connection wing openings into this wall face
  applyWingOpenings(rects, cfg, which, fbWidth, H);

  // Pass-through holes from cutout-placement fixtures (wiring/LED openings)
  const wallPaths = [{ type: 'cut', d: perimeter }];
  cutFixtureHolesInCore(rects, wallPaths, cfg, which, null);

  // parapet_gable VERGE SLOTS — same construction as the side wall's
  // verge slots (see generateSideWall for the rationale), but applied
  // here when the FB wall is the gable wall (i.e. under ridge-ns:
  // 'fb' mode, or 'all' mode with the user's ridge set to ns). The
  // verge line geometry uses fbWidth instead of sideLen; everything
  // else is identical.
  if (roofStyle === 'parapet_gable' && isGableEndWall(cfg, which)) {
    const sP = pitch;
    const vergeSlantLen = Math.hypot(fbWidth / 2, sP);
    const cosA = (fbWidth / 2) / vergeSlantLen;
    const sinA = sP / vergeSlantLen;
    const vergeMargin = Math.max(matT * 2, 5);
    const slotCount = Math.max(2, Math.min(4, Math.floor(vergeSlantLen / 25)));
    const slotPoss = placeTongues(vergeSlantLen, tw, vergeMargin, [], slotCount, tw / 2);
    const k = cfg.kerfComp || 0;

    for (const slot of slotPoss) {
      const s1 = slot.start + k;
      const s2 = slot.end - k;
      const hw = matT / 2 - k;

      const sx2 = s2 * cosA, sy2 = -s2 * sinA;
      const sx1 = s1 * cosA, sy1 = -s1 * sinA;
      const px = hw * sinA, py = hw * cosA;
      const sPath = `M ${(sx2 + px).toFixed(3)},${(sy2 + py).toFixed(3)} `
                  + `L ${(sx2 - px).toFixed(3)},${(sy2 - py).toFixed(3)} `
                  + `L ${(sx1 - px).toFixed(3)},${(sy1 - py).toFixed(3)} `
                  + `L ${(sx1 + px).toFixed(3)},${(sy1 + py).toFixed(3)} Z`;
      wallPaths.push({ type: 'cut', d: sPath });

      const nPath = `M ${(fbWidth - sx2 + px).toFixed(3)},${(sy2 + py).toFixed(3)} `
                  + `L ${(fbWidth - sx2 - px).toFixed(3)},${(sy2 - py).toFixed(3)} `
                  + `L ${(fbWidth - sx1 - px).toFixed(3)},${(sy1 - py).toFixed(3)} `
                  + `L ${(fbWidth - sx1 + px).toFixed(3)},${(sy1 + py).toFixed(3)} Z`;
      wallPaths.push({ type: 'cut', d: nPath });
    }
  }

  // Bay door alignment tick marks (etched on the core, adjacent to the
  // bay opening, indicating where the door panel's far edge should
  // land). Empty when there's no bay door or the door is 100% open.
  const wallLines = bayDoorAlignmentMarks(cfg, plan, which);

  // Bbox extension: the high-side FB wall on a slanted-NS roof has its top
  // edge raised by `pitch` (so the wall reaches the roof angle's upper
  // end). It does NOT carry top tongues — see the topTongues block above
  // for why — so `topTongueOverhang` collapses to 0 for slanted roofs
  // and the bbox is just `H + pitch + matT` (one matT for the bottom
  // tongues into the floor). For flat / flat_overhang roofs the FB
  // walls DO get top tongues that key into eave slots; in that case
  // `topTongueOverhang` is matT and the bbox grows to fit. Low-side
  // walls already get a matT top overhang in the default branch
  // (`matT` bboxOffsetY + `H + 2*matT` bboxH), so no extra adjustment
  // is needed there.
  const topTongueOverhang = (topTongues.length > 0) ? matT : 0;
  // For parapet_gable walls with a parapet, the wall extends upward by
  // `pitch + parapetH` — see the perimeter-build branch above. The bbox
  // grows to match so the laser preview shows the full parapet.
  const fbParapetUpExt = (hasParapetHere) ? (pitch + (parapetH || 0)) : 0;
  return {
    id: which + '_wall',
    name: which === 'front' ? 'Front Wall' : 'Back Wall',
    material: 'core',
    bboxW: fbWidth,
    bboxH: hasParapetHere ? H + fbParapetUpExt + matT
         : isGableEnd ? H + pitch + matT
         : isHighSideFB ? H + pitch + matT + topTongueOverhang
         : H + 2 * matT,
    bboxOffsetX: 0,
    bboxOffsetY: hasParapetHere ? fbParapetUpExt
                : isGableEnd ? pitch
                : isHighSideFB ? pitch + topTongueOverhang
                : matT,
    paths: wallPaths,
    rects: rects,
    lines: wallLines,
    // For EW-axis slanted roofs the trapezoidal front/back outlines are
    // congruent in the wall coordinate system — both walls store the slope
    // at the same end (e.g. east-high → `pitchR = pitch` for both). That
    // makes the laser-cut sheet show two identical shapes, but the front
    // wall's exterior face is south (east on the right when viewed from
    // outside) and the back wall's exterior face is north (east on the
    // LEFT when viewed from outside) — they need to be physical mirrors
    // of each other for the trapezoid to slope in the same physical
    // direction on both walls. The back panel gets a render-time
    // horizontal mirror so its outline AND internal cuts (windows, doors,
    // tongues, slots) all reflect together; front stays as cut, back is
    // presented (and cut) as its mirror.
    //
    // Same trick as `side === 'W' && isSlantedRoof && slantNsAxis` does
    // for the west side wall on NS-axis slanted roofs. Doesn't apply to
    // NS-axis (FB walls are rectangular there — only their height differs
    // and the extension is x-symmetric) or to gabled walls (pentagons are
    // x-symmetric about the ridge).
    mirrorX: which === 'back' && isSlantedFB && !isSlantedNS,
    windows: windowsToDraw.length,
    doors: doors.length,
  };
}
function buildFBWallWithBay(spec, plan) {
  const { width: W, height: H, matT, kerf } = spec;
  const k = kerf || 0;
  const td = matT;
  const tk = -k;
  const sk = k;

  // Prefer wall-local bay coords from spec — they carry the through-bay
  // mirror for the back wall. Fall back to plan.bayXStart for callers that
  // haven't been updated yet (none in current code, but defensive).
  const bayXStart = (spec.bayXStart != null) ? spec.bayXStart : plan.bayXStart;
  const bayXEnd   = (spec.bayXEnd   != null) ? spec.bayXEnd   : plan.bayXEnd;
  const { bayHeight } = plan;
  // For slanted NS-axis high-side walls the top edge is raised by sPitch
  // above the regular eave (y=0) so the wall reaches the roof's high edge.
  // The extension is flat (no tongues), and the [0, H] region keeps all
  // its features so the bay notch, side-wall slots, and floor tongues land
  // exactly as they would without the slope.
  const tExt = (spec.topExtension > 0) ? spec.topExtension : 0;
  // Gable-end FB walls that also carry a bay need a TRIANGULAR peak on
  // top of the rectangular wall body — the bay is a cutout on the
  // bottom edge, the gable peak is on top, and they don't interact.
  // Before this was wired in, the FB wall generator's gable-end branch
  // had a `&& !hasBay` guard (see "Gable-end walls" block) that flipped
  // gable-end to false the moment a bay landed on the wall, leaving
  // the wall body rectangular and silently dropping the peak — so the
  // wall core stopped at the eave even though the cladding panel (which
  // never had that guard) correctly drew its pentagon. The roof panels
  // and gable-wall verge tabs then had nothing to slot into. The
  // gablePitch field carries the rise from eave to apex; when > 0 the
  // top edge below is replaced with two sloped edges meeting at
  // (W/2, -gablePitch), with optional slope tabs from gableSlopeTabSpec
  // mirroring buildGableWallPath's tab placement so the joinery matches.
  const gablePitch    = spec.gablePitch > 0 ? spec.gablePitch : 0;
  const gableTabSpec  = (gablePitch > 0) ? (spec.gableSlopeTabSpec || null) : null;

  // Starting y: top extension shifts it up, gable peak doesn't (the
  // peak is local to the top edge — the start corner stays at the eave
  // y=0). Slanted topExtension and gabled peak are mutually exclusive
  // styles (slanted is for non-gable-end walls of a slanted roof;
  // gable-end is for gabled or parapet_gable), so we don't try to mix
  // them in one wall here.
  let d = `M 0,${(-tExt).toFixed(3)}`;

  // Top edge
  if (gablePitch > 0) {
    // Triangular peak: walk left slope up to apex, then right slope down.
    // Apex sits at (W/2, -gablePitch). With slope tabs the walk pushes
    // out along the slope's outward-pointing normal at each tab range,
    // identical to buildGableWallPath so the slot positions line up.
    const halfW    = W / 2;
    const slantLen = Math.hypot(halfW, gablePitch);

    if (gableTabSpec) {
      const { tw: tabW, margin: tabMargin } = gableTabSpec;
      const tabDepth = matT;
      const tabK     = -(gableTabSpec.kerf || 0);
      const tabCount = Math.max(2, Math.min(3, Math.floor(slantLen / 25)));
      const tabs     = placeTongues(slantLen, tabW, tabMargin, [], tabCount, tabW / 2);

      // Left slope: (0,0) → apex. Tangent (halfW, -gablePitch)/slantLen,
      // outward normal (tanY, -tanX) (CW rotation).
      const lTx = halfW / slantLen, lTy = -gablePitch / slantLen;
      const lNx = lTy,              lNy = -lTx;
      for (const tab of tabs) {
        const s = tab.start + tabK, e = tab.end - tabK;
        d += ` L ${(s*lTx).toFixed(3)},${(s*lTy).toFixed(3)}`;
        d += ` L ${(s*lTx + tabDepth*lNx).toFixed(3)},${(s*lTy + tabDepth*lNy).toFixed(3)}`;
        d += ` L ${(e*lTx + tabDepth*lNx).toFixed(3)},${(e*lTy + tabDepth*lNy).toFixed(3)}`;
        d += ` L ${(e*lTx).toFixed(3)},${(e*lTy).toFixed(3)}`;
      }
      d += ` L ${halfW.toFixed(3)},${(-gablePitch).toFixed(3)}`;  // apex

      // Right slope: apex → (W, 0). Tangent (halfW, gablePitch)/slantLen,
      // outward normal (pitch, -halfW)/slantLen.
      const rTx = halfW / slantLen, rTy = gablePitch / slantLen;
      const rNx = rTy,              rNy = -rTx;
      for (const tab of tabs) {
        const s = tab.start + tabK, e = tab.end - tabK;
        const ax = halfW + s*rTx, ay = -gablePitch + s*rTy;
        const bx = halfW + e*rTx, by = -gablePitch + e*rTy;
        d += ` L ${ax.toFixed(3)},${ay.toFixed(3)}`;
        d += ` L ${(ax + tabDepth*rNx).toFixed(3)},${(ay + tabDepth*rNy).toFixed(3)}`;
        d += ` L ${(bx + tabDepth*rNx).toFixed(3)},${(by + tabDepth*rNy).toFixed(3)}`;
        d += ` L ${bx.toFixed(3)},${by.toFixed(3)}`;
      }
      d += ` L ${W.toFixed(3)},0`;
    } else {
      // Plain peak, no slope tabs.
      d += ` L ${(W/2).toFixed(3)},${(-gablePitch).toFixed(3)} L ${W.toFixed(3)},0`;
    }
  } else if (tExt > 0) {
    // Slanted high side: flat extended top, no tongues
    d += ` L ${W},${(-tExt).toFixed(3)}`;
  } else {
    const topFeatures = [
      ...spec.edges.top.tongues.map(t => ({ ...t, kind: 'tongue' })),
    ].sort((a, b) => a.start - b.start);
    let x = 0;
    for (const f of topFeatures) {
      const fS = f.start + tk;
      const fE = f.end - tk;
      if (fS > x) d += ` L ${fS},0`;
      d += ` L ${fS},${-td} L ${fE},${-td} L ${fE},0`;
      x = fE;
    }
    if (x < W) d += ` L ${W},0`;
  }

  // Right edge (with side wall slots = openings) — starts at y=-tExt
  const rightFeatures = [
    ...spec.edges.right.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => a.start - b.start);
  let y = -tExt;
  for (const f of rightFeatures) {
    const fS = f.start - sk;
    const fE = f.end + sk;
    if (fS > y) d += ` L ${W},${fS}`;
    d += ` L ${W - td},${fS} L ${W - td},${fE} L ${W},${fE}`;
    y = fE;
  }
  if (y < H) d += ` L ${W},${H}`;

  // Bottom edge: tongues + bay opening
  // Walking right-to-left (x decreasing)
  // First collect all features along the bottom edge
  const bottomTongues = spec.edges.bottom.tongues.slice().sort((a, b) => b.start - a.start);
  // Bay opening sits between bayXStart and bayXEnd
  // We'll walk: from W down to bayXEnd (passing right-side bottom tongues), then bay cutout, then to 0.

  let xpos = W;
  // Process tongues to the right of the bay first (those with f.start >= bayXEnd)
  for (const t of bottomTongues) {
    if (t.start < bayXEnd) continue;
    const fS = t.start + tk;
    const fE = t.end - tk;
    if (xpos > fE) d += ` L ${fE},${H}`;
    d += ` L ${fE},${H + td} L ${fS},${H + td} L ${fS},${H}`;
    xpos = fS;
  }
  // Now at xpos somewhere right of or at bayXEnd. Move to bayXEnd.
  if (xpos > bayXEnd) d += ` L ${bayXEnd},${H}`;
  // Bay opening: cut UP from H by bayHeight
  d += ` L ${bayXEnd},${H - bayHeight} L ${bayXStart},${H - bayHeight} L ${bayXStart},${H}`;
  xpos = bayXStart;
  // Process tongues to the left of the bay
  for (const t of bottomTongues) {
    if (t.start >= bayXEnd) continue; // already processed
    if (t.end > bayXStart) continue;  // would be inside bay region
    const fS = t.start + tk;
    const fE = t.end - tk;
    if (xpos > fE) d += ` L ${fE},${H}`;
    d += ` L ${fE},${H + td} L ${fS},${H + td} L ${fS},${H}`;
    xpos = fS;
  }
  if (xpos > 0) d += ` L 0,${H}`;

  // Left edge (with side wall slots = openings) — ends at y=-tExt
  const leftFeatures = [
    ...spec.edges.left.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);
  let ypos = H;
  for (const f of leftFeatures) {
    const fS = f.start - sk;
    const fE = f.end + sk;
    if (ypos > fE) d += ` L 0,${fE}`;
    d += ` L ${td},${fE} L ${td},${fS} L 0,${fS}`;
    ypos = fS;
  }
  if (ypos > -tExt) d += ` L 0,${(-tExt).toFixed(3)}`;
  d += ` Z`;
  return d;
}

/* Generate roof — depends on style */
/* Adds rooftop mechanical-room slots (cut-through) and rooftop-equipment 
   outlines (etched) to the roof piece's rects/lines arrays. The plan's mechRoom 
   and rooftopEquipPlacements are in roof-local coordinates already. */
function rooftopEquipmentEtchLines(plan, offsetX = 0, offsetY = 0) {
  const lines = [];
  if (plan && plan.rooftopEquipPlacements && plan.rooftopEquipPlacements.length > 0) {
    for (const p of plan.rooftopEquipPlacements) {
      const x = (Number(p.x) || 0) + offsetX;
      const y = (Number(p.y) || 0) + offsetY;
      const w = Number(p.w) || 0;
      const d = Number(p.d) || 0;
      if (w <= 0 || d <= 0) continue;
      // Etched outline = 4 line segments forming the rectangle
      lines.push({ type: 'etch', x1: x,     y1: y,     x2: x + w, y2: y });
      lines.push({ type: 'etch', x1: x + w, y1: y,     x2: x + w, y2: y + d });
      lines.push({ type: 'etch', x1: x + w, y1: y + d, x2: x,     y2: y + d });
      lines.push({ type: 'etch', x1: x,     y1: y + d, x2: x,     y2: y });
      // Add a small marker line in one corner to indicate orientation/identification
      const mark = Math.min(0.7, w * 0.3, d * 0.3);
      lines.push({ type: 'etch', x1: x + 0.3, y1: y + 0.3, x2: x + 0.3 + mark, y2: y + 0.3 });
      lines.push({ type: 'etch', x1: x + 0.3, y1: y + 0.3, x2: x + 0.3, y2: y + 0.3 + mark });
    }
  }
  return lines;
}

function addRoofMechRoomAndEquipment(plan, cfg, rects, lines, roofIsRecessed) {
  const matT = plan.matT;
  // For a parapet (recessed) roof, the SVG bbox is offset by matT all around (the 
  // tongues protrude). Etches and slots are positioned in the BODY frame (which 
  // is the same as plan-coordinate frame, since plan coords are in the body frame).
  // For a flat roof, the bbox starts at (0,0). The matT offset applies only to 
  // the bbox, not to the body — but the existing slot rects in flat-roof code 
  // use matT-offset coords. Hmm.
  // 
  // To keep things simple, I'll position everything relative to the BODY origin 
  // (the upper-left of the inner roof rectangle), which corresponds to plan coords 
  // directly. The buildWallPath / SVG bbox handles the matT offset for parapet roofs.
  
  if (plan.mechRoom) {
    const mr = plan.mechRoom;
    // Cut slots in the roof to receive the mech room walls' bottom tongues.
    // Each wall has 2 tongues (small, ~6mm wide) along its bottom edge.
    const slotTw = 6;
    const slotMargin = 2;
    // Front wall tongues run along x = mr.x to mr.x + mr.w at y = mr.y
    const xTonguesF = placeTongues(mr.w, slotTw, slotMargin, [], 2, slotTw);
    for (const t of xTonguesF) {
      rects.push({ type: 'cut', x: mr.x + t.start, y: mr.y - matT/2, w: t.end - t.start, h: matT, compensateKerf: true });
    }
    // Back wall tongues at y = mr.y + mr.d
    for (const t of xTonguesF) {
      rects.push({ type: 'cut', x: mr.x + t.start, y: mr.y + mr.d - matT/2, w: t.end - t.start, h: matT, compensateKerf: true });
    }
    // West wall tongues at x = mr.x
    const yTonguesS = placeTongues(mr.d, slotTw, slotMargin, [], 2, slotTw);
    for (const t of yTonguesS) {
      rects.push({ type: 'cut', x: mr.x - matT/2, y: mr.y + t.start, w: matT, h: t.end - t.start, compensateKerf: true });
    }
    // East wall tongues at x = mr.x + mr.w
    for (const t of yTonguesS) {
      rects.push({ type: 'cut', x: mr.x + mr.w - matT/2, y: mr.y + t.start, w: matT, h: t.end - t.start, compensateKerf: true });
    }
  }

}
