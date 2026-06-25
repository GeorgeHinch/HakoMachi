/* =====================================================================
   BLOCK CONTEXT + SHARED FACE HELPERS
   ---------------------------------------------------------------------
   Internal refactor layer only: .hako schema is unchanged. Main and wing
   generators can ask the same questions about "what block am I generating?"
   and "what does this local face mean?" without duplicating orientation,
   suffix, and naming logic throughout the codebase.
   ===================================================================== */

const BLOCK_FACES = ['front', 'back', 'east', 'west'];
const BLOCK_CORE_WALL_ORDER = ['east', 'west', 'front', 'back'];

function makeBlockContext(rootCfg, opts = {}) {
  const wing = opts.wing || null;
  const wingIndex = (opts.wingIndex != null) ? opts.wingIndex : null;
  const isWing = !!wing || wingIndex != null;
  const blockCfg = opts.cfg || (isWing ? buildWingCfg(rootCfg, wing) : rootCfg);
  const blockPlan = opts.plan || buildEdgePlans(blockCfg);
  const suffix = (opts.suffix != null) ? opts.suffix : (isWing ? `_wing${wingIndex}` : '');
  const label = opts.label || (isWing ? `Wing ${wingIndex + 1}` : 'Main');
  const mainW = Number(rootCfg && rootCfg.width) || Number(blockCfg.width) || 0;
  const mainD = Number(rootCfg && rootCfg.depth) || Number(blockCfg.depth) || 0;
  const wingTransform = isWing
    ? { kind: 'wing', face: wing.face, offset: wing.offset, mainW, mainD }
    : { kind: 'main' };

  const toWorld = opts.toWorld || (isWing
    ? (p => wingLocalToWorldPointForLayoutCut(rootCfg, wingTransform, p))
    : (p => ({ x: p.x, y: p.y })));

  return {
    kind: isWing ? 'wing' : 'main',
    rootCfg,
    cfg: blockCfg,
    plan: blockPlan,
    wing,
    wingIndex,
    suffix,
    label,
    mainW,
    mainD,
    transform: wingTransform,
    toWorld,
    isWing,
  };
}

function blockPartIdSuffix(ctx) {
  return (ctx && ctx.suffix) || '';
}

function blockPartNamePrefix(ctx) {
  return (ctx && ctx.kind === 'wing') ? `${ctx.label} ` : '';
}

function applyBlockIdentity(part, ctx, opts = {}) {
  if (!part || !ctx) return part;
  if (ctx.kind === 'wing') {
    const suffix = blockPartIdSuffix(ctx);
    if (suffix && !String(part.id || '').endsWith(suffix)) part.id += suffix;
    if (opts.nameMode === 'prefix') {
      if (!String(part.name || '').startsWith(blockPartNamePrefix(ctx))) part.name = blockPartNamePrefix(ctx) + part.name;
    } else if (opts.nameMode === 'suffix') {
      if (suffix && !String(part.name || '').endsWith(suffix)) part.name += suffix;
    }
  }
  return normalizePartMetadata(part, {
    scope: ctx.kind === 'wing' ? 'wing' : 'main',
    wingIndex: ctx.kind === 'wing' ? ctx.wingIndex : null,
    ...(opts.meta || {}),
  });
}

function blockFaceFrame(ctx, face) {
  const cfg = (ctx && ctx.cfg) || CONFIG;
  const plan = (ctx && ctx.plan) || buildEdgePlans(cfg);
  const isSide = face === 'east' || face === 'west';
  const width = isSide ? plan.sideLen : plan.fbWidth;
  const fullWidth = isSide ? (plan.sideLen + 2 * plan.matT) : (plan.fbWidth + 2 * (cfg.claddingThickness || 0));
  const wallId = face === 'front' ? 'front_wall'
              : face === 'back'  ? 'back_wall'
              : face === 'east'  ? 'side_wall_east'
              :                    'side_wall_west';
  const claddingId = face === 'front' ? 'cladding_front'
                   : face === 'back'  ? 'cladding_back'
                   : face === 'east'  ? 'cladding_side_east'
                   :                    'cladding_side_west';
  const roles = (ctx && ctx.kind === 'wing')
    ? { connection: 'front', outer: 'back', left: 'west', right: 'east' }
    : { connection: null, outer: null, left: null, right: null };
  const cp = (ctx && ctx.kind === 'wing')
    ? wingCoplanarCheck(ctx.wing, ctx.mainW, ctx.mainD)
    : { westCoplanar: false, eastCoplanar: false };

  return {
    face,
    isSide,
    wallId,
    claddingId,
    width,
    fullWidth,
    height: plan.H,
    matT: plan.matT,
    isConnectionFace: face === roles.connection,
    isCoplanarFace: (face === 'west' && cp.westCoplanar) || (face === 'east' && cp.eastCoplanar),
    roles,
  };
}

