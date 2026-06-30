/* =====================================================================
   STL EXPORT — 3D MASSING PREVIEW
   
   Generates an ASCII STL of the assembled building. Uses simple axis-aligned
   box decomposition: each wall with rectangular openings is decomposed into 
   solid rectangles via a sweep-line, then each rectangle is extruded to its 
   thickness. Cladding and trim are added as thinner layers glued to the 
   outer face.
   
   Coordinate system (right-handed):
     +X = building width direction (left → right when viewing from front)
     +Y = building depth direction (-Y is FRONT face, +Y is BACK)
     +Z = up (ground = z=0)
   ===================================================================== */

/* Build a triangle list. Each triangle is [v1, v2, v3] where each v is [x,y,z]. */
export class TriList {
  constructor() { this.tris = []; }
  
  /* Push an axis-aligned box: x ∈ [x0, x1], y ∈ [y0, y1], z ∈ [z0, z1].
     Skips degenerate boxes. */
  box(x0, x1, y0, y1, z0, z1) {
    if (x1 - x0 < 0.001 || y1 - y0 < 0.001 || z1 - z0 < 0.001) return;
    const v = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    // 6 faces × 2 triangles each, all CCW when viewed from outside
    // -Z (bottom): 0,1,2,3 → CCW from below means CW from above: (0,3,2)(0,2,1)
    this.tris.push([v[0], v[3], v[2]], [v[0], v[2], v[1]]);
    // +Z (top): 4,5,6,7 → CCW from above: (4,5,6)(4,6,7)
    this.tris.push([v[4], v[5], v[6]], [v[4], v[6], v[7]]);
    // -Y (front, normal -Y): vertices 0,4,5,1 (CCW from -Y looking +Y): 0,1,5; 0,5,4
    this.tris.push([v[0], v[1], v[5]], [v[0], v[5], v[4]]);
    // +Y (back, normal +Y): vertices at y=y1, CCW from outside (+Y view)
    // Correct winding: [v2, v3, v7] then [v2, v7, v6]
    this.tris.push([v[2], v[3], v[7]], [v[2], v[7], v[6]]);
    // -X (left, normal -X): 0,4,7,3 → CCW: 0,4,7; 0,7,3
    this.tris.push([v[0], v[4], v[7]], [v[0], v[7], v[3]]);
    // +X (right, normal +X): 1,2,6,5 → CCW: 1,2,6; 1,6,5
    this.tris.push([v[1], v[2], v[6]], [v[1], v[6], v[5]]);
  }
  
  /* Convenience: a rectangular wall slab spanning some range, with a list 
     of rectangular HOLES cut into it (windows, bay, doors). The wall plane is 
     axis-aligned (specified by the orientation: 'X', 'Y', or 'Z' for which axis 
     is the wall normal). The wall has thickness `thick` along the normal axis.
     
     Decomposes the wall into rectangles via sweep-line and pushes each as a box.
     
     Args for orientation 'Y' (wall normal is along Y, wall sits in X-Z plane):
       u0, u1: X range of wall outer face
       v0, v1: Z range of wall outer face
       n0, n1: Y range (thickness) of wall body (n0 < n1)
       holes: array of {u0, u1, v0, v1} in same coordinate frame
     For orientation 'X' (wall normal along X, wall sits in Y-Z plane):
       u → Y, v → Z, n → X
     For orientation 'Z' (wall normal along Z, wall sits in X-Y plane — used for 
     floor/roof/ceiling):
       u → X, v → Y, n → Z
  */
  wallWithHoles(orient, u0, u1, v0, v1, n0, n1, holes) {
    const rects = decomposeWallRectangles(u0, u1, v0, v1, holes || []);
    for (const r of rects) {
      if (orient === 'Y') {
        this.box(r.u0, r.u1, n0, n1, r.v0, r.v1);
      } else if (orient === 'X') {
        this.box(n0, n1, r.u0, r.u1, r.v0, r.v1);
      } else if (orient === 'Z') {
        this.box(r.u0, r.u1, r.v0, r.v1, n0, n1);
      }
    }
  }
  