function shouldMirrorWingSidePanel(ctx, face) {
  // Wing side panels are generated in a canonical local frame where x=0 is
  // the connection seam to the main building and x increases outward toward
  // the far wing wall.
  //
  // The exterior cladding orientation is now confirmed correct. Core wall
  // panels need to follow the same exterior-side handedness so the tabs,
  // openings, and cladding all describe the same physical face. For
  // front/back-attached wings that means the WEST side is mirrored and the
  // EAST side is not. The earlier east-core mirror was effectively showing
  // the inside face of the wall while the cladding showed the outside face.
  //
  // East/west-attached wings are left alone because their side-wall convention
  // was already correct.
  const wingFace = ctx && ctx.wing && ctx.wing.face;
  return !!(ctx && ctx.kind === 'wing'
    && (wingFace === 'front' || wingFace === 'back')
    && face === 'west');
}

function shouldMirrorWingSideExteriorCladding(ctx, face) {
  // Core side-wall handedness and exterior-cladding handedness are not the
  // same thing. For a front/back-attached wing, the west exterior cladding is
  // seen from the outside face opposite the core panel's generated/viewed
  // orientation, so it needs its own mirror. East exterior cladding was already
  // correct unmirrored.
  const wingFace = ctx && ctx.wing && ctx.wing.face;
  return !!(ctx && ctx.kind === 'wing'
    && (wingFace === 'front' || wingFace === 'back')
    && face === 'west');
}

function applyWingSideExteriorCladdingMirror(part, ctx, face) {
  if (part && shouldMirrorWingSideExteriorCladding(ctx, face)) {
    part.mirrorX = !part.mirrorX;
    part._wingSideExteriorCladdingMirror = true;
  }
  return part;
}

function applyWingSidePanelMirror(part, ctx, face, opts = {}) {
  if (part && shouldMirrorWingSidePanel(ctx, face)) {
    // Core wall panels need the SVG mirror so their connection-edge tabs are
    // on the correct physical side. Cladding uses a separate exterior-face
    // mirror rule because the outside face can be opposite the generated core
    // panel view. Keep layout-cut length mapping separate from artwork handedness.
    if (opts.mirrorCladding === false) return part;
    part.mirrorX = !part.mirrorX;
    part._wingSideExteriorMirror = true;
  }
  return part;
}

function generateBlockCoreWallParts(ctx, opts = {}) {
  const excludeFaces = opts.excludeFaces || new Set();
  const skipCoplanar = !!opts.skipCoplanar;
  const out = [];
  for (const face of BLOCK_CORE_WALL_ORDER) {
    if (excludeFaces.has(face)) continue;
    const frame = blockFaceFrame(ctx, face);
    if (skipCoplanar && frame.isCoplanarFace) continue;

    const p = frame.isSide
      ? generateSideWall(ctx.cfg, ctx.plan, face === 'east' ? 'E' : 'W')
      : generateFrontBackWall(ctx.cfg, ctx.plan, face);
    applyWingSidePanelMirror(p, ctx, face);
    applyBlockIdentity(p, ctx, { nameMode: 'prefix' });
    out.push(p);
  }
  return out;
}

function generateBlockCladdingParts(ctx, opts = {}) {
  const excludeFaces = opts.excludeFaces || new Set();
  const faces = BLOCK_FACES.filter(f => !excludeFaces.has(f));
  const out = [];

  if (hasSplitCladding(ctx.cfg)) {
    for (const face of faces) {
      const upper = generateCladdingPanel(ctx.cfg, ctx.plan, face, 'upper');
      const ground = generateCladdingPanel(ctx.cfg, ctx.plan, face, 'ground');
      applyWingSideExteriorCladdingMirror(upper, ctx, face);
      applyWingSideExteriorCladdingMirror(ground, ctx, face);
      applyBlockIdentity(upper, ctx, { nameMode: opts.nameMode || 'suffix' });
      applyBlockIdentity(ground, ctx, { nameMode: opts.nameMode || 'suffix' });
      out.push(upper, ground);
    }
  } else {
    for (const face of faces) {
      const p = generateCladdingPanel(ctx.cfg, ctx.plan, face);
      applyWingSideExteriorCladdingMirror(p, ctx, face);
      applyBlockIdentity(p, ctx, { nameMode: opts.nameMode || 'suffix' });
      out.push(p);
    }
  }

  for (const face of faces) {
    const ip = generateInteriorCladdingPanel(ctx.cfg, ctx.plan, face);
    if (!ip) continue;
    // Interior cladding is glued to the inside face of the same core wall.
    // If the core wall is mirrored to show the correct physical handedness,
    // the inside cladding must mirror with it. Exterior cladding has its own
    // outside-face rule above.
    applyWingSidePanelMirror(ip, ctx, face);
    applyBlockIdentity(ip, ctx, { nameMode: opts.nameMode || 'suffix' });
    out.push(ip);
  }
  return out;
}


function wingConnectionWallKey(wing) {
  return 'front';
}

/* For each wing, which of its two parallel side faces ('west' at x=0, 'east' at x=span)
   are coplanar with a main-block outer face.
   east/west wings: 'west' flush = main's front, 'east' flush = main's back.
   front/back wings: 'west' flush = main's west, 'east' flush = main's east. */
function wingCoplanarCheck(wing, mainW, mainD) {
  const faceLen = (wing.face === 'east' || wing.face === 'west') ? mainD : mainW;
  return {
    westCoplanar: wing.offset < 0.5,
    eastCoplanar: Math.abs(wing.offset + wing.span - faceLen) < 0.5,
  };
}

/* ---- Face-merge topology ---------------------------------------------------
   Single source of truth for "which wings extend which main face on which
   side". Core and cladding merge logic both call this so they always agree on
   the layout topology. Returns:
     { front: { left, right }, back: { left, right },
       east:  { left, right }, west:  { left, right } }
   Each slot is either null or { wing, wingFace, extRight, flipWX }, where:
     wing      — the wing object
     wingFace  — which of the wing's parallel faces ('west' | 'east') is
                 coplanar with this main face (= the panel that extends main)
     extRight  — true if the wing extension lies on the RIGHT side of main in
                 the merged panel's frame; false if on the LEFT
     flipWX    — whether to mirror the wing panel's x before translating, so
                 the wing's connection-adjacent end stays adjacent to main in
                 the merged frame regardless of which face/side it's on
   Front-merge uses internal-view convention (east on LEFT) per the openings
   editor. Back/east/west merges keep their natural conventions. When two
   wings target the same (face, side) — rare — the first one in `cfg.wings`
   wins. Layouts with wings stacked on the same side of the same face are
   not currently representable in the merged outline.
*/
function computeFaceMerges(cfg, mainW, mainD) {
  const out = {
    front: { left: null, right: null },
    back:  { left: null, right: null },
    east:  { left: null, right: null },
    west:  { left: null, right: null },
  };
  for (const wing of (cfg.wings || [])) {
    const cp = wingCoplanarCheck(wing, mainW, mainD);
    if (!cp.westCoplanar && !cp.eastCoplanar) continue;
    const wingIsEW    = (wing.face === 'east' || wing.face === 'west');
    const wingIsEast  = (wing.face === 'east');
    const wingIsFront = (wing.face === 'front');
    const candidates = [];
    if (wingIsEW) {
      if (cp.westCoplanar) candidates.push({ face: 'front', extRight: !wingIsEast, wingFace: 'west' });
      if (cp.eastCoplanar) candidates.push({ face: 'back',  extRight: wingIsEast,  wingFace: 'east' });
    } else {
      if (cp.westCoplanar) candidates.push({ face: 'west',  extRight: wingIsFront, wingFace: 'west' });
      if (cp.eastCoplanar) candidates.push({ face: 'east',  extRight: wingIsFront, wingFace: 'east' });
    }
    for (const c of candidates) {
      const m = {
        wing,
        wingFace: c.wingFace,
        extRight: c.extRight,
        flipWX:   ((c.wingFace === 'east') === c.extRight),
      };
      const side = c.extRight ? 'right' : 'left';
      if (!out[c.face][side]) out[c.face][side] = m;
    }
  }
  return out;
}

/* ---- Build the list of opening cuts needed on each main-block wall ---- */
function mainWallOpeningsFromWings(cfg) {
  // Returns { front:[], back:[], east:[], west:[] }
  // Each entry: { y0, y1, h } in wall-local coordinates (y=0 at top)
  const result = { front: [], back: [], east: [], west: [] };
  for (const wing of (cfg.wings || [])) {
    if (wing.connection !== 'open') continue;
    const wallH = wallBodyHeightFromConfig(cfg);
    const wingH = wingHeight(cfg, wing);
    // In wall-local coords, y=0 is top, y=wallH is bottom
    // The opening sits at the bottom of the wall, spanning from y=wallH-wingH to y=wallH
    const y0 = wallH - wingH;
    const y1 = wallH;
    // The opening spans [wing.offset .. wing.offset+wing.span] horizontally
    result[wing.face].push({ x0: wing.offset, x1: wing.offset + wing.span, y0, y1 });
  }
  return result;
}

/* ---- Coplanar wall span computation ----
   When a wing's side is flush with the main block, the combined wall panel
   spans both blocks. Returns { extended, extraSpan } where extraSpan adds
   the wing depth to the panel dimension. */
function getCoplanarExtensions(cfg) {
  const ext = { front: 0, back: 0, east: 0, west: 0 };
  const mainW = cfg.width, mainD = cfg.depth;
  for (const wing of (cfg.wings || [])) {
    const cp = wingCoplanarCheck(wing, mainW, mainD);
    if (wing.face === 'east' || wing.face === 'west') {
      // Wing's 'west' parallel face aligns with main's front; 'east' with main's back
      if (cp.westCoplanar) ext.front = Math.max(ext.front, wing.depth);
      if (cp.eastCoplanar) ext.back  = Math.max(ext.back,  wing.depth);
    } else {
      // Wing's 'west' parallel face aligns with main's west; 'east' with main's east
      if (cp.westCoplanar) ext.west = Math.max(ext.west, wing.depth);
      if (cp.eastCoplanar) ext.east = Math.max(ext.east, wing.depth);
    }
  }
  return ext;
}