  toAsciiStl(name) {
    const lines = ['solid ' + (name || 'building')];
    for (const t of this.tris) {
      const ax = t[1][0]-t[0][0], ay = t[1][1]-t[0][1], az = t[1][2]-t[0][2];
      const bx = t[2][0]-t[0][0], by = t[2][1]-t[0][1], bz = t[2][2]-t[0][2];
      let nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      nx /= len; ny /= len; nz /= len;
      lines.push(`facet normal ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`);
      lines.push(`  outer loop`);
      for (const v of t) lines.push(`    vertex ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
      lines.push(`  endloop`);
      lines.push(`endfacet`);
    }
    lines.push('endsolid ' + (name || 'building'));
    return lines.join('\n');
  }
  
  /* Binary STL is much smaller. Returns ArrayBuffer. */
  toBinaryStl() {
    const triCount = this.tris.length;
    const buf = new ArrayBuffer(84 + triCount * 50);
    const dv = new DataView(buf);
    // 80-byte header (zeros are fine)
    dv.setUint32(80, triCount, true);
    let offset = 84;
    for (const t of this.tris) {
      const ax = t[1][0]-t[0][0], ay = t[1][1]-t[0][1], az = t[1][2]-t[0][2];
      const bx = t[2][0]-t[0][0], by = t[2][1]-t[0][1], bz = t[2][2]-t[0][2];
      let nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      dv.setFloat32(offset, nx/len, true); offset += 4;
      dv.setFloat32(offset, ny/len, true); offset += 4;
      dv.setFloat32(offset, nz/len, true); offset += 4;
      for (const v of t) {
        dv.setFloat32(offset, v[0], true); offset += 4;
        dv.setFloat32(offset, v[1], true); offset += 4;
        dv.setFloat32(offset, v[2], true); offset += 4;
      }
      dv.setUint16(offset, 0, true); offset += 2;
    }
    return buf;
  }
}

/* Decompose an axis-aligned rectangle [u0..u1, v0..v1] minus some axis-aligned 
   rectangular holes into a list of solid rectangles via horizontal-band 
   sweep-line. Each band is a horizontal strip with consistent set of holes.
   Within each band, vertical holes split the strip into solid sub-rectangles. */
export function decomposeWallRectangles(u0, u1, v0, v1, holes) {
  // Clip holes to the wall rectangle; drop any hole entirely outside
  const valid = [];
  for (const h of holes) {
    const cu0 = Math.max(u0, h.u0), cu1 = Math.min(u1, h.u1);
    const cv0 = Math.max(v0, h.v0), cv1 = Math.min(v1, h.v1);
    if (cu1 - cu0 > 0.001 && cv1 - cv0 > 0.001) {
      valid.push({ u0: cu0, u1: cu1, v0: cv0, v1: cv1 });
    }
  }
  if (valid.length === 0) {
    return [{ u0, u1, v0, v1 }];
  }
  // Build sorted unique V-edges: every v0 and v1 of every hole, plus wall v0/v1
  const vEdgeSet = new Set([v0, v1]);
  for (const h of valid) { vEdgeSet.add(h.v0); vEdgeSet.add(h.v1); }
  const vEdges = [...vEdgeSet].sort((a, b) => a - b);
  
  const result = [];
  for (let i = 0; i < vEdges.length - 1; i++) {
    const bv0 = vEdges[i], bv1 = vEdges[i + 1];
    if (bv1 - bv0 < 0.001) continue;
    const bandMidV = (bv0 + bv1) / 2;
    // Find holes active in this band (whose v range straddles bandMid)
    const activeHoles = valid.filter(h => h.v0 < bandMidV && h.v1 > bandMidV);
    if (activeHoles.length === 0) {
      // Entire band is solid, span u0..u1
      result.push({ u0, u1, v0: bv0, v1: bv1 });
    } else {
      // Sort active holes by u0, decompose band U-axis into solid runs
      activeHoles.sort((a, b) => a.u0 - b.u0);
      // Merge overlapping holes' U ranges
      const merged = [];
      for (const h of activeHoles) {
        if (merged.length && h.u0 <= merged[merged.length - 1].u1) {
          merged[merged.length - 1].u1 = Math.max(merged[merged.length - 1].u1, h.u1);
        } else {
          merged.push({ u0: h.u0, u1: h.u1 });
        }
      }
      let cur = u0;
      for (const m of merged) {
        if (m.u0 > cur) result.push({ u0: cur, u1: m.u0, v0: bv0, v1: bv1 });
        cur = Math.max(cur, m.u1);
      }
      if (cur < u1) result.push({ u0: cur, u1: u1, v0: bv0, v1: bv1 });
    }
  }
  return result;
}

/* Generate STL for a single piece of rooftop equipment. The geometry is built 
   centered horizontally on (0,0) with its base resting on z=0, so the user can 
   place it on their roof at the etched footprint outline.
   
   Returns a TriList. The caller can call .toBinaryStl() or .toAsciiStl() on it. */
export function generateEquipmentStl(eqKey) {
  const eq = ROOFTOP_EQUIPMENT[eqKey];
  if (!eq) return null;
  const tris = new TriList();
  const w = eq.w, d = eq.d, h = eq.h;
  // Center horizontally: geometry spans x ∈ [-w/2, w/2], y ∈ [-d/2, d/2], z ∈ [0, h]
  const x0 = -w / 2, x1 = w / 2;
  const y0 = -d / 2, y1 = d / 2;
  
  /* Helper: a triangulated cylinder along the Z axis, between z=zBot and z=zTop, 
     centered at (cx, cy), of radius r, with `sides` flat faces. Caps are added 
     at top and bottom. */
  function addCylinder(cx, cy, r, zBot, zTop, sides) {
    sides = sides || 16;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    // Side walls
    for (let i = 0; i < sides; i++) {
      const a = pts[i], b = pts[(i + 1) % sides];
      // Quad from (a, zBot) - (b, zBot) - (b, zTop) - (a, zTop). CCW from outside.
      tris.tris.push([[a[0], a[1], zBot], [b[0], b[1], zBot], [b[0], b[1], zTop]]);
      tris.tris.push([[a[0], a[1], zBot], [b[0], b[1], zTop], [a[0], a[1], zTop]]);
    }
    // Top cap (fan) — CCW viewed from above (+Z)
    for (let i = 0; i < sides; i++) {
      const a = pts[i], b = pts[(i + 1) % sides];
      tris.tris.push([[cx, cy, zTop], [a[0], a[1], zTop], [b[0], b[1], zTop]]);
    }
    // Bottom cap (fan) — CCW viewed from below (-Z), so wind opposite
    for (let i = 0; i < sides; i++) {
      const a = pts[i], b = pts[(i + 1) % sides];
      tris.tris.push([[cx, cy, zBot], [b[0], b[1], zBot], [a[0], a[1], zBot]]);
    }
  }
  
  /* Helper: a frustum (truncated cone) along Z. */
  function addFrustum(cx, cy, rBot, rTop, zBot, zTop, sides) {
    sides = sides || 16;
    const ptsB = [], ptsT = [];
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      ptsB.push([cx + rBot * Math.cos(ang), cy + rBot * Math.sin(ang)]);
      ptsT.push([cx + rTop * Math.cos(ang), cy + rTop * Math.sin(ang)]);
    }
    for (let i = 0; i < sides; i++) {
      const aB = ptsB[i], bB = ptsB[(i + 1) % sides];
      const aT = ptsT[i], bT = ptsT[(i + 1) % sides];
      tris.tris.push([[aB[0], aB[1], zBot], [bB[0], bB[1], zBot], [bT[0], bT[1], zTop]]);
      tris.tris.push([[aB[0], aB[1], zBot], [bT[0], bT[1], zTop], [aT[0], aT[1], zTop]]);
    }
    if (rTop > 0.05) {
      for (let i = 0; i < sides; i++) {
        const a = ptsT[i], b = ptsT[(i + 1) % sides];
        tris.tris.push([[cx, cy, zTop], [a[0], a[1], zTop], [b[0], b[1], zTop]]);
      }
    }
    if (rBot > 0.05) {
      for (let i = 0; i < sides; i++) {
        const a = ptsB[i], b = ptsB[(i + 1) % sides];
        tris.tris.push([[cx, cy, zBot], [b[0], b[1], zBot], [a[0], a[1], zBot]]);
      }
    }
  }
  
  if (eq.shape === 'box_louvered') {
    // Main box body
    tris.box(x0, x1, y0, y1, 0, h);
    // Louver bumps on the front face: small ridges. The "front" is the -Y face.
    const louverCount = (eq.details && eq.details.louverCount) || 5;
    const louverBumpDepth = 0.15;  // ridge protrudes this much in -Y
    const louverGap = h * 0.15;  // gap from top and bottom
    const louverStartZ = louverGap;
    const louverEndZ = h - louverGap;
    const louverHeight = (louverEndZ - louverStartZ) / louverCount;
    const louverRidgeH = louverHeight * 0.5;
    for (let i = 0; i < louverCount; i++) {
      const zMid = louverStartZ + (i + 0.5) * louverHeight;
      const zBot = zMid - louverRidgeH / 2, zTop = zMid + louverRidgeH / 2;
      // Ridge: thin extrusion from front face
      tris.box(x0 + w * 0.1, x1 - w * 0.1, y0 - louverBumpDepth, y0, zBot, zTop);
    }
    // Small fan circle on top
    addCylinder(0, 0, Math.min(w, d) * 0.3, h, h + 0.4, 12);
  }
  
  else if (eq.shape === 'cooling_tower') {
    const det = eq.details || {};
    const fanR = det.fanRadius || Math.min(w, d) * 0.3;
    const fanH = det.fanHeight || 1.5;
    // Main body — slightly tapered for visual interest
    tris.box(x0, x1, y0, y1, 0, h - fanH);
    // Vertical louver ridges on all 4 sides
    const louverCount = det.louverCount || 8;
    const ridgeDepth = 0.15;
    const louverGap = (h - fanH) * 0.1;
    for (let i = 0; i < louverCount; i++) {
      const xMid = x0 + (i + 0.5) * (w / louverCount);
      const ridgeW = (w / louverCount) * 0.4;
      // Front (-Y) and Back (+Y)
      tris.box(xMid - ridgeW / 2, xMid + ridgeW / 2, y0 - ridgeDepth, y0, louverGap, h - fanH - louverGap);
      tris.box(xMid - ridgeW / 2, xMid + ridgeW / 2, y1, y1 + ridgeDepth, louverGap, h - fanH - louverGap);
    }
    // Fan housing (cylinder) on top
    addCylinder(0, 0, fanR, h - fanH, h, 16);
    // Fan hub
    addCylinder(0, 0, fanR * 0.25, h, h + 0.3, 8);
  }
  
  else if (eq.shape === 'tank_round_legged') {
    const det = eq.details || {};
    const tankR = det.tankRadius || Math.min(w, d) / 2;
    const tankH = det.tankHeight || h * 0.8;
    const legH = det.legHeight || (h - tankH);
    const legCount = det.legCount || 4;
    // Legs: simple boxes
    const legSize = 0.4;
    const legR = tankR - legSize;  // legs at radius slightly inside the tank diameter
    for (let i = 0; i < legCount; i++) {
      const ang = (i / legCount) * Math.PI * 2;
      const cx = legR * Math.cos(ang);
      const cy = legR * Math.sin(ang);
      tris.box(cx - legSize / 2, cx + legSize / 2, cy - legSize / 2, cy + legSize / 2, 0, legH);
    }
    // Tank body — main cylinder
    addCylinder(0, 0, tankR, legH, legH + tankH * 0.85, 16);
    // Top dome — frustum tapering toward narrower top
    addFrustum(0, 0, tankR, tankR * 0.7, legH + tankH * 0.85, legH + tankH, 16);
    // Small vent stack on top
    addCylinder(0, 0, tankR * 0.15, legH + tankH, legH + tankH + 0.6, 8);
  }
  
  else if (eq.shape === 'tank_square_legged') {
    const det = eq.details || {};
    const tankH = det.tankH || h * 0.75;
    const legH = det.legH || (h - tankH);
    // Legs at the 4 corners
    const legSize = 0.5;
    const corners = [[x0, y0], [x1 - legSize, y0], [x0, y1 - legSize], [x1 - legSize, y1 - legSize]];
    for (const [cx, cy] of corners) {
      tris.box(cx, cx + legSize, cy, cy + legSize, 0, legH);
    }
    // Tank body
    tris.box(x0, x1, y0, y1, legH, legH + tankH);
    // Panel seams etched as small ridges on each face: divide each face into a 2×2 panel grid
    const ridgeH = 0.1;
    // Front face (-Y): 1 horizontal + 1 vertical ridge
    tris.box(x0, x1, y0 - ridgeH, y0, legH + tankH * 0.5 - 0.05, legH + tankH * 0.5 + 0.05);
    tris.box(-0.05, 0.05, y0 - ridgeH, y0, legH, legH + tankH);
    // Back face (+Y)
    tris.box(x0, x1, y1, y1 + ridgeH, legH + tankH * 0.5 - 0.05, legH + tankH * 0.5 + 0.05);
    tris.box(-0.05, 0.05, y1, y1 + ridgeH, legH, legH + tankH);
    // Small vent on top
    addCylinder(0, 0, 0.4, legH + tankH, legH + tankH + 0.5, 8);
  }
  
  else if (eq.shape === 'mushroom') {
    const det = eq.details || {};
    const stackR = det.stackRadius || 1.0;
    const stackH = det.stackHeight || h * 0.7;
    const capR = det.capRadius || stackR * 1.6;
    const capH = det.capHeight || (h - stackH);
    // Stack (vertical pipe)
    addCylinder(0, 0, stackR, 0, stackH, 12);
    // Cap (slightly conical, wider at the bottom rim)
    addCylinder(0, 0, capR, stackH, stackH + capH * 0.3, 12);
    addFrustum(0, 0, capR, capR * 0.6, stackH + capH * 0.3, stackH + capH, 12);
  }
  
  else if (eq.shape === 'cabinet_tall') {
    // Tall narrow box body
    tris.box(x0, x1, y0, y1, 0, h);
    const det = eq.details || {};
    // Door divider lines on the front face (-Y): horizontal ridge at half height
    const ridgeH = 0.1;
    tris.box(x0, x1, y0 - ridgeH, y0, h * 0.5 - 0.04, h * 0.5 + 0.04);
    // Door handle bumps
    tris.box(-0.2, 0.2, y0 - ridgeH * 1.5, y0, h * 0.4, h * 0.45);
    tris.box(-0.2, 0.2, y0 - ridgeH * 1.5, y0, h * 0.65, h * 0.7);
    // Top cap that slightly overhangs
    tris.box(x0 - 0.15, x1 + 0.15, y0 - 0.15, y1 + 0.15, h - 0.2, h);
  }
  
  else if (eq.shape === 'antenna') {
    const det = eq.details || {};
    const baseW = det.baseW || 2.7;
    const baseH = det.baseH || 1.0;
    const mastR = det.mastRadius || 0.3;
    const mastH = det.mastHeight || (h - baseH);
    // Base box
    tris.box(-baseW / 2, baseW / 2, -baseW / 2, baseW / 2, 0, baseH);
    // Mast
    addCylinder(0, 0, mastR, baseH, baseH + mastH, 8);
    // Tip cap
    addCylinder(0, 0, mastR * 1.3, baseH + mastH - 0.3, baseH + mastH, 6);
  }
  
  else {
    // Fallback: plain box
    tris.box(x0, x1, y0, y1, 0, h);
  }
  
  return tris;
}


/* Generate the 3D STL of the assembled building from the same plan/parts data 
   that drives the 2D SVGs. Returns a TriList. */
/**
 * Push a parallelogram prism (tilted slab) into a raw tris array.
 * p0–p3: outer-face corners, CCW from outside.  Inner face offset by thick.
 */
export function addSlantedSlab(triArr, p0, p1, p2, p3, thick) {
  const e1 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
  const e2 = [p3[0]-p0[0], p3[1]-p0[1], p3[2]-p0[2]];
  let nx = e1[1]*e2[2]-e1[2]*e2[1], ny = e1[2]*e2[0]-e1[0]*e2[2], nz = e1[0]*e2[1]-e1[1]*e2[0];
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  const q = [p0,p1,p2,p3].map(v => [v[0]-thick*nx, v[1]-thick*ny, v[2]-thick*nz]);
  triArr.push([p0,p1,p2],[p0,p2,p3]);
  triArr.push([q[0],q[3],q[2]],[q[0],q[2],q[1]]);
  triArr.push([p0,q[0],q[1]],[p0,q[1],p1]);
  triArr.push([p1,q[1],q[2]],[p1,q[2],p2]);
  triArr.push([p2,q[2],q[3]],[p2,q[3],p3]);
  triArr.push([p3,q[3],q[0]],[p3,q[0],p0]);
}

export function generateBuildingStl(cfg) {
  const plan = buildEdgePlans(cfg);
  const tris = new TriList();
  const matT = cfg.coreThickness;
  const cT = cfg.claddingThickness;
  const W = cfg.width;
  const D = cfg.depth;
  const H = cfg.height;
  const parapetH = cfg.parapetHeight;

  function visibleBayDoorPanelStl(op) {
    if (!op || op.type !== 'bay') return null;
    const styleKey = op.doorStyle || 'none';
    const style = BAY_DOOR_STYLES[styleKey];
    if (!style || styleKey === 'none') return null;
    const pct = Math.max(0, Math.min(100, Number(op.doorPercentOpen) || 0));
    if (pct >= 99.5) return null;
    const remain = 1 - pct / 100;
    if (style.direction === 'side') {
      const panelW = Math.max(0, Number(op.w || 0) * remain);
      if (panelW <= 0.2) return null;
      return { ...op, x: op.x, y: op.y, w: panelW, h: op.h, _bayDoorStyle: styleKey };
    }
    const panelH = Math.max(0, Number(op.h || 0) * remain);
    if (panelH <= 0.2) return null;
    return { ...op, y: op.y + op.h - panelH, w: op.w, h: panelH, _bayDoorStyle: styleKey };
  }

  function addBayDoorPanelToStl(face, op) {
    if (!op) return;
    const styleKey = op._bayDoorStyle || op.doorStyle || 'none';
    const style = BAY_DOOR_STYLES[styleKey];
    if (!style || styleKey === 'none') return;

    const doorT = Math.max(0.18, Math.min(0.5, cT || 0.28));
    const reliefT = Math.max(0.08, doorT * 0.55);
    const zTop = H - Number(op.y || 0);
    const zBot = H - (Number(op.y || 0) + Number(op.h || 0));
    const along0 = Number(op.x || 0);
    const along1 = along0 + Number(op.w || 0);

    function faceBox(a0, a1, zz0, zz1, proud) {
      const p = proud || 0;
      if (a1 <= a0 || zz1 <= zz0) return;
      if (face === 'front') tris.box(a0, a1, -cT - doorT - p, -cT - p, zz0, zz1);
      else if (face === 'back') tris.box(a0, a1, D + cT + p, D + cT + doorT + p, zz0, zz1);
      else if (face === 'east') tris.box(W + cT + p, W + cT + doorT + p, matT + a0, matT + a1, zz0, zz1);
      else if (face === 'west') tris.box(-cT - doorT - p, -cT - p, matT + a0, matT + a1, zz0, zz1);
    }

    faceBox(along0, along1, zBot, zTop, 0);

    function localRectToFaceBox(x, y, w0, h0, proud) {
      const a0 = along0 + Math.max(0, Number(x || 0));
      const a1 = along0 + Math.min(Number(op.w || 0), Number(x || 0) + Number(w0 || 0));
      const zz1 = zTop - Math.max(0, Number(y || 0));
      const zz0 = zTop - Math.min(Number(op.h || 0), Number(y || 0) + Number(h0 || 0));
      faceBox(a0, a1, zz0, zz1, proud);
    }

    const features = (typeof style.etchFn === 'function') ? style.etchFn(op.w || 1, op.h || 1) : [];
    const lineW = Math.max(0.10, Math.min(0.22, (op.h || 1) * 0.012));
    for (const f of features) {
      if (!f) continue;
      if (f.type === 'line') {
        const dx = Math.abs((f.x2 || 0) - (f.x1 || 0));
        const dy = Math.abs((f.y2 || 0) - (f.y1 || 0));
        if (dx >= dy) {
          const x = Math.min(f.x1, f.x2);
          const y = ((Number(f.y1 || 0) + Number(f.y2 || 0)) / 2) - lineW / 2;
          localRectToFaceBox(x, y, Math.max(0.15, dx), lineW, reliefT);
        } else {
          const x = ((Number(f.x1 || 0) + Number(f.x2 || 0)) / 2) - lineW / 2;
          const y = Math.min(f.y1, f.y2);
          localRectToFaceBox(x, y, lineW, Math.max(0.15, dy), reliefT);
        }
      } else if (f.type === 'rect') {
        localRectToFaceBox(f.x, f.y, f.w, f.h, reliefT);
      }
    }

    if (styleKey === 'roller' && !features.length) {
      const pitch = Math.max(0.65, Math.min(1.2, (op.h || 1) / 8));
      for (let y = pitch; y < (op.h || 0) - 0.1; y += pitch) {
        localRectToFaceBox(0.5, y - lineW / 2, Math.max(0.1, (op.w || 1) - 1), lineW, reliefT);
      }
    }
  }

  function addMainBayDoorPanelsToStl() {
    for (const face of ['front', 'back', 'east', 'west']) {
      const ops = get3DWallOpenings(cfg, plan, face)
        .filter(o => o.type === 'bay' && o.doorStyle && o.doorStyle !== 'none')
        .map(visibleBayDoorPanelStl)
        .filter(Boolean);
      for (const op of ops) addBayDoorPanelToStl(face, op);
    }
  }

  // ---- Floor (core) ----
  // Sits below the walls' bottom edges
  tris.box(0, W, 0, D, -matT, 0);
  
  // ---- Side walls (east and west) ----
  // West wall: X ∈ [0, matT], Y ∈ [matT, D - matT], Z ∈ [0, H]
  // East wall: X ∈ [W - matT, W], Y ∈ [matT, D - matT], Z ∈ [0, H]
  // Side walls have window cutouts (using slotYs for inter-floor exclusion is 
  // already done in computeWindows). We compute the same windows as the 2D code.
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);
  
  // West wall windows: in WALL-LOCAL frame the wall has x running 0..sideLen 
  // (Y in 3D), y running 0..H (Z in 3D, with y=0 = top so Z = H - y).
  function computeSideWallHoles(sideHasBay, sideLen, which) {
    // CRITICAL: when manual openings are present on this face, the 3D must
    // use them — not the auto layout. Otherwise the preview shows windows
    // and doors at positions that don't match what's actually been cut.
    const manual = manualStructuralOps(cfg, which);
    let wins = [];
    let doors = [];
    if (manual) {
      // Filter manual ops: only 'window' (opening + blanked variants cut
      // through; etched do NOT) and 'door' make holes. Awnings/fixtures/
      // overrides/printed don't cut the wall.
      for (const op of manual) {
        if (op.type === 'window') {
          const style = op.style ? WINDOW_STYLES[op.style] : null;
          const placement = (style && style.placement) || 'opening';
          if (placement === 'etched') continue;
          wins.push({ x: op.x, y: op.y, width: op.w, height: op.h, style: op.style });
        } else if (op.type === 'door') {
          doors.push({ x: op.x, y: op.y, width: op.w, height: op.h, style: op.style || cfg.doorStyle });
        }
      }
    } else {
      const doorH = (cfg.doorStyle && cfg.doorStyle !== 'none' && DOOR_STYLES[cfg.doorStyle]) ? DOOR_STYLES[cfg.doorStyle].height : 0;
      const sideDoorCount = cfg.sideDoorCount || 0;
      const doorReserveH = (sideDoorCount > 0) ? doorH + 3 : 0;
      wins = computeWindows(sideLen, H, {
        density: cfg.windowDensity, winDims: winDims,
        groundWinDims: groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: false, openingY: 0, openingH: 0,
        slotYs: plan.slotYs,
        floorCenterYs: plan.floorCenterYs,
        matT: matT,
        doorReserveH: doorReserveH,
        cfg, plan, edgeId: which,
      });
      doors = computeDoors(sideLen, H, {
        doorStyle: cfg.doorStyle, doorCount: sideDoorCount,
        hasOpening: false, bayXStart: 0, bayXEnd: 0,
        cfg, plan, edgeId: which,
      });
    }
    // Convert to {u0, u1, v0, v1} where u=Y in 3D, v=Z in 3D
    const holes = [];
    for (const w of wins) {
      // wall y=0 is top → Z = H - y. wall x=0 is the wall start (which corresponds 
      // to Y=matT in 3D for the west wall, growing toward Y=D-matT)
      holes.push({
        u0: matT + w.x, u1: matT + w.x + w.width,
        v0: H - (w.y + w.height), v1: H - w.y,
      });
    }
    for (const d of doors) {
      // Both solid and glass doors cut through the wall in 3D — the
      // difference (glass slot vs cladding-only insert) is a fabrication
      // detail, not a 3D-render distinction.
      holes.push({
        u0: matT + d.x, u1: matT + d.x + d.width,
        v0: H - (d.y + d.height), v1: H - d.y,
      });
    }
    return holes;
  }
  
  const sideHasBay = plan.hasFrontBay || plan.hasBackBay;

  // Pre-compute wing connection slots so the main-block walls get the matching
  // slots cut through them (the holes the wing wall-tabs pass through).
  const wingSlots = { east: [], west: [], front: [], back: [] };
  for (const wing of (cfg.wings || [])) {
    const wH   = wingHeight(cfg, wing);
    const off  = wing.offset;
    const wW   = wing.span;
    if (wing.face === 'east' || wing.face === 'west') {
      // Slot in the side wall: u = Y, v = Z (clipped to wall span [matT, D-matT])
      wingSlots[wing.face].push({
        u0: Math.max(matT, off), u1: Math.min(D - matT, off + wW),
        v0: 0, v1: Math.min(wH, H),
      });
    } else {
      // Slot in the front/back wall: u = X, v = Z (clipped to [matT, W-matT])
      wingSlots[wing.face].push({
        u0: Math.max(matT, off), u1: Math.min(W - matT, off + wW),
        v0: 0, v1: Math.min(wH, H),
      });
    }
  }

  const westHoles = computeSideWallHoles(sideHasBay, plan.sideLen, 'west');
  const eastHoles = computeSideWallHoles(sideHasBay, plan.sideLen, 'east');
  // West wall: orientation 'X', n = X range, u = Y, v = Z
  tris.wallWithHoles('X', matT, D - matT, 0, H, 0, matT, [...westHoles, ...wingSlots.west]);
  // East wall: same Y/Z range, X range = [W-matT, W]
  tris.wallWithHoles('X', matT, D - matT, 0, H, W - matT, W, [...eastHoles, ...wingSlots.east]);
  
  // ---- Front and back walls ----
  // Front wall: Y ∈ [0, matT], X ∈ [0, W], Z ∈ [0, H]
  // Back wall: Y ∈ [D - matT, D], X ∈ [0, W], Z ∈ [0, H]
  function computeFbWallHoles(which) {
    const hasBay = (which === 'front' && plan.hasFrontBay) || (which === 'back' && plan.hasBackBay);
    // CRITICAL: manual openings take precedence over the auto layout. If
    // the user has placed windows/doors via the editor, those are the
    // ground-truth list of holes for this wall.
    const manual = manualStructuralOps(cfg, which);
    const holes = [];
    if (manual) {
      for (const op of manual) {
        if (op.type === 'window') {
          const style = op.style ? WINDOW_STYLES[op.style] : null;
          const placement = (style && style.placement) || 'opening';
          if (placement === 'etched') continue;  // no hole — etched outline only
          holes.push({
            u0: op.x, u1: op.x + op.w,
            v0: H - (op.y + op.h), v1: H - op.y,
          });
        } else if (op.type === 'door') {
          // All doors cut through in the 3D preview, regardless of glass.
          holes.push({
            u0: op.x, u1: op.x + op.w,
            v0: H - (op.y + op.h), v1: H - op.y,
          });
        }
      }
    } else {
      const fbDoorCount = (which === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
      const doorH = (cfg.doorStyle && cfg.doorStyle !== 'none' && DOOR_STYLES[cfg.doorStyle]) ? DOOR_STYLES[cfg.doorStyle].height : 0;
      const doorReserveH = (fbDoorCount > 0 && !hasBay) ? doorH + 3 : 0;
      const bayH = plan.bayHeight || 0;
      const slotYsForThisWall = hasBay
        ? (plan.slotYs || []).filter(y => y < (H - bayH) - 1)
        : (plan.slotYs || []);
      const floorCenterYsForThisWall = hasBay
        ? (plan.floorCenterYs || []).filter(y => y < (H - bayH) - 1)
        : (plan.floorCenterYs || []);
      const allWins = computeWindows(plan.fbWidth, H, {
        density: cfg.windowDensity, winDims: winDims,
        groundWinDims: groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: hasBay, openingY: H - bayH, openingH: bayH,
        slotYs: slotYsForThisWall,
        floorCenterYs: floorCenterYsForThisWall,
        matT: matT,
        doorReserveH: doorReserveH,
        cfg, plan, edgeId: which,
      });
      for (const w of allWins) {
        holes.push({
          u0: w.x, u1: w.x + w.width,
          v0: H - (w.y + w.height), v1: H - w.y,
        });
      }
      if (!hasBay) {
        const doors = computeDoors(plan.fbWidth, H, {
          doorStyle: cfg.doorStyle, doorCount: fbDoorCount,
          hasOpening: false, bayXStart: 0, bayXEnd: 0,
          cfg, plan, edgeId: which,
        });
        for (const d of doors) {
          holes.push({
            u0: d.x, u1: d.x + d.width,
            v0: H - (d.y + d.height), v1: H - d.y,
          });
        }
      }
    }
    // Bay opening always added (independent of manual/auto for non-bay openings)
    if (hasBay) {
      holes.push({
        u0: plan.bayXStart, u1: plan.bayXEnd,
        v0: 0, v1: plan.bayHeight || 0,
      });
    }
    // Recess opening: when recess mode is enabled, the front wall has a
    // full-width hole in its lower band exposing the recessed first-floor wall behind.
    if (which === 'front' && cfg.groundFloorOffsetEnabled && (plan.groundFloorOffset || 0) < -0.5) {
      // Leave a small frame margin on each side so the upper-floor wall is supported
      const recessFrame = 4;  // mm of wall material left as columns on each side
      holes.push({
        u0: recessFrame, u1: plan.fbWidth - recessFrame,
        v0: 0, v1: plan.firstFloorHeight,
      });
    }
    return holes;
  }
  
  const frontHoles = computeFbWallHoles('front');
  const backHoles = computeFbWallHoles('back');
  // Front wall: orientation 'Y', n = Y range, u = X, v = Z
  tris.wallWithHoles('Y', 0, W, 0, H, 0, matT, [...frontHoles, ...wingSlots.front]);
  tris.wallWithHoles('Y', 0, W, 0, H, D - matT, D, [...backHoles, ...wingSlots.back]);
  
  // ---- Cladding (each wall has a 0.28mm layer on the outer face) ----
  // Cladding extends past the wall by cT on the side edges, and by cT at top/bottom.
  // Front cladding: Y ∈ [-cT, 0], X ∈ [-cT, W + cT], Z ∈ [-cT, H + cT]
  // For visualization, we don't need to model the cladding-stops-at-parapet detail.
  // Use the same hole list as the wall, shifted to cladding coords.
  // Front cladding: Z ∈ [-cT, H + cT]   (extends cT below floor and cT above wall top)
  //   But for parapet roof, cladding should also stop at the wall top to expose the parapet.
  // Simplification: cladding spans Z ∈ [0, H] (matches wall body), no cT extra at top/bottom.
  //   This is "good enough" for visualization. Real builds vary.
  tris.wallWithHoles('Y', -cT, W + cT, 0, H, -cT, 0, frontHoles);
  tris.wallWithHoles('Y', -cT, W + cT, 0, H, D, D + cT, backHoles);
  // Side cladding: X ∈ [-cT, 0] (west) and [W, W + cT] (east). Y ∈ [0, D] (extends cT past front+back ends? no, sits between them)
  // Following the 2D convention: side cladding sits BETWEEN front+back cladding overhangs (Y range [matT, D-matT]).
  // But for visualization we want continuous coverage at corners. The front/back cladding extends past, so we want the side cladding to fill the gap.
  // Side cladding actually sits at Y ∈ [0, D] with X ∈ [-cT, 0] but inset cT from the front/back cladding: so Y ∈ [cT, D - cT]? No wait.
  // 2D: front cladding is W + 2cT wide, side cladding is depth - 2cT wide. So side cladding spans Y ∈ [cT, D - cT] in 3D.
  tris.wallWithHoles('X', cT, D - cT, 0, H, -cT, 0, westHoles);
  tris.wallWithHoles('X', cT, D - cT, 0, H, W, W + cT, eastHoles);

  // Add BAY_DOOR_STYLES panels/slats to the generated STL preview/export so
  // rolling shutters do not appear as huge stretched regular doors.
  addMainBayDoorPanelsToStl();
  
  // ---- Roof ----
  if (cfg.roofStyle === 'parapet') {
    // Recessed roof, sits at Z = H - parapetH - matT to H - parapetH
    tris.box(matT, W - matT, matT, D - matT, H - parapetH - matT, H - parapetH);
  } else if (cfg.roofStyle === 'flat') {
    // Sits on top of walls, Z ∈ [H, H + matT]
    tris.box(0, W, 0, D, H, H + matT);
  } else if (cfg.roofStyle === 'flat_overhang') {
    // Same as flat but extends past each wall by `O` mm on all sides
    const O = Math.max(0, cfg.roofOverhang || 5);
    tris.box(-O, W + O, -O, D + O, H, H + matT);
  } else if (cfg.roofStyle === 'slanted') {
    const pitch = cfg.roofPitch || 10;
    const slopeDir = cfg.roofSlopeDirection || 'back';
    const ohFB = cfg.roofOverhangFB || 0;
    const ohEW = cfg.roofOverhangEW || 0;
    // Slope rate: rise per unit horizontal distance
    const slopeRateX = pitch / W;   // for EW-axis slopes
    const slopeRateY = pitch / D;   // for NS-axis slopes
    let p0, p1, p2, p3;
    if (slopeDir === 'front') {
      // High = south (y=0), low = north (y=D)
      p0=[-ohEW, -ohFB, H+pitch+ohFB*slopeRateY]; p1=[W+ohEW, -ohFB, H+pitch+ohFB*slopeRateY];
      p2=[W+ohEW, D+ohFB, H-ohFB*slopeRateY];     p3=[-ohEW, D+ohFB, H-ohFB*slopeRateY];
    } else if (slopeDir === 'back') {
      // High = north (y=D), low = south (y=0)
      p0=[-ohEW, -ohFB, H-ohFB*slopeRateY];     p1=[W+ohEW, -ohFB, H-ohFB*slopeRateY];
      p2=[W+ohEW, D+ohFB, H+pitch+ohFB*slopeRateY]; p3=[-ohEW, D+ohFB, H+pitch+ohFB*slopeRateY];
    } else if (slopeDir === 'east') {
      // High = east (x=W), low = west (x=0)
      p0=[-ohEW, -ohFB, H-ohEW*slopeRateX];     p1=[W+ohEW, -ohFB, H+pitch+ohEW*slopeRateX];
      p2=[W+ohEW, D+ohFB, H+pitch+ohEW*slopeRateX]; p3=[-ohEW, D+ohFB, H-ohEW*slopeRateX];
    } else {
      // High = west (x=0), low = east (x=W)
      p0=[-ohEW, -ohFB, H+pitch+ohEW*slopeRateX]; p1=[W+ohEW, -ohFB, H-ohEW*slopeRateX];
      p2=[W+ohEW, D+ohFB, H-ohEW*slopeRateX];     p3=[-ohEW, D+ohFB, H+pitch+ohEW*slopeRateX];
    }
    addSlantedSlab(tris.tris, p0, p1, p2, p3, matT);
  } else if (cfg.roofStyle === 'gabled') {
    const pitch = cfg.roofPitch || 10;
    const ohFB = cfg.roofOverhangFB || 0;
    const ohEW = cfg.roofOverhangEW || 0;
    const ewR = (cfg.roofRidgeDirection || 'ew') === 'ew';
    if (ewR) {
      // EW ridge: eave = front/back (ohFB), verge = east/west (ohEW)
      // Front slope: low eave at y=-ohFB, ridge at y=D/2 (immovable)
      const slopeRateEW = pitch / (D / 2);
      addSlantedSlab(tris.tris,
        [-ohEW, -ohFB, H - ohFB*slopeRateEW], [W+ohEW, -ohFB, H - ohFB*slopeRateEW],
        [W+ohEW, D/2, H+pitch],               [-ohEW, D/2, H+pitch], matT);
      // Back slope: ridge at y=D/2, low eave at y=D+ohFB
      addSlantedSlab(tris.tris,
        [W+ohEW, D/2, H+pitch], [-ohEW, D/2, H+pitch],
        [-ohEW, D+ohFB, H - ohFB*slopeRateEW], [W+ohEW, D+ohFB, H - ohFB*slopeRateEW], matT);
    } else {
      // NS ridge: eave = east/west (ohEW), verge = front/back (ohFB)
      const slopeRateNS = pitch / (W / 2);
      // West slope: low eave at x=-ohEW, ridge at x=W/2
      addSlantedSlab(tris.tris,
        [-ohEW, D+ohFB, H - ohEW*slopeRateNS], [-ohEW, -ohFB, H - ohEW*slopeRateNS],
        [W/2, -ohFB, H+pitch],                  [W/2, D+ohFB, H+pitch], matT);
      // East slope: ridge at x=W/2, low eave at x=W+ohEW
      addSlantedSlab(tris.tris,
        [W/2, -ohFB, H+pitch],                  [W/2, D+ohFB, H+pitch],
        [W+ohEW, D+ohFB, H - ohEW*slopeRateNS], [W+ohEW, -ohFB, H - ohEW*slopeRateNS], matT);
    }
  } else {
    tris.box(0, W, 0, D, H, H + matT);   // unknown style — flat cap
  }

  // Cladding roof (if present)
  if (cfg.roofStyle !== 'gabled') {
    if (cfg.roofStyle === 'parapet') {
      tris.box(matT, W - matT, matT, D - matT, H - parapetH, H - parapetH + cT);
    } else {
      tris.box(-cT, W + cT, -cT, D + cT, H + matT, H + matT + cT);
    }
  }
  
  // ---- Bay ceiling ----
  if (plan.hasFrontBay || plan.hasBackBay) {
    const bcZ = H - (plan.bayHeight || 0);
    tris.box(matT, W - matT, matT, D - matT, bcZ, bcZ + matT);
  }
  
  // ---- Inter-floor panels ----
  // Each panel sits at Z = H - interFloorY (interFloorY measured from top in wall coords)
  for (const fy of plan.interFloorYs) {
    const z = H - fy;  // since fy is Y from wall TOP, the panel Z = H - fy
    tris.box(matT, W - matT, matT, D - matT, z - matT/2, z + matT/2);
  }
  
  // ---- Trim strips (top/bottom horizontal bands) ----
  if (cfg.trimTop || cfg.trimBottom || cfg.trimBelt) {
    const trimH = cfg.trimHeight || 2;
    const overhang = (cfg.trimOverhang != null) ? cfg.trimOverhang : cT;
    // Trim sits one cT IN FRONT of the cladding (further out)
    // Front trim: at Y ∈ [-cT - cT, -cT] (one trim-thickness in front of the front cladding)
    // X range: front cladding is X ∈ [-cT, W + cT], trim adds overhang on each side: [-cT - overhang, W + cT + overhang]
    const trimTopZRange = cfg.trimTop ? [H - trimH, H] : null;
    const trimBotZRange = cfg.trimBottom ? [0, trimH] : null;
    // Belt course: centred on the floor boundary. plan.firstFloorHeight gives
    // the GROUND-floor height; the boundary in world-Z is at z = firstFloorHeight.
    const beltZ = (plan.firstFloorHeight && plan.firstFloorHeight > 0)
      ? plan.firstFloorHeight
      : (H / 2);
    const trimBeltZRange = cfg.trimBelt ? [beltZ - trimH / 2, beltZ + trimH / 2] : null;
    const ranges = [trimTopZRange, trimBeltZRange, trimBotZRange].filter(Boolean);
    for (const [z0, z1] of ranges) {
      // Front trim
      tris.box(-cT - overhang, W + cT + overhang, -cT - cT, -cT, z0, z1);
      // Back trim
      tris.box(-cT - overhang, W + cT + overhang, D + cT, D + cT + cT, z0, z1);
      // West trim (Y range matches side cladding span [cT, D-cT], no overhang since F/B trim covers corners)
      tris.box(-cT - cT, -cT, cT, D - cT, z0, z1);
      // East trim
      tris.box(W + cT, W + cT + cT, cT, D - cT, z0, z1);
    }
  }
  
  // ---- Ground-floor depth offset sub-assembly ----
  if (cfg.groundFloorOffsetEnabled && Math.abs(plan.groundFloorOffset || 0) >= 0.5) {
    const offset = plan.groundFloorOffset;
    const firstH = plan.firstFloorHeight;
    if (offset > 0) {
      // EXTENSION: small box projecting forward of the building's front face.
      // Front of main building is at Y=0. Extension extends from Y = -offset to Y = 0.
      // Box dimensions: width × offset × firstH. Walls are matT thick.
      // 
      // Outer (front) wall: at Y = -offset to Y = -offset + matT, full width, full height
      tris.box(0, W, -offset, -offset + matT, 0, firstH);
      // East side wall: X = W-matT to W, Y = -offset+matT to 0, height 0 to firstH
      tris.box(W - matT, W, -offset + matT, 0, 0, firstH);
      // West side wall: X = 0 to matT, Y = -offset+matT to 0, height 0 to firstH
      tris.box(0, matT, -offset + matT, 0, 0, firstH);
      // Roof / shelf: covers full extension footprint, sitting at Z = firstH to firstH + matT
      tris.box(0, W, -offset, 0, firstH, firstH + matT);
      // Cladding (one cT layer outside each face)
      // Outer cladding: Y = -offset - cT to -offset
      tris.box(-cT, W + cT, -offset - cT, -offset, -cT, firstH + cT);
      // East/West side cladding
      tris.box(W, W + cT, -offset, 0, -cT, firstH + cT);
      tris.box(-cT, 0, -offset, 0, -cT, firstH + cT);
      // Top cladding (sits on top of the shelf)
      tris.box(-cT, W + cT, -offset - cT, 0, firstH + matT, firstH + matT + cT);
    } else {
      // RECESS: the upper floors overhang past the first floor's front face. 
      // The first-floor front wall is set BACK (recessed) by |offset|.
      // The user is expected to cut a hole in the main building's front wall to 
      // expose this recess. The recess "sub-assembly" lives INSIDE the building.
      //
      // For STL preview: model the recess as a void at the front-bottom of the 
      // building. We represent this by adding an "alcove" of geometry inside.
      const off = -offset;  // |offset|
      // Recessed inner wall: at Y = off to Y = off + matT, full width, height 0 to firstH
      tris.box(0, W, off, off + matT, 0, firstH);
      // Two recess side walls: short walls running from the main front (Y=0) 
      // back to the recessed wall (Y=off). They're MAIN-WALL thickness.
      tris.box(W - matT, W, 0, off, 0, firstH);
      tris.box(0, matT, 0, off, 0, firstH);
      // Recess ceiling: Z = firstH to firstH + matT, X = 0 to W, Y = 0 to off
      tris.box(0, W, 0, off, firstH, firstH + matT);
      // Note: the main front wall of the building should have a HOLE here. We can 
      // represent this in the visual by NOT drawing the front wall in this region, 
      // but the wall is computed independently. This means the STL preview will 
      // show both the main front wall AND the recessed wall — overlapping. The 
      // user should cut the hole physically. 
      // To make the preview look right, we'd ideally subtract a hole from the 
      // main front wall. For now: leave it. The recess geometry exists but the 
      // main front wall obscures it from view.
    }
  }
  
  // ---- Rooftop mechanical room ----
  // The mech room sits on top of the building's roof. Its base z = main roof's top.
  // For parapet roof: roof top at z = H - parapetH (recessed below the wall top).
  //   Mech room base sits ON top of the roof at z = H - parapetH + matT (above the roof body).
  // For flat roof: roof top at z = H + matT.
  // For consistency, the mech room is just a small box positioned at the user-set offset.
  if (plan.mechRoom) {
    const mr = plan.mechRoom;
    let baseZ;
    if (cfg.roofStyle === 'parapet') {
      baseZ = H - parapetH;  // top of recessed roof = base of mech room
    } else {
      baseZ = H + matT;  // top of flat roof
    }
    // mr.x, mr.y are in roof-local coords. For parapet roof, that's already inset 
    // by matT from the building edge (roof body sits inset by matT). For flat roof, 
    // roof is at full footprint (no inset). Convert to absolute building coords:
    let absX, absY;
    if (cfg.roofStyle === 'parapet') {
      absX = matT + mr.x;
      absY = matT + mr.y;
    } else {
      absX = mr.x;
      absY = mr.y;
    }
    // Mech room walls (4 vertical slabs)
    tris.box(absX, absX + matT, absY, absY + mr.d, baseZ, baseZ + mr.h);  // west
    tris.box(absX + mr.w - matT, absX + mr.w, absY, absY + mr.d, baseZ, baseZ + mr.h);  // east
    tris.box(absX, absX + mr.w, absY, absY + matT, baseZ, baseZ + mr.h);  // front (north of mech room? Y=0 is front)
    tris.box(absX, absX + mr.w, absY + mr.d - matT, absY + mr.d, baseZ, baseZ + mr.h);  // back
    // Mech room roof
    tris.box(absX, absX + mr.w, absY, absY + mr.d, baseZ + mr.h, baseZ + mr.h + matT);
    // Cladding (one cT outside each face)
    tris.box(absX - cT, absX, absY - cT, absY + mr.d + cT, baseZ, baseZ + mr.h);  // west clad
    tris.box(absX + mr.w, absX + mr.w + cT, absY - cT, absY + mr.d + cT, baseZ, baseZ + mr.h);  // east clad
    tris.box(absX, absX + mr.w, absY - cT, absY, baseZ, baseZ + mr.h);  // front clad
    tris.box(absX, absX + mr.w, absY + mr.d, absY + mr.d + cT, baseZ, baseZ + mr.h);  // back clad
  }
  
  // ---- Rooftop equipment outlines visualized ----
  // For each placed equipment item, add a simple box at its footprint sitting on the roof.
  // Use the equipment's actual height for visual fidelity.
  if (plan.rooftopEquipPlacements && plan.rooftopEquipPlacements.length > 0) {
    let baseZ;
    if (cfg.roofStyle === 'parapet') {
      baseZ = H - parapetH + matT + cT;  // top of cladding on recessed roof
    } else {
      baseZ = H + matT + cT;
    }
    for (const p of plan.rooftopEquipPlacements) {
      let absX, absY;
      if (cfg.roofStyle === 'parapet') {
        absX = matT + p.x;
        absY = matT + p.y;
      } else {
        absX = p.x;
        absY = p.y;
      }
      // Simple box visualization; exact STL shape is in the per-item STLs.
      tris.box(absX, absX + p.w, absY, absY + p.d, baseZ, baseZ + p.eq.h);
    }
  }
  
  // ---- Wings ----
  for (const wing of (cfg.wings || [])) {
    const wH   = wingHeight(cfg, wing);
    const wD   = wing.depth;
    const wW   = wing.span;
    const off  = wing.offset;
    const wCfg = buildWingCfg(cfg, wing);
    const wPlan = buildEdgePlans(wCfg);

    const wWinDims  = getWindowDims(wCfg);
    const wGWinDims = getGroundFloorWindowDims(wCfg);
    const baseOpts  = {
      density: wCfg.windowDensity,
      groundFloorCenterY: wPlan.groundFloorCenterY,
      hasOpening: false, openingY: 0, openingH: 0,
      slotYs: wPlan.slotYs, floorCenterYs: wPlan.floorCenterYs,
      matT, doorReserveH: 0,
    };
    // Per-face opening list. Manual openings take precedence over auto
    // computation; the 3D should always show what was actually cut.
    function wingOpsForFace(faceKey, wallLen) {
      const manual = manualStructuralOps(wCfg, faceKey);
      const wins = [], doors = [];
      if (manual) {
        for (const op of manual) {
          if (op.type === 'window') {
            const style = op.style ? WINDOW_STYLES[op.style] : null;
            const placement = (style && style.placement) || 'opening';
            if (placement === 'etched') continue;
            wins.push({ x: op.x, y: op.y, width: op.w, height: op.h });
          } else if (op.type === 'door') {
            doors.push({ x: op.x, y: op.y, width: op.w, height: op.h });
          }
        }
      } else {
        const auto = computeWindows(wallLen, wH, { ...baseOpts, winDims: wWinDims, groundWinDims: wGWinDims, cfg: wCfg, plan: wPlan, edgeId: faceKey });
        for (const w of auto) wins.push(w);
      }
      return { wins, doors };
    }
    const wingOuter = wingOpsForFace(wing.face, wW);
    // For wing side walls, fall back to a single set of side windows (wing
    // side walls share a layout in the auto path; for manual we pick one).
    const sideKey = (wing.face === 'east' || wing.face === 'west') ? 'front' : 'east';
    const wingSide = wingOpsForFace(sideKey, wD - 2 * matT);
    const outerWins = wingOuter.wins;
    const outerDoors = wingOuter.doors;
    const sideWins = wingSide.wins;

    const oW = (base, wins) => wins.map(w => ({
      u0: base + w.x, u1: base + w.x + w.width,
      v0: wH - (w.y + w.height), v1: wH - w.y,
    }));
    const oWithDoors = (base, wins, doors) => {
      const all = oW(base, wins);
      for (const d of doors) all.push({
        u0: base + d.x, u1: base + d.x + d.width,
        v0: wH - (d.y + d.height), v1: wH - d.y,
      });
      return all;
    };
    const sW = (base) => sideWins.map(w => ({
      u0: base + matT + w.x, u1: base + matT + w.x + w.width,
      v0: wH - (w.y + w.height), v1: wH - w.y,
    }));

    const cop = wingCoplanarCheck(wing, W, D);

    switch (wing.face) {
      case 'east': {
        const x0 = W, x1 = W + wD, y0 = off, y1 = off + wW;
        const oh = oWithDoors(y0, outerWins, outerDoors);
        tris.wallWithHoles('X', y0, y1, 0, wH, x1-matT, x1, oh);
        tris.wallWithHoles('X', y0-cT, y1+cT, 0, wH, x1, x1+cT, oh);
        // Parallel faces — skip when coplanar with main block walls (would create z-fighting)
        if (!cop.westCoplanar) {
          const h = sW(x0); tris.wallWithHoles('Y', x0, x1, 0, wH, y0, y0+matT, h); tris.wallWithHoles('Y', x0, x1, 0, wH, y0-cT, y0, h);
        }
        if (!cop.eastCoplanar) {
          const h = sW(x0); tris.wallWithHoles('Y', x0, x1, 0, wH, y1-matT, y1, h); tris.wallWithHoles('Y', x0, x1, 0, wH, y1, y1+cT, h);
        }
        // Connection tab spans slot in main east wall (x0-matT to x0+matT)
        tris.wallWithHoles('X', y0, y1, 0, wH, x0-matT, x0+matT, []);
        tris.box(x0, x1, y0, y1, -matT, 0);
        tris.box(x0, x1, y0, y1, wH, wH+matT);
        tris.box(x0-cT, x1+cT, y0-cT, y1+cT, wH+matT, wH+matT+cT);
        break;
      }
      case 'west': {
        const x0 = -wD, x1 = 0, y0 = off, y1 = off + wW;
        const oh = oWithDoors(y0, outerWins, outerDoors);
        tris.wallWithHoles('X', y0, y1, 0, wH, x0, x0+matT, oh);
        tris.wallWithHoles('X', y0-cT, y1+cT, 0, wH, x0-cT, x0, oh);
        if (!cop.westCoplanar) {
          const h = sW(x0); tris.wallWithHoles('Y', x0, x1, 0, wH, y0, y0+matT, h); tris.wallWithHoles('Y', x0, x1, 0, wH, y0-cT, y0, h);
        }
        if (!cop.eastCoplanar) {
          const h = sW(x0); tris.wallWithHoles('Y', x0, x1, 0, wH, y1-matT, y1, h); tris.wallWithHoles('Y', x0, x1, 0, wH, y1, y1+cT, h);
        }
        tris.wallWithHoles('X', y0, y1, 0, wH, x1-matT, x1+matT, []);
        tris.box(x0, x1, y0, y1, -matT, 0);
        tris.box(x0, x1, y0, y1, wH, wH+matT);
        tris.box(x0-cT, x1+cT, y0-cT, y1+cT, wH+matT, wH+matT+cT);
        break;
      }
      case 'front': {
        const y0 = -wD, y1 = 0, x0 = off, x1 = off + wW;
        const oh = oWithDoors(x0, outerWins, outerDoors);
        tris.wallWithHoles('Y', x0, x1, 0, wH, y0, y0+matT, oh);
        tris.wallWithHoles('Y', x0-cT, x1+cT, 0, wH, y0-cT, y0, oh);
        if (!cop.westCoplanar) {
          const h = sW(y0); tris.wallWithHoles('X', y0, y1, 0, wH, x0, x0+matT, h); tris.wallWithHoles('X', y0, y1, 0, wH, x0-cT, x0, h);
        }
        if (!cop.eastCoplanar) {
          const h = sW(y0); tris.wallWithHoles('X', y0, y1, 0, wH, x1-matT, x1, h); tris.wallWithHoles('X', y0, y1, 0, wH, x1, x1+cT, h);
        }
        tris.wallWithHoles('Y', x0, x1, 0, wH, y1-matT, y1+matT, []);
        tris.box(x0, x1, y0, y1, -matT, 0);
        tris.box(x0, x1, y0, y1, wH, wH+matT);
        tris.box(x0-cT, x1+cT, y0-cT, y1+cT, wH+matT, wH+matT+cT);
        break;
      }
      case 'back': {
        const y0 = D, y1 = D + wD, x0 = off, x1 = off + wW;
        const oh = oWithDoors(x0, outerWins, outerDoors);
        tris.wallWithHoles('Y', x0, x1, 0, wH, y1-matT, y1, oh);
        tris.wallWithHoles('Y', x0-cT, x1+cT, 0, wH, y1, y1+cT, oh);
        if (!cop.westCoplanar) {
          const h = sW(y0); tris.wallWithHoles('X', y0, y1, 0, wH, x0, x0+matT, h); tris.wallWithHoles('X', y0, y1, 0, wH, x0-cT, x0, h);
        }
        if (!cop.eastCoplanar) {
          const h = sW(y0); tris.wallWithHoles('X', y0, y1, 0, wH, x1-matT, x1, h); tris.wallWithHoles('X', y0, y1, 0, wH, x1, x1+cT, h);
        }
        tris.wallWithHoles('Y', x0, x1, 0, wH, y0-matT, y0+matT, []);
        tris.box(x0, x1, y0, y1, -matT, 0);
        tris.box(x0, x1, y0, y1, wH, wH+matT);
        tris.box(x0-cT, x1+cT, y0-cT, y1+cT, wH+matT, wH+matT+cT);
        break;
      }
    }
  }

  return tris;
}

async function exportStl() {
  readForm();
  const tris = generateBuildingStl(CONFIG);
  const buf = tris.toBinaryStl();
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `building_${CONFIG.buildingType}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.stl`;
  a.click();
  URL.revokeObjectURL(a.href);
  flashMessage(`STL exported (${tris.tris.length} triangles)`, 'ok');
}

/* Persistent storage — uses browser localStorage so it works in any browser, 
   not just the artifact sandbox. */
export const STORAGE_KEY = 'n_scale_building_generator_config';

export function savePreset() {
  try {
    upgradeConfigToCurrentStorage(CONFIG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
    flashMessage('Preset saved to browser cache.', 'ok');
  } catch (e) {
    flashMessage('Save failed: ' + e.message, 'err');
  }
}

export function loadPreset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const warnings = applyLoadedConfig(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
      writeForm();
      regenerate();
      if (warnings.length) {
        flashMessage('Loaded with warnings: ' + warnings.join(' '), 'warn');
      } else {
        flashMessage('Preset loaded from browser cache.', 'ok');
      }
    } else {
      flashMessage('No saved preset found.', 'warn');
    }
  } catch (e) {
    flashMessage('Load failed: ' + e.message, 'err');
  }
}

export function clearPreset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    flashMessage('Browser cache cleared.', 'ok');
  } catch (e) {
    flashMessage('Clear failed: ' + e.message, 'err');
  }
}

/* Export current config as a downloadable .hako file (JSON inside) */
export function exportConfigFile() {
  readForm();
  upgradeConfigToCurrentStorage(CONFIG);
  const json = JSON.stringify(serializableCurrentConfig(CONFIG), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const typeName = CONFIG.buildingType || 'building';
  a.download = `building_${typeName}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.hako`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  flashMessage('Settings file downloaded.', 'ok');
}

let importProgressCloseTimer = null;
let importProgressLastFocus = null;

function ensureImportProgressModal() {
  let modal = document.getElementById('hakoImportProgressModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'hakoImportProgressModal';
  modal.className = 'hakoProgressModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'hakoImportProgressTitle');
  modal.innerHTML = `
    <div class="hakoProgressCard" tabindex="-1">
      <h2 id="hakoImportProgressTitle">Import file</h2>
      <div id="hakoImportProgress" class="hakoProgress" role="progressbar" aria-label="Import progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="hakoProgressTrack"><div id="hakoImportProgressFill" class="hakoProgressFill"></div></div>
        <div class="hakoProgressSummary"><b id="hakoImportProgressLabel">Preparing import...</b><span id="hakoImportProgressPercent">0%</span></div>
        <div id="hakoImportProgressDetail" class="hakoProgressDetail" aria-live="polite">Waiting for the selected file.</div>
      </div>
      <div class="hakoProgressActions"><button type="button" id="hakoImportProgressClose">Close</button></div>
    </div>`;
  const close = () => closeImportProgressModal();
  modal.addEventListener('click', event => {
    if (event.target === modal && modal.dataset.locked !== 'true') close();
  });
  modal.querySelector('#hakoImportProgressClose')?.addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open') && modal.dataset.locked !== 'true') close();
  });
  document.body.appendChild(modal);
  return modal;
}

function openImportProgressModal(title = 'Import file', label = 'Preparing import...', detail = 'Waiting for the selected file.') {
  const modal = ensureImportProgressModal();
  if (importProgressCloseTimer) {
    clearTimeout(importProgressCloseTimer);
    importProgressCloseTimer = null;
  }
  importProgressLastFocus = document.activeElement;
  modal.dataset.locked = 'true';
  document.getElementById('hakoImportProgressTitle').textContent = title;
  document.getElementById('hakoImportProgressClose').style.display = 'none';
  modal.classList.add('open');
  setImportProgress(0, 4, label, detail);
  modal.querySelector('.hakoProgressCard')?.focus?.();
  return modal;
}

function setImportProgress(step, total, label, detail) {
  const safeTotal = Math.max(1, total || 1);
  const percent = Math.max(0, Math.min(100, Math.round((Math.max(0, step || 0) / safeTotal) * 100)));
  const progress = document.getElementById('hakoImportProgress');
  if (progress) progress.setAttribute('aria-valuenow', String(percent));
  const fill = document.getElementById('hakoImportProgressFill');
  if (fill) fill.style.width = percent + '%';
  const pct = document.getElementById('hakoImportProgressPercent');
  if (pct) pct.textContent = percent + '%';
  const labelEl = document.getElementById('hakoImportProgressLabel');
  if (labelEl) labelEl.textContent = label || 'Working...';
  const detailEl = document.getElementById('hakoImportProgressDetail');
  if (detailEl) detailEl.textContent = detail || '';
}

function closeImportProgressModal() {
  const modal = document.getElementById('hakoImportProgressModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.dataset.locked = 'false';
  if (importProgressCloseTimer) {
    clearTimeout(importProgressCloseTimer);
    importProgressCloseTimer = null;
  }
  importProgressLastFocus?.focus?.();
  importProgressLastFocus = null;
}

function finishImportProgress(label, detail, delay = 900) {
  const modal = ensureImportProgressModal();
  modal.dataset.locked = 'false';
  setImportProgress(4, 4, label || 'Import complete.', detail || 'The file has been applied.');
  document.getElementById('hakoImportProgressClose').style.display = '';
  importProgressCloseTimer = setTimeout(() => closeImportProgressModal(), delay);
}

function failImportProgress(label, detail) {
  const modal = ensureImportProgressModal();
  if (importProgressCloseTimer) {
    clearTimeout(importProgressCloseTimer);
    importProgressCloseTimer = null;
  }
  modal.dataset.locked = 'false';
  modal.classList.add('open');
  setImportProgress(0, 4, label || 'Import failed.', detail || 'Check the file and try again.');
  document.getElementById('hakoImportProgressClose').style.display = '';
}

/* Import a .hako (or legacy .json) settings file picked by the user.
   Both are JSON internally — same payload, different extension. */
export function importConfigFile(file) {
  if (!file) return;
  const name = (file.name || '').toLowerCase();
  const looksLikeConfig = /\.(hako|hakoseed|hakoplan|json)$/i.test(name) || file.type === 'application/json' || file.type === '';
  if (!looksLikeConfig) {
    flashMessage('Drop a .hako, .hakoseed, .hakoplan, or .json settings/seed file.', 'warn');
    failImportProgress('Unsupported file type.', 'Drop a .hako, .hakoseed, .hakoplan, or .json settings/seed file.');
    return;
  }
  openImportProgressModal('Import building settings', 'Reading file...', `Reading ${file.name || 'building settings'}.`);
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      setImportProgress(2, 4, 'Validating settings...', 'Checking the JSON and upgrading old HakoMachi formats if needed.');
      const data = JSON.parse(e.target.result);
      setImportProgress(3, 4, 'Applying settings...', 'Updating the building form and regenerating previews.');
      const warnings = applyLoadedConfig(data);
      writeForm();
      regenerate();
      if (warnings.length) {
        flashMessage('Imported with warnings: ' + warnings.join(' '), 'warn');
        finishImportProgress('Imported with warnings.', warnings.join(' '), 1200);
      } else {
        flashMessage('Settings imported from file.', 'ok');
        finishImportProgress('Building settings imported.', `${file.name || 'Settings file'} has been applied.`);
      }
    } catch (err) {
      flashMessage('Import failed: ' + err.message, 'err');
      failImportProgress('Import failed.', err.message);
    }
  };
  reader.onerror = () => {
    flashMessage('File read error.', 'err');
    failImportProgress('Could not read file.', 'The browser could not read that settings file.');
  };
  reader.readAsText(file);
}


export function decodeHakoPayloadString(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const attempts = [s];
  try { attempts.push(decodeURIComponent(s)); } catch (e) {}

  for (const a of attempts.slice()) {
    const dataMatch = String(a).match(/^data:application\/json[^,]*,(.*)$/i);
    if (dataMatch) attempts.push(dataMatch[1]);
    if (/^[A-Za-z0-9_\-+/=]+$/.test(a) && a.length > 8) {
      try {
        let b64 = a.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        attempts.push(atob(b64));
      } catch (e) {}
    }
  }
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
  }
  return null;
}

export function importHakoPayloadObject(payload, sourceLabel = 'payload') {
  try {
    if (!payload || typeof payload !== 'object') throw new Error('Payload is not an object.');
    const type = String(payload.type || payload.action || payload.event || '').toLowerCase();
    let data = payload;
    if (payload.buildingSeed && typeof payload.buildingSeed === 'object') data = payload.buildingSeed;
    else if (payload.selectedBuildingSeed && typeof payload.selectedBuildingSeed === 'object') data = payload.selectedBuildingSeed;
    else if (payload.hakoSeed && typeof payload.hakoSeed === 'object') data = payload.hakoSeed;
    else if (payload.hakoseed && typeof payload.hakoseed === 'object') data = payload.hakoseed;
    else if (payload.hakoMachiSeed && typeof payload.hakoMachiSeed === 'object') data = payload.hakoMachiSeed;
    else if (payload.sitePlanSeed && typeof payload.sitePlanSeed === 'object') data = payload.sitePlanSeed;
    else if (payload.payload && typeof payload.payload === 'object' && (type.includes('hako') || type.includes('open') || type.includes('building'))) data = payload.payload;
    else if (payload.data && typeof payload.data === 'object' && (type.includes('hako') || type.includes('open') || type.includes('building'))) data = payload.data;

    const warnings = applyLoadedConfig(data);
    writeForm();
    regenerate();
    flashMessage(warnings.length ? `Imported ${sourceLabel} with warnings: ${warnings.join(' ')}` : `Imported ${sourceLabel}.`, warnings.length ? 'warn' : 'ok');
    return true;
  } catch (err) {
    flashMessage(`Import failed from ${sourceLabel}: ${err.message}`, 'err');
    return false;
  }
}

export function importHakoPayloadString(raw, sourceLabel = 'URL payload') {
  const data = decodeHakoPayloadString(raw);
  if (!data) return false;
  return importHakoPayloadObject(data, sourceLabel);
}

export function setupHakoSiteSeedReceivers() {
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d !== 'object') return;
    const type = String(d.type || d.action || d.event || '').toLowerCase();
    const hasPayload = !!(d.buildingSeed || d.selectedBuildingSeed || d.hakoSeed || d.hakoseed || d.hakoMachiSeed || d.sitePlanSeed || d.payload || d.data);
    const looksOpen = type.includes('hakomachi') || type.includes('hako') || type.includes('open') || type.includes('buildingseed');
    if (!hasPayload && !looksOpen && !isLikelyHakoMachiSitePlanSeed(d)) return;
    importHakoPayloadObject(d, 'site planner message');
  });

  const keys = ['buildingSeed','selectedBuildingSeed','hakoSeed','hakoseed','hakoMachiSeed','sitePlanSeed','payload','data','config'];
  const tryParams = (params, source) => {
    for (const k of keys) {
      const v = params.get(k);
      if (v && importHakoPayloadString(v, source + ' ' + k)) return true;
    }
    return false;
  };

  try {
    const q = new URLSearchParams(window.location.search || '');
    if (tryParams(q, 'URL query')) return;
  } catch (e) {}

  try {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash) {
      if (hash === 'sitePlannerSeed' || hash === 'hakomachiSitePlannerSeed') {
        const raw = localStorage.getItem('hakomachiSitePlannerSeed') || sessionStorage.getItem('hakomachiSitePlannerSeed');
        if (raw && importHakoPayloadString(raw, 'Site Planner localStorage handoff')) {
          localStorage.removeItem('hakomachiSitePlannerSeed');
          sessionStorage.removeItem('hakomachiSitePlannerSeed');
          return;
        }
      }
      if (hash.trim().startsWith('{') || /^[A-Za-z0-9_\-+/=]+$/.test(hash.trim())) {
        if (importHakoPayloadString(hash, 'URL hash')) return;
      }
      const hp = new URLSearchParams(hash);
      if (tryParams(hp, 'URL hash')) return;
    }
  } catch (e) {}

  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem('hakomachiSitePlannerSeed')
               || store.getItem('hakomachi_open_payload')
               || store.getItem('hakomachi_building_seed');
      if (raw && importHakoPayloadString(raw, store === sessionStorage ? 'sessionStorage handoff' : 'localStorage handoff')) {
        store.removeItem('hakomachiSitePlannerSeed');
        store.removeItem('hakomachi_open_payload');
        store.removeItem('hakomachi_building_seed');
        return;
      }
    } catch (e) {}
  }
}



export function setupHakoDragDropImport() {
  const dropZone = document.getElementById('previewDropZone') || document.querySelector('.preview');
  const overlay = document.getElementById('hakoDropOverlay');
  if (!dropZone || !overlay) return;

  let dragDepth = 0;
  const hasConfigFile = (dt) => {
    if (!dt) return false;
    const items = Array.from(dt.items || []);
    if (items.length) {
      return items.some(item => item.kind === 'file');
    }
    const files = Array.from(dt.files || []);
    return files.length > 0;
  };

  const show = () => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const hide = () => {
    dragDepth = 0;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  };

  ['dragenter', 'dragover'].forEach(type => {
    dropZone.addEventListener(type, (e) => {
      if (!hasConfigFile(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      if (type === 'dragenter') dragDepth++;
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      show();
    });
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hide();
  });

  dropZone.addEventListener('drop', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    hide();
    const file = files.find(f => /\.(hako|hakoseed|hakoplan|json)$/i.test(f.name || '')) || files[0];
    if (!file) return;
    importConfigFile(file);
  });

  // Prevent the browser from navigating away if the user misses the preview
  // panel by a few pixels while dropping a .hako file.
  window.addEventListener('dragover', (e) => {
    if (hasConfigFile(e.dataTransfer)) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    if (dropZone.contains(e.target)) return;
    e.preventDefault();
    hide();
    const files = Array.from(e.dataTransfer.files || []);
    const file = files.find(f => /\.(hako|hakoseed|hakoplan|json)$/i.test(f.name || ''));
    if (file) importConfigFile(file);
    else flashMessage('Drop a .hako, .hakoseed, .hakoplan, or .json file to import.', 'warn');
  });
}

/* Try to auto-load a saved preset on startup. Silent if none exists. */
export function onOverhangInput(axis, val) {
  const v = parseFloat(val) || 0;
  if (CONFIG.roofOverhangLinked) {
    document.getElementById('roofOverhangFB').value = v;
    document.getElementById('roofOverhangEW').value = v;
    CONFIG.roofOverhangFB = v;
    CONFIG.roofOverhangEW = v;
  } else {
    if (axis === 'fb') CONFIG.roofOverhangFB = v;
    else               CONFIG.roofOverhangEW = v;
  }
}

export function toggleOverhangLink() {
  CONFIG.roofOverhangLinked = !CONFIG.roofOverhangLinked;
  if (CONFIG.roofOverhangLinked) {
    // Sync EW to match FB
    const fbv = parseFloat(document.getElementById('roofOverhangFB').value) || 0;
    document.getElementById('roofOverhangEW').value = fbv;
    CONFIG.roofOverhangEW = fbv;
  }
  updateOverhangLinkBtn();
}

export function updateOverhangLinkBtn() {
  const btn = document.getElementById('roofOverhangLinkBtn');
  if (!btn) return;
  const on = !!CONFIG.roofOverhangLinked;
  btn.style.background  = on ? '#e8e8e2' : '';
  btn.style.color       = on ? 'var(--text)' : '';
  btn.style.borderColor = on ? 'var(--muted)' : '';
  btn.style.boxShadow   = on ? 'inset 0 1px 2px rgba(0,0,0,0.15)' : '';
}

export function tryAutoLoadPreset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      applyLoadedConfig(data);
      // Rewrite the cache once in the current storage format so future loads
      // no longer carry legacy manual* buckets.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
      return true;
    }
  } catch (e) {
    // Ignore — fall back to defaults
  }
  return false;
}


export function isLikelyHakoMachiSitePlanSeed(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.buildingType && BUILDING_TYPES[data.buildingType]) return false;

  for (const k of ['payload','data','detail','message','buildingSeed','selectedBuildingSeed','hakoSeed','hakoseed','hakoMachiSeed','sitePlanSeed']) {
    if (data[k] && typeof data[k] === 'object' && isLikelyHakoMachiSitePlanSeed(data[k])) return true;
  }

  const gen = String(data.generator || data.app || data.tool || data.kind || data.type || data.action || data.source || '').toLowerCase();
  if (gen.includes('hakomachi') && (gen.includes('site') || gen.includes('plan') || gen.includes('fabric') || gen.includes('seed') || gen.includes('building'))) return true;
  if (String(data.source || '').toLowerCase() === 'hakomachi site planner') return true;
  if (data.sitePlanSeedVersion || data.siteSeedVersion || data.hakoMachiSiteSeedVersion || data.hakoMachiBuildingSeedVersion || data.buildingSeedVersion) return true;
  if (data.fabricType && (data.lots || data.parcels || data.buildings || data.block || data.site || data.width || data.depth || data.footprint || data.dimensions)) return true;
  if (Array.isArray(data.buildings) && (data.fabricType || data.site || data.plan || data.layout || data.blocks)) return true;
  if (data.seed && typeof data.seed === 'object' && isLikelyHakoMachiSitePlanSeed(data.seed)) return true;

  if ((data.width || data.widthMm || data.depthMm || data.footprint || data.dimensions || data.bounds || data.rect) &&
      (data.fabricType || data.fabric || data.wallExposureZones || data.wallExposure || data.exposure || data.neighbors || data.siteContext || data.lot || data.parcel || data.source || data.buildingId || data.linkedHakoConfig)) return true;

  return false;
}

export function asNumOrNull(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}
export function pickNum(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    if (obj[k] != null) {
      const n = asNumOrNull(obj[k]);
      if (n != null) return n;
    }
  }
  return null;
}
export function pickFirstObject() {
  for (const item of arguments) if (item && typeof item === 'object') return item;
  return null;
}
export function validKeyOrFallback(key, dict, fallback) {
  return (key && dict && dict[key]) ? key : fallback;
}

export function hakoSiteFabricDefaults(fabricType) {
  const f = String(fabricType || '').trim();
  const common = {
    buildingType: 'industrial_loading',
    width: 80, depth: 60, height: 36,
    floorCount: 2, floorHeight: 18,
    roofStyle: 'parapet', parapetHeight: 2,
    claddingStyle: 'alc_panel', roofCladdingStyle: 'concrete_panel_small',
    windowStyle: 'industrial_small', windowDensity: 'sparse',
    doorStyle: 'industrial_metal',
    frontDoorCount: 0, backDoorCount: 0, sideDoorCount: 1,
    sheetSplitEnabled: true,
  };
  const byFabric = {
    lowRiseResidentialFabric: {
      width: 48, depth: 42, height: 18, floorCount: 2, floorHeight: 9,
      roofStyle: 'gabled', roofPitch: 9, roofRidgeDirection: 'ew', roofOverhangFB: 2, roofOverhangEW: 2,
      claddingStyle: 'cement_siding_lap', roofCladdingStyle: 'standing_seam', windowStyle: 'residential_small', windowDensity: 'normal',
      doorStyle: 'single', frontDoorCount: 1, sideDoorCount: 0,
    },
    localMixedUseFabric: {
      width: 64, depth: 50, height: 30, floorCount: 3, floorHeight: 10,
      roofStyle: 'parapet', parapetHeight: 2.5, claddingStyle: 'cement_siding_lap', windowStyle: 'industrial_small', windowDensity: 'normal',
      firstFloorWindowStyleEnabled: true, firstFloorWindowStyle: 'storefront', firstFloorHeightEnabled: true, firstFloorHeight: 12,
      doorStyle: 'glass_storefront', frontDoorCount: 1,
    },
    edgeEnclosedPocketFabric: {
      width: 74, depth: 48, height: 28, floorCount: 2, floorHeight: 14,
      roofStyle: 'parapet', parapetHeight: 3, claddingStyle: 'alc_panel', windowStyle: 'industrial_small', windowDensity: 'sparse',
    },
    stationCommercialStack: {
      width: 70, depth: 45, height: 48, floorCount: 4, floorHeight: 12,
      roofStyle: 'parapet', parapetHeight: 3, claddingStyle: 'alc_panel_wide', windowStyle: 'industrial_band', windowDensity: 'dense',
      firstFloorWindowStyleEnabled: true, firstFloorWindowStyle: 'storefront', firstFloorHeightEnabled: true, firstFloorHeight: 14,
    },
    shopWorkshopStreet: {
      width: 72, depth: 42, height: 26, floorCount: 2, floorHeight: 13,
      roofStyle: 'parapet', parapetHeight: 2, claddingStyle: 'corrugated_metal', windowStyle: 'industrial_small', windowDensity: 'sparse',
      doorStyle: 'rolling_shutter', frontDoorCount: 1,
    },
    signHeavyCommercialCanyon: {
      width: 62, depth: 40, height: 42, floorCount: 4, floorHeight: 10.5,
      roofStyle: 'parapet', parapetHeight: 2, claddingStyle: 'alc_panel', windowStyle: 'industrial_small', windowDensity: 'normal',
      firstFloorWindowStyleEnabled: true, firstFloorWindowStyle: 'storefront',
    },
    midRiseMixedUseStreet: {
      width: 86, depth: 54, height: 60, floorCount: 5, floorHeight: 12,
      roofStyle: 'parapet', parapetHeight: 3, claddingStyle: 'alc_panel_horizontal', windowStyle: 'industrial_band', windowDensity: 'normal',
      firstFloorWindowStyleEnabled: true, firstFloorWindowStyle: 'storefront', firstFloorHeightEnabled: true, firstFloorHeight: 14,
    },
    perimeterLanewayBlock: {
      width: 96, depth: 64, height: 38, floorCount: 3, floorHeight: 12.5,
      roofStyle: 'parapet', parapetHeight: 2.5, claddingStyle: 'alc_panel', windowStyle: 'industrial_small', windowDensity: 'sparse',
    },
    underViaductInfill: {
      width: 90, depth: 24, height: 18, floorCount: 1, floorHeight: 18,
      roofStyle: 'flat', claddingStyle: 'corrugated_metal', windowStyle: 'industrial_small', windowDensity: 'sparse',
      doorStyle: 'rolling_shutter', frontDoorCount: 2, sideDoorCount: 0,
    },
    industrialServiceFabric: {
      width: 110, depth: 62, height: 34, floorCount: 2, floorHeight: 17,
      roofStyle: 'parapet_gable', parapetHeight: 4, roofPitch: 6, roofRidgeDirection: 'ew',
      claddingStyle: 'ribbed_metal_fasteners', roofCladdingStyle: 'standing_seam', windowStyle: 'industrial_small', windowDensity: 'sparse',
      doorStyle: 'industrial_metal', frontDoorCount: 0, sideDoorCount: 1,
    },
  };
  return { ...common, ...(byFabric[f] || {}) };
}

export function findHakoSiteBuildingSeed(data) {
  if (!data || typeof data !== 'object') return null;

  for (const k of ['payload','data','detail','message','buildingSeed','selectedBuildingSeed','hakoSeed','hakoseed','hakoMachiSeed','sitePlanSeed']) {
    if (data[k] && typeof data[k] === 'object') {
      const found = findHakoSiteBuildingSeed(data[k]);
      if (found) return found;
    }
  }

  if (data.selectedBuilding || data.currentBuilding || data.building) {
    return data.selectedBuilding || data.currentBuilding || data.building;
  }
  const arrays = [data.buildings, data.buildingSeeds, data.lots, data.parcels, data.structures, data.features]
    .filter(Array.isArray);
  for (const arr of arrays) {
    const picked = arr.find(b => b && typeof b === 'object' && (b.selected || b.active || b.primary || b.export === true || b.hakoConfig || b.config || b.buildingConfig || b.buildingType));
    if (picked) return picked;
  }
  for (const arr of arrays) {
    const picked = arr.find(b => b && typeof b === 'object');
    if (picked) return picked;
  }
  if (data.seed && typeof data.seed === 'object') return findHakoSiteBuildingSeed(data.seed);

  // Single-building seed.
  if (data.width || data.widthMm || data.depthMm || data.footprint || data.dimensions || data.bounds || data.rect || data.fabricType || data.wallExposureZones || data.source === 'HakoMachi Site Planner') return data;
  return null;
}

export function normalizeHakoMachiSitePlanSeedToConfig(input, warnings) {
  if (!isLikelyHakoMachiSitePlanSeed(input)) return input;
  const root = (input.seed && typeof input.seed === 'object') ? input.seed
             : (input.payload && typeof input.payload === 'object') ? input.payload
             : (input.data && typeof input.data === 'object') ? input.data
             : (input.detail && typeof input.detail === 'object') ? input.detail
             : input;
  const b = findHakoSiteBuildingSeed(root) || root;
  const sitePlanSeedSource = {
    generator: input.generator || input.app || root.generator || root.app || 'HakoMachi Site Planner',
    fabricType: b.fabricType || b.fabric || root.fabricType || root.fabric || input.fabricType || null,
    sourceId: b.id || b.buildingId || b.lotId || root.buildingId || null,
  };
  const sitePlannerHandoff = b.sitePlannerHandoff || b.hakomachiHandoff || root.sitePlannerHandoff || root.hakomachiHandoff || {
    schema: 'hakomachi.building-handoff',
    schemaVersion: 1,
    sitePlan: {
      name: root.projectName || root.name || null,
    },
    building: {
      plannerId: sitePlanSeedSource.sourceId,
      name: b.name || b.buildingName || root.name || null,
      rotationDeg: Number(b.rotationDeg) || 0,
      hakoFileId: b.hakoFileId || null,
    },
  };
  const embeddedConfig = b.hakoConfig || b.config || b.buildingConfig || b.hako || b.generatorConfig || b.hakoMachiConfig || b.linkedHakoConfig;
  if (embeddedConfig && typeof embeddedConfig === 'object' && (embeddedConfig.buildingType || embeddedConfig.width || embeddedConfig.depth)) {
    warnings.push('Imported embedded building config from HakoMachi site-plan seed.');
    const mergedEmbedded = { ...embeddedConfig, sitePlanSeedSource, hakomachiHandoff: sitePlannerHandoff };
    if (b.name && !mergedEmbedded.buildingName) mergedEmbedded.buildingName = b.name;
    if (b.widthMm != null && !mergedEmbedded.width) mergedEmbedded.width = asNumOrNull(b.widthMm);
    if (b.depthMm != null && !mergedEmbedded.depth) mergedEmbedded.depth = asNumOrNull(b.depthMm);
    if (b.footprint && b.footprint.type === 'rect') {
      if (b.footprint.widthMm != null && !mergedEmbedded.width) mergedEmbedded.width = asNumOrNull(b.footprint.widthMm);
      if (b.footprint.depthMm != null && !mergedEmbedded.depth) mergedEmbedded.depth = asNumOrNull(b.footprint.depthMm);
    }
    return mergedEmbedded;
  }

  const fabricType = b.fabricType || b.fabric || root.fabricType || root.fabric || root.FabricType || 'industrialServiceFabric';
  const defaults = hakoSiteFabricDefaults(fabricType);
  const dims = pickFirstObject(b.dimensions, b.size, b.footprint, b.bounds, b.rect, root.defaultBuildingDimensions) || {};
  const lot = pickFirstObject(b.lot, b.parcel, b.plot, b.cell) || {};
  const style = pickFirstObject(b.style, b.rules, b.generationRules, root.style, root.rules) || {};
  const levels = pickNum(b, ['floorCount','floors','levels','storeys','stories']) ?? pickNum(style, ['floorCount','floors','levels','storeys','stories']);
  const floorH = pickNum(b, ['floorHeight','floorHeightMm']) ?? pickNum(style, ['floorHeight','floorHeightMm']);
  let width = pickNum(b, ['width','widthMm','w','modelWidth','modelWidthMm']) ?? pickNum(dims, ['width','widthMm','w']) ?? pickNum(lot, ['width','widthMm','w']);
  let depth = pickNum(b, ['depth','depthMm','d','modelDepth','modelDepthMm']) ?? pickNum(dims, ['depth','depthMm','d','height','heightMm','h']) ?? pickNum(lot, ['depth','depthMm','d','height','heightMm','h']);
  if (b.footprint && b.footprint.type === 'rect') {
    width = pickNum(b.footprint, ['widthMm','width','w']) ?? width;
    depth = pickNum(b.footprint, ['depthMm','depth','d']) ?? depth;
  }
  if (b.boundingRectMm) {
    width = pickNum(b.boundingRectMm, ['widthMm','width','w']) ?? width;
    depth = pickNum(b.boundingRectMm, ['depthMm','depth','d']) ?? depth;
  }
  let height = pickNum(b, ['height','heightMm','h','modelHeight','modelHeightMm']) ?? pickNum(dims, ['modelHeight','heightMm','h']) ?? null;
  if (height == null && levels && floorH) height = levels * floorH;
  if (width == null) width = defaults.width;
  if (depth == null) depth = defaults.depth;
  if (height == null) height = defaults.height;

  const roof = b.roof || style.roof || {};
  const cladding = b.cladding || style.cladding || {};
  const win = b.windows || b.window || style.windows || style.window || {};
  const doors = b.doors || b.door || style.doors || style.door || {};
  const out = {
    ...defaults,
    buildingName: b.name || b.buildingName || root.name || root.seedName || null,
    width, depth, height,
    floorCount: levels || defaults.floorCount,
    floorHeight: floorH || (levels ? height / Math.max(1, levels) : defaults.floorHeight),
    roofStyle: (['flat','parapet','gabled','parapet_gable','slanted','flat_overhang'].includes(b.roofStyle || roof.style || roof.roofStyle) ? (b.roofStyle || roof.style || roof.roofStyle) : defaults.roofStyle),
    roofPitch: pickNum(b, ['roofPitch']) ?? pickNum(roof, ['pitch','roofPitch']) ?? defaults.roofPitch,
    parapetHeight: pickNum(b, ['parapetHeight']) ?? pickNum(roof, ['parapetHeight']) ?? defaults.parapetHeight,
    roofRidgeDirection: ['ew','ns'].includes(b.roofRidgeDirection || roof.ridgeDirection) ? (b.roofRidgeDirection || roof.ridgeDirection) : defaults.roofRidgeDirection,
    claddingStyle: validKeyOrFallback(b.claddingStyle || cladding.style || cladding.claddingStyle, CLADDING_STYLES, defaults.claddingStyle),
    roofCladdingStyle: validKeyOrFallback(b.roofCladdingStyle || roof.claddingStyle || roof.roofCladdingStyle, CLADDING_STYLES, defaults.roofCladdingStyle),
    windowStyle: validKeyOrFallback(b.windowStyle || win.style || win.windowStyle, WINDOW_STYLES, defaults.windowStyle),
    windowDensity: ['none','sparse','normal','dense'].includes(b.windowDensity || win.density) ? (b.windowDensity || win.density) : defaults.windowDensity,
    doorStyle: validKeyOrFallback(b.doorStyle || doors.style || doors.doorStyle, DOOR_STYLES, defaults.doorStyle),
    sitePlanSeedSource: { ...sitePlanSeedSource, fabricType },
    hakomachiHandoff: sitePlannerHandoff,
  };

  // Manual features can be passed through if a site planner already produced
  // HakoMachi-compatible wall features/openings.
  if (b.wallFeatures && typeof b.wallFeatures === 'object') out.wallFeatures = b.wallFeatures;
  if (b.manualOpenings && typeof b.manualOpenings === 'object') out.manualOpenings = b.manualOpenings;
  if (Array.isArray(b.wallExposureZones)) out.wallExposureZones = b.wallExposureZones;
  else if (Array.isArray(root.wallExposureZones)) out.wallExposureZones = root.wallExposureZones;
  else if (b.wallExposure && typeof b.wallExposure === 'object') out.wallExposure = b.wallExposure;
  if (Array.isArray(b.signs)) out.signs = b.signs;
  if (Array.isArray(b.embeddedRails)) out.embeddedRails = b.embeddedRails;
  if (Array.isArray(b.rooftopItems)) out.rooftopItems = b.rooftopItems;

  warnings.push(`Converted HakoMachi site-plan seed${fabricType ? ' (' + fabricType + ')' : ''} into a single building config.`);
  if (Array.isArray(root.buildings) && root.buildings.length > 1) {
    warnings.push(`Site seed contains ${root.buildings.length} buildings; imported the selected/first building only.`);
  }
  return out;
}

/* Validate and merge a loaded config object onto CONFIG, falling back to 
   building-type defaults for any field that's missing or references a key that no 
   longer exists in our enums. Returns a list of warnings about anything that was reset. */
export function applyLoadedConfig(data) {
  const warnings = [];
  if (typeof data !== 'object' || data === null) {
    throw new Error('Config data is not an object.');
  }
  data = normalizeHakoMachiSitePlanSeedToConfig(data, warnings);

  // Start from defaults of the building type (fallback for missing fields)
  const typeKey = (data.buildingType && BUILDING_TYPES[data.buildingType]) ? data.buildingType : 'industrial_loading';
  if (data.buildingType && !BUILDING_TYPES[data.buildingType]) {
    warnings.push(`Unknown building type "${data.buildingType}", using ${typeKey}.`);
  }
  const base = { buildingType: typeKey, ...BUILDING_TYPES[typeKey].defaults };

  // Validate enum values, falling back to base if invalid
  function validEnum(field, dictionary, fallback) {
    if (data[field] == null) return fallback;
    if (dictionary[data[field]]) return data[field];
    warnings.push(`Unknown ${field} "${data[field]}", using ${fallback}.`);
    return fallback;
  }

  const merged = {
    ...CONFIG,                       // current state as last-resort fallback
    ...base,                         // defaults for the building type
    ...data,                         // user-provided values override
    buildingType: typeKey,
    claddingStyle:  validEnum('claddingStyle',  CLADDING_STYLES,  base.claddingStyle),
    windowStyle:    validEnum('windowStyle',    WINDOW_STYLES,    base.windowStyle),
    doorStyle:      validEnum('doorStyle',      DOOR_STYLES,      base.doorStyle),
    windowScale:    (data.windowScale && WINDOW_SCALES[data.windowScale]) ? data.windowScale : (base.windowScale || 'default'),
    firstFloorWindowStyle: (data.firstFloorWindowStyle && WINDOW_STYLES[data.firstFloorWindowStyle]) 
      ? data.firstFloorWindowStyle 
      : (base.firstFloorWindowStyle || 'storefront'),
    firstFloorWindowScale: (data.firstFloorWindowScale && WINDOW_SCALES[data.firstFloorWindowScale]) 
      ? data.firstFloorWindowScale 
      : (base.firstFloorWindowScale || 'default'),
  };

  // Numeric sanity checks
  function clampNum(field, min, max, fallback) {
    const n = Number(merged[field]);
    if (!isFinite(n) || n < min || n > max) {
      warnings.push(`${field} value out of range, using ${fallback}.`);
      merged[field] = fallback;
    }
  }
  clampNum('width', 30, 500, base.width || 80);
  clampNum('depth', 30, 500, base.depth || 80);
  clampNum('height', 15, 500, base.height || 80);
  clampNum('coreThickness', 0.5, 5, 1.5);
  clampNum('claddingThickness', 0.05, 2, 0.28);
  clampNum('tongueWidth', 3, 50, 15);
  clampNum('surfaceFeatureTrimOffset', 0, 5, 0.75);
  clampNum('sheetSplitMinSegmentMm', 10, 150, 40);
  clampNum('sheetSplitSpliceWidthMm', 6, 40, 16);
  if (merged.sheetSplitEnabled == null) merged.sheetSplitEnabled = true;
  clampNum('trimHeight', 0.3, 20, 2);
  clampNum('trimOverhang', 0, 5, 0.28);
  clampNum('floorCount', 1, 20, 4);
  clampNum('floorHeight', 5, 80, 30);
  clampNum('firstFloorHeight', 5, 100, 35);
  // Ground-floor depth offset is signed (negative = recess)
  if (merged.groundFloorOffsetAmount != null) {
    const v = Number(merged.groundFloorOffsetAmount);
    if (!isFinite(v) || v < -100 || v > 100) {
      warnings.push('groundFloorOffsetAmount out of range, using 10.');
      merged.groundFloorOffsetAmount = 10;
    }
  }

  // lastWallSide must be one of the four sides
  const validSides = ['front', 'back', 'east', 'west'];
  if (!validSides.includes(merged.lastWallSide)) {
    merged.lastWallSide = 'back';
  }
  // Boolean coercion
  merged.trimTop = !!merged.trimTop;
  merged.trimBottom = !!merged.trimBottom;
  merged.floorPanels = !!merged.floorPanels;
  merged.firstFloorHeightEnabled = !!merged.firstFloorHeightEnabled;
  merged.firstFloorWindowStyleEnabled = !!merged.firstFloorWindowStyleEnabled;
  merged.firstFloorCladdingStyleEnabled = !!merged.firstFloorCladdingStyleEnabled;
  if (merged.firstFloorCladdingStyle && !CLADDING_STYLES[merged.firstFloorCladdingStyle]) {
    warnings.push('firstFloorCladdingStyle invalid, falling back to cement_siding_lap.');
    merged.firstFloorCladdingStyle = 'cement_siding_lap';
  }
  merged.groundFloorOffsetEnabled = !!merged.groundFloorOffsetEnabled;
  if (merged.claddingExtendsToFloorBottom == null) {
    merged.claddingExtendsToFloorBottom = true;
  } else {
    merged.claddingExtendsToFloorBottom = !!merged.claddingExtendsToFloorBottom;
  }
  // Rooftop fields
  merged.rooftopMechRoom = !!merged.rooftopMechRoom;
  if (merged.rooftopMechRoomWidth != null) {
    const v = Number(merged.rooftopMechRoomWidth);
    if (!isFinite(v) || v < 5 || v > 200) merged.rooftopMechRoomWidth = 25;
  }
  if (merged.rooftopMechRoomDepth != null) {
    const v = Number(merged.rooftopMechRoomDepth);
    if (!isFinite(v) || v < 5 || v > 200) merged.rooftopMechRoomDepth = 20;
  }
  if (merged.rooftopMechRoomHeight != null) {
    const v = Number(merged.rooftopMechRoomHeight);
    if (!isFinite(v) || v < 5 || v > 100) merged.rooftopMechRoomHeight = 18;
  }
  // rooftopEquipment: must be an object mapping known keys to non-negative integers
  if (merged.rooftopEquipment && typeof merged.rooftopEquipment === 'object') {
    const cleaned = {};
    for (const k of Object.keys(ROOFTOP_EQUIPMENT)) {
      const v = merged.rooftopEquipment[k];
      cleaned[k] = (typeof v === 'number' && v >= 0 && v <= 50) ? Math.floor(v) : 0;
    }
    merged.rooftopEquipment = cleaned;
  } else {
    merged.rooftopEquipment = {};
    for (const k of Object.keys(ROOFTOP_EQUIPMENT)) merged.rooftopEquipment[k] = 0;
  }

  // Back-fill material sheet sizes for older .hako files saved before
  // material limits existed. Store in mm; the UI can display/convert inches.
  if (Array.isArray(merged.materials)) {
    for (const m of merged.materials) {
      if (m.maxWidthMm == null && m.maxW != null) m.maxWidthMm = m.maxW;
      if (m.maxHeightMm == null && m.maxH != null) m.maxHeightMm = m.maxH;
      if (m.maxWidthMm == null) m.maxWidthMm = 304.8;
      if (m.maxHeightMm == null) m.maxHeightMm = 304.8;
      if (!m.sizeUnit) m.sizeUnit = 'mm';
    }
  }

  // Layout cuts are optional and backwards-compatible. Clean any malformed
  // entries from older experimental saves rather than failing import.
  if (!Array.isArray(merged.layoutCuts)) merged.layoutCuts = [];
  merged.layoutCuts = merged.layoutCuts
    .filter(c => c && (c.type === 'line' || c.type === 'arc'))
    .map(c => ({
      id: c.id || ('cut_' + Math.random().toString(36).slice(2, 8)),
      type: c.type === 'arc' ? 'arc' : 'line',
      x1: Number(c.x1) || 0,
      y1: Number(c.y1) || 0,
      x2: Number(c.x2) || 0,
      y2: Number(c.y2) || 0,
      cx: Number(c.cx) || ((Number(c.x1) || 0) + (Number(c.x2) || 0)) / 2,
      cy: Number(c.cy) || ((Number(c.y1) || 0) + (Number(c.y2) || 0)) / 2,
      keepSide: c.keepSide === 'right' ? 'right' : 'left',
      enabled: c.enabled !== false,
      positionMode: (c.type === 'arc' && c.positionMode === 'measured') ? 'measured' : 'free',
      targetId: (typeof c.targetId === 'string' && c.targetId) ? c.targetId : 'main',
      referenceEdge: ['front','back','east','west'].includes(c.referenceEdge) ? c.referenceEdge : 'back',
      startOffset: isFinite(Number(c.startOffset)) ? Number(c.startOffset) : 0,
      endOffset: isFinite(Number(c.endOffset)) ? Number(c.endOffset) : 0,
      bulge: isFinite(Number(c.bulge)) ? Number(c.bulge) : 20,
      bulgeSide: Number(c.bulgeSide) < 0 ? -1 : 1,
    }));
  refreshMeasuredLayoutCuts(merged);

  const importedHadLegacyHeight = merged.heightIncludesParapet !== true;
  const importedLegacyHeightBefore = Number(merged.height) || 0;
  const importedParapetBefore = Number(merged.parapetHeight) || 0;
  upgradeConfigToCurrentStorage(merged);
  if (importedHadLegacyHeight && importedParapetBefore > 0) {
    warnings.push(`Converted legacy height ${importedLegacyHeightBefore.toFixed(1)} mm + parapet ${importedParapetBefore.toFixed(1)} mm to total height ${Number(merged.height).toFixed(1)} mm.`);
  }
  Object.assign(CONFIG, merged);
  upgradeConfigToCurrentStorage(CONFIG);
  return warnings;
}

/* Show a small status message in the warnings area */
export function flashMessage(text, kind) {
  const w = document.getElementById('warnings');
  const cls = kind === 'err' ? 'warn' : kind === 'ok' ? 'ok-msg' : 'warn';
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  w.insertBefore(div, w.firstChild);
  setTimeout(() => div.remove(), 3500);
}

export function reset() {
  applyBuildingTypeDefaults();
}

/* Wire up events */
export function init() {
  initDropdowns();
  // Apply industrial_loading defaults on first load
  CONFIG.buildingType = 'industrial_loading';
  Object.assign(CONFIG, BUILDING_TYPES.industrial_loading.defaults);
  upgradeConfigToCurrentStorage(CONFIG);

  // Animated logo: replay the SMIL timeline from t=0 on hover, but only
  // once the previous cycle has finished. The build-on sequence takes 2.23s
  // (final animate ends at begin 1.85s + dur 0.38s); we add a small buffer
  // so a hover landing on the very tail of the animation doesn't chain
  // into an immediate restart. The initial page-load animation counts as
  // the first cycle — we seed lastTriggerTime to "now" so a hover within
  // the first 2.3s post-load is also suppressed. The listener lives here
  // (not inline in the SVG) so the offline test sandbox doesn't try to
  // run document.currentScript.closest.
  const logoSvg = document.querySelector('svg.app-logo');
  if (logoSvg && typeof logoSvg.setCurrentTime === 'function') {
    const LOGO_ANIM_DURATION_MS = 2300;
    let lastTriggerTime = performance.now();
    logoSvg.addEventListener('mouseenter', () => {
      const now = performance.now();
      if (now - lastTriggerTime < LOGO_ANIM_DURATION_MS) return;
      lastTriggerTime = now;
      try { logoSvg.setCurrentTime(0); } catch (_) { /* older browsers */ }
    });
  }

  // Try loading a saved preset from browser cache (silent if none)
  tryAutoLoadPreset();
  if (typeof applyPendingMaterialProfileHandoff === 'function') applyPendingMaterialProfileHandoff();

  writeForm();
  regenerate();

  // Language: build text registry first (captures original English), then apply
  (function initLang() {
    buildTextRegistry();
    let saved;
    try { saved = localStorage.getItem('hakomachi_lang'); } catch(e) {}
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const detected = saved || (browserLang.startsWith('ja') ? 'ja' : 'en');
    setLanguage(detected);
  })();

  // Building type change applies defaults to CONFIG, writes them to the form, and regenerates
  document.getElementById('buildingType').addEventListener('change', applyBuildingTypeDefaults);

  // Other inputs only update the conditional-field visibility live.
  // Regeneration is triggered manually by the "Generate Preview" button.
  const conditionalFieldUpdaters = ['heightMode', 'roofStyle', 'claddingStyle', 'roofCladdingStyle',
                                    'windowStyle', 'doorStyle',
                                    'firstFloorHeightEnabled', 'firstFloorWindowStyleEnabled', 
                                    'firstFloorCladdingStyleEnabled', 'groundFloorOffsetEnabled',
                                    'claddingExtendsToFloorBottom', 'floorOutlineOpening', 'rooftopMechRoom', 'interiorCladding'];
  for (const id of conditionalFieldUpdaters) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateConditionalFields);
  }
  for (const id of ['height', 'floors', 'floorHeight', 'parapetHeight', 'firstFloorHeight']) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => syncHeightFloorModeFields({ writeComputed: true }));
      el.addEventListener('change', () => syncHeightFloorModeFields({ writeComputed: true }));
    }
  }

  // Auto-suggest the standing-seam metal cladding style when the user
  // first picks 'flat_overhang' for the roof. The metal-clad look is
  // the whole point of this roof type — a freshly-selected flat-overhang
  // roof with the global default cladding (concrete_panel_small) would
  // give the wrong first impression of what the style is for. Only the
  // initial pick gets this treatment; once the user has explicitly chosen
  // any roof cladding style, future toggles into flat_overhang leave the
  // selection alone.
  const roofStyleEl = document.getElementById('roofStyle');
  const roofCladEl  = document.getElementById('roofCladdingStyle');
  if (roofStyleEl && roofCladEl) {
    roofStyleEl.addEventListener('change', () => {
      if (roofStyleEl.value !== 'flat_overhang') return;
      // Only auto-switch from the global default; respect any deliberate
      // user choice on the roof cladding selector.
      const cur = roofCladEl.value;
      if (cur === 'concrete_panel_small' || cur === '' || cur == null) {
        roofCladEl.value = 'standing_seam_metal';
        // Fire the change event so the description text + dependent
        // fields refresh as if the user had picked it themselves.
        roofCladEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Auto-regenerate whenever any form control in the left panel changes.
  // Uses a short debounce so typing in a number field doesn't spam generation.
  let _regenTimer = null;
  function scheduleRegen(e) {
    if (e && e.target && (e.target.id === 'height' || e.target.id === 'floorHeight') && e.target.readOnly) return;
    syncHeightFloorModeFields({ writeComputed: true });
    clearTimeout(_regenTimer);
    _regenTimer = setTimeout(() => { readForm(); regenerate(); }, 300);
  }
  const formPanel = document.querySelector('.controls');
  if (formPanel) {
    // 'change' fires on blur for text/number, immediately for select/checkbox/radio
    formPanel.addEventListener('change', scheduleRegen);
    // 'input' catches live typing in number fields; debounce prevents over-firing
    formPanel.addEventListener('input',  scheduleRegen);
  }

  document.getElementById('openingEditorBtn').addEventListener('click', () => openOpeningEditor());

  // Internal wall editor wiring
  document.getElementById('iwBtnClose').addEventListener('click', iwClose);
  document.getElementById('iwBtnApply').addEventListener('click', iwApply);
  document.getElementById('iwGridInput').addEventListener('change', () => iwRender());
  document.getElementById('iwZoomIn').addEventListener('click',  () => { iwScale = Math.min(12, iwScale * 1.25); iwRender(); });
  document.getElementById('iwZoomOut').addEventListener('click', () => { iwScale = Math.max(1, iwScale / 1.25); iwRender(); });
  document.getElementById('iwZoom1').addEventListener('click',   () => { iwFitView(); iwRender(); });
  const iwSvgEl = document.getElementById('iwSvg');
  if (window.PointerEvent) {
    iwSvgEl.addEventListener('pointermove', iwHandleMouseMove);
    iwSvgEl.addEventListener('pointerdown', iwHandleMouseDown);
    iwSvgEl.addEventListener('pointerup', iwHandleMouseUp);
    iwSvgEl.addEventListener('pointercancel', iwHandleMouseUp);
    iwSvgEl.addEventListener('pointerleave', iwHandleMouseLeave);
  } else {
    iwSvgEl.addEventListener('mousemove',  iwHandleMouseMove);
    iwSvgEl.addEventListener('mousedown',  iwHandleMouseDown);
    iwSvgEl.addEventListener('mouseup',    iwHandleMouseUp);
    iwSvgEl.addEventListener('mouseleave', iwHandleMouseLeave);
  }
  // Keep active drags alive even when the cursor leaves the exact SVG child
  // that started the gesture. This is especially important for floor holes:
  // the editor re-renders immediately on mousedown to show selection, which can
  // replace the element under the cursor before the first mousemove arrives.
  const iwDocMoveEvent = window.PointerEvent ? 'pointermove' : 'mousemove';
  const iwDocUpEvent = window.PointerEvent ? 'pointerup' : 'mouseup';
  document.addEventListener(iwDocMoveEvent, e => {
    if (iwPanning || iwRailTrackDrag || iwRailResizeDrag || iwShieldDrag || iwShieldBoundsDrag || iwDragMoving || iwDrag || iwDragItem) {
      iwHandleMouseMove(e);
    }
  });
  window.addEventListener(iwDocUpEvent, e => {
    // Let the normal mouseup finalizer handle active editor gestures even when
    // the release happens outside the SVG viewport. The old recovery path
    // simply cleared iwDragMoving, which made placed floor holes feel like they
    // could not be dragged after placement.
    if (iwPanning || iwRailTrackDrag || iwRailResizeDrag || iwShieldDrag || iwShieldBoundsDrag || iwDragMoving || iwDrag || iwDragItem) {
      iwHandleMouseUp(e);
    }
  });
  if (window.PointerEvent) {
    window.addEventListener('pointercancel', e => {
      if (iwPanning || iwRailTrackDrag || iwRailResizeDrag || iwShieldDrag || iwShieldBoundsDrag || iwDragMoving || iwDrag || iwDragItem) {
        iwHandleMouseUp(e);
      }
    });
  }
  document.addEventListener('keydown', iwKeyDown);
  document.addEventListener('keyup',   iwKeyUp);
  // Middle-mouse-button on Linux / some browsers triggers context-menu
  // or paste-on-mouseup; suppress that on the SVG so it cleanly behaves
  // as a pan gesture.
  iwSvgEl.addEventListener('contextmenu', e => {
    if (iwPanning) e.preventDefault();
  });
  iwSvgEl.addEventListener('auxclick', e => {
    if (e.button === 1) e.preventDefault();
  });
  document.getElementById('wingEditorBtn').addEventListener('click', openWingEditor);
  document.getElementById('exportBtn').addEventListener('click', exportZip);
  document.getElementById('saveBtn').addEventListener('click', () => { readForm(); savePreset(); });
  document.getElementById('loadBtn').addEventListener('click', loadPreset);
  document.getElementById('clearBtn').addEventListener('click', clearPreset);
  document.getElementById('exportConfigBtn').addEventListener('click', exportConfigFile);

  const fileInput = document.getElementById('importConfigFile');
  document.getElementById('importConfigBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importConfigFile(f);
    fileInput.value = '';
  });
  setupHakoDragDropImport();
  setupHakoSiteSeedReceivers();

  document.getElementById('resetBtn').addEventListener('click', reset);

  // Three-dot overflow menu
  const trigger  = document.getElementById('overflowTrigger');
  const dropdown = document.getElementById('overflowDropdown');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  // Close dropdown on any click outside it
  document.addEventListener('click', () => dropdown.classList.remove('open'));
  dropdown.addEventListener('click', (e) => {
    // Keep open while interacting with buttons inside, close after action
    e.stopPropagation();
    // Close after a short delay so the button's own handler fires first
    setTimeout(() => dropdown.classList.remove('open'), 120);
  });

  // Initial materials panel render
  initMaterialsForm();

  // Live panel-dimension note (updates whenever width/depth/coreThickness changes)
  function updatePanelDimsNote() {
    const note = document.getElementById('panelDimsNote');
    if (!note) return;
    const w  = parseFloat(document.getElementById('width').value)  || CONFIG.width;
    const d  = parseFloat(document.getElementById('depth').value)  || CONFIG.depth;
    const ct = CONFIG.coreThickness || 1.5;
    const frontBackW = w.toFixed(1);
    const sideLen    = (d - 2 * ct).toFixed(1);
    note.innerHTML =
      `Front/back walls: <strong>${frontBackW} mm</strong> wide &nbsp;·&nbsp; ` +
      `Side walls: <strong>${sideLen} mm</strong> long ` +
      `<span style="color:#a06000">(= depth&nbsp;−&nbsp;2×core = ${d}−${(2*ct).toFixed(1)})</span>`;
  }
  updatePanelDimsNote();
  ['width','depth'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePanelDimsNote);
    document.getElementById(id)?.addEventListener('change', updatePanelDimsNote);
  });
}
