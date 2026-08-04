/* =====================================================================
   LIVE THREE.JS PREVIEW
   Browser-local realtime preview of the generated structure.
   ===================================================================== */

import { installThreeRenderCanvas } from '../../shared/browser-utils.js';
import { createHakoMachiLogger } from '../../shared/hakomachi-diagnostics.js';
import { buildWindowSvgBody, getGroundFloorWindowDims, getWindowDims } from '../data/opening-styles.js?v=hm-assets-20260804-4';
import { embeddedRailOrientation, embeddedRailProfile, embeddedRailsForCfg, sampleLayoutCutSegments } from '../core/layout-cut-geometry.js?v=hm-assets-20260804-4';
import { collectPreviewLayoutCuts, previewLayoutCutsActive } from './layout-cut-helpers.js?v=hm-assets-20260804-4';
import { createPreviewMaterialHelpers } from './material-helpers.js?v=hm-assets-20260804-4';
import { get3DWallProfileForFace, getPreviewEffectiveRidgeDir, isPreviewGabledRoofStyle } from './wall-profile-helpers.js?v=hm-assets-20260804-4';

const logger = createHakoMachiLogger('Building Generator 3D Preview');

let threeScene, threeCamera, threeRenderer, threeControls, buildingMesh, threePreviewGrid;
export let threePreviewConfig = null;
export let threePreviewUseStlGeometry = false;
export let threePreviewRenderRequested = true;
export let threePreviewLoopActive = false;
export let threePreviewDampingFrames = 0;
export let threePreviewLegacyInstalled = false;
export let threePreviewLegacyRegenerate = null;

let threePreviewResizeHandler = null;
let threePreviewInitTimer = null;
let threePreviewConfigRetryTimer = null;

function publishThreePreviewGlobals(root = globalThis) {
  if (!root) return;
  root.initThreePreview = initThreePreview;
  root.updateThreePreview = updateThreePreview;
  root.requestThreePreviewRender = requestThreePreviewRender;
  root.getThreePreviewConfig = getThreePreviewConfig;
  root.setThreePreviewConfig = setThreePreviewConfig;
  root.threeScene = threeScene;
  root.threeCamera = threeCamera;
  root.threeRenderer = threeRenderer;
  root.threeControls = threeControls;
  root.buildingMesh = buildingMesh;
  root.threePreviewUseStlGeometry = threePreviewUseStlGeometry;
}

export function setThreePreviewConfig(config) {
  threePreviewConfig = config || null;
  publishThreePreviewGlobals();
  return threePreviewConfig;
}

export function getThreePreviewConfig(config) {
  if (config) return config;
  if (threePreviewConfig) return threePreviewConfig;
  if (globalThis.HakoMachiBuildingGeneratorRuntime?.CONFIG) {
    return globalThis.HakoMachiBuildingGeneratorRuntime.CONFIG;
  }
  return globalThis.CONFIG || null;
}

export function requestThreePreviewRender(extraFrames = 2) {
  threePreviewRenderRequested = true;
  threePreviewDampingFrames = Math.max(threePreviewDampingFrames, extraFrames || 0);
  if (!threePreviewLoopActive) {
    threePreviewLoopActive = true;
    requestAnimationFrame(animateThree);
  }
}

function scheduleThreePreviewConfigRefresh(attempt = 0) {
  const schedule = globalThis.setTimeout || setTimeout;
  if (threePreviewConfigRetryTimer) {
    try { clearTimeout(threePreviewConfigRetryTimer); } catch (_) {}
  }
  threePreviewConfigRetryTimer = schedule(() => {
    threePreviewConfigRetryTimer = null;
    const cfg = getThreePreviewConfig();
    if (cfg) {
      try { updateThreePreview(cfg); } catch (err) { logger.error('3D preview refresh error:', err); }
      return;
    }
    if (attempt < 40) scheduleThreePreviewConfigRefresh(attempt + 1);
  }, attempt === 0 ? 0 : 100);
}

export function initThreePreview() {
  const container = document.getElementById('threePreview');
  if (!container) return;

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0xf0f0ea);

  threeCamera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );

  threeCamera.position.set(120, 100, 120);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true });
  threeRenderer.localClippingEnabled = true;
  threeRenderer.setSize(container.clientWidth, container.clientHeight);
  threeRenderer.domElement.draggable = false;
  threeRenderer.domElement.addEventListener('selectstart', e => e.preventDefault());
  threeRenderer.domElement.addEventListener('dragstart', e => e.preventDefault());

  container.innerHTML = '';
  container.appendChild(threeRenderer.domElement);
  installThreeRenderCanvas(container, threeRenderer.domElement);

  threeControls = new THREE.OrbitControls(
    threeCamera,
    threeRenderer.domElement
  );

  threeControls.enableDamping = true;
  threeControls.addEventListener('start', () => requestThreePreviewRender(24));
  threeControls.addEventListener('change', () => requestThreePreviewRender(8));
  threeControls.addEventListener('end', () => requestThreePreviewRender(24));

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  threeScene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(100, 200, 100);
  threeScene.add(dir);

  threePreviewGrid = new THREE.GridHelper(300, 30);
  threeScene.add(threePreviewGrid);

  publishThreePreviewGlobals();
  requestThreePreviewRender(2);
  scheduleThreePreviewConfigRefresh();
}

const previewMaterialHelpers = createPreviewMaterialHelpers(getThreePreviewConfig);

// Compatibility exports. New preview code should import from material-helpers.js.
export const normaliseHexColour = previewMaterialHelpers.normaliseHexColour;
export const materialDefinitionForId = previewMaterialHelpers.materialDefinitionForId;
export const materialColourHex = previewMaterialHelpers.materialColourHex;
export const materialColourNumber = previewMaterialHelpers.materialColourNumber;
export const claddingMaterialIdForStyle = previewMaterialHelpers.claddingMaterialIdForStyle;
export const claddingColourHexForStyle = previewMaterialHelpers.claddingColourHexForStyle;
export const shadeHexColour = previewMaterialHelpers.shadeHexColour;
export const rgbaFromHex = previewMaterialHelpers.rgbaFromHex;
export const material3DForId = previewMaterialHelpers.material3DForId;
export const svgDataUri = previewMaterialHelpers.svgDataUri;

export const _printedItemTextureCache3D = new Map();

export function printedItemSvgMarkup3D(styleKey, w, h) {
  const style = PRINTED_STYLES && PRINTED_STYLES[styleKey];
  if (!style || typeof style.designSvg !== 'function') return null;
  const W = Math.max(0.1, Number(w) || Number(style.width) || 1);
  const H = Math.max(0.1, Number(h) || Number(style.height) || 1);
  const body = style.designSvg(W, H);
  if (!body) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
       + `<rect x="0" y="0" width="${W}" height="${H}" fill="white" opacity="0"/>`
       + body
       + `</svg>`;
}

export function printedItemTexture3D(styleKey, w, h) {
  const key = `${styleKey || ''}|${(Number(w) || 0).toFixed(3)}|${(Number(h) || 0).toFixed(3)}`;
  if (_printedItemTextureCache3D.has(key)) return _printedItemTextureCache3D.get(key);

  const svg = printedItemSvgMarkup3D(styleKey, w, h);
  if (!svg) return null;

  const tex = new THREE.TextureLoader().load(svgDataUri(svg), texture => {
    texture.needsUpdate = true;
    if (threeRenderer && threeScene && threeCamera) {
      try { threeRenderer.render(threeScene, threeCamera); } catch (_) {}
    }
  });
  tex.flipY = true;
  tex.needsUpdate = true;
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  try {
    if (threeRenderer && threeRenderer.capabilities) tex.anisotropy = Math.min(4, threeRenderer.capabilities.getMaxAnisotropy());
  } catch (_) {}

  _printedItemTextureCache3D.set(key, tex);
  return tex;
}

/**
 * Build a canvas texture that renders the cladding pattern as engraved grooves
 * over the wall base colour. Returns a THREE.CanvasTexture or null if no style.
 *
 * @param {Object} cfg        - building config
 * @param {number} wallW      - wall face width  in mm
 * @param {number} wallH      - wall face height in mm
 * @param {Array}  openings   - [{x,y,w,h}] in wall-local 2D coords (y=0 top)
 * @param {boolean} flipX     - true for walls whose shape was built with mirrorX
 */
export function buildWallTexture(cfg, wallW, wallH, baseH, openings, flipX, styleKeyOverride) {
  const styleKey = styleKeyOverride || cfg.claddingStyle;
  const styleSpec = CLADDING_STYLES[styleKey];
  if (!styleSpec) return null;

  // The mesh's UV V maps shape coords directly: V = shape_y * (1/wallH). Canvas
  // y=0 (after flipY) maps to mesh shape y = wallH (the mesh's tallest point).
  // openings store op.y as the distance from the EDITOR wall top (= baseH in
  // shape coords). So a window's top in 3D sits at shape y = baseH - op.y, which
  // maps to canvas y = (wallH − baseH + op.y) * PX. We pre-compute that as
  // slopeRise so we can draw each opening at canvas y = (slopeRise + op.y) * PX.
  // For walls without a top extension (parapet, flat, low-side of a slanted
  // roof) slopeRise = 0 and behaviour matches the old single-arg call.
  const slopeRise = Math.max(0, wallH - (baseH != null ? baseH : wallH));

  // Pick pixel density so the largest canvas dimension stays ≤ 640 px
  const PX = Math.min(8, 640 / Math.max(wallW, wallH, 1));
  const cW  = Math.max(4, Math.round(wallW * PX));
  const cH  = Math.max(4, Math.round(wallH * PX));

  const canvas = document.createElement('canvas');
  canvas.width  = cW;
  canvas.height = cH;
  const ctx = canvas.getContext('2d');

  // ---- base wall colour ----
  // Use the material colour assigned to this cladding style, so the 3D
  // preview matches the material routing / swatch used by SVG exports.
  const baseHex = claddingColourHexForStyle(cfg, styleKey, '#cbbfa3');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, cW, cH);

  // ---- opening areas: slightly darker inset (windows and doors only, not structural slots) ----
  ctx.fillStyle = rgbaFromHex(shadeHexColour(baseHex, 0.35), 0.55);
  for (const op of openings) {
    if (op.type === 'connection') continue;  // structural slots – not a visual opening
    ctx.fillRect(op.x * PX, (op.y + slopeRise) * PX, op.w * PX, op.h * PX);
  }

  // ---- cladding groove lines (clipped around window/door cuts only) ----
  const cuts = openings
    .filter(op => op.type !== 'connection')
    .map(op => ({ x: op.x, y: op.y + slopeRise, w: op.w, h: op.h }));
  const lines = generateCladdingPattern(styleSpec, 0, 0, wallW, wallH, cuts);

  ctx.save();
  ctx.strokeStyle = shadeHexColour(baseHex, 0.62);
  ctx.lineWidth   = Math.max(0.4, PX * 0.18);   // scale line width with px density
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  for (const l of lines) {
    // canvas y=0 is top, line coords have y=0 at top → no y-flip needed
    ctx.moveTo(l.x1 * PX, l.y1 * PX);
    ctx.lineTo(l.x2 * PX, l.y2 * PX);
  }
  ctx.stroke();
  ctx.restore();

  // ---- optional second cladding style for ground floor ----
  if (cfg.firstFloorCladdingStyleEnabled && cfg.firstFloorCladdingStyle &&
      cfg.firstFloorCladdingStyle !== styleKey && lastPlan) {
    const gfH  = lastPlan.firstFloorHeight || cfg.floorHeight || 30;
    const gfY  = wallH - gfH;            // ground-floor top in wall-local coords
    const gfSpec = CLADDING_STYLES[cfg.firstFloorCladdingStyle];
    if (gfSpec) {
      const gfBaseHex = claddingColourHexForStyle(cfg, cfg.firstFloorCladdingStyle, baseHex);
      ctx.fillStyle = gfBaseHex;
      ctx.fillRect(0, Math.max(0, gfY) * PX, cW, Math.max(0, gfH) * PX);
      const gfCuts  = cuts.map(op => ({
        x: op.x, y: Math.max(0, op.y - gfY), w: op.w, h: op.h,
      })).filter(op => op.y + op.h > 0 && op.y < gfH);
      ctx.fillStyle = rgbaFromHex(shadeHexColour(gfBaseHex, 0.35), 0.55);
      for (const op of gfCuts) {
        ctx.fillRect(op.x * PX, (gfY + op.y) * PX, op.w * PX, op.h * PX);
      }
      const gfLines = generateCladdingPattern(gfSpec, 0, 0, wallW, gfH, gfCuts);
      ctx.save();
      ctx.strokeStyle = shadeHexColour(gfBaseHex, 0.62);
      ctx.lineWidth   = Math.max(0.4, PX * 0.18);
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      for (const l of gfLines) {
        ctx.moveTo(l.x1 * PX, (gfY + l.y1) * PX);
        ctx.lineTo(l.x2 * PX, (gfY + l.y2) * PX);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  // ExtrudeGeometry UVs are raw shape coords (mm): x ∈ [-wallW/2, +wallW/2], y ∈ [0, wallH].
  // CanvasTexture defaults to flipY=true, which flips the image vertically on GPU
  // upload — that flip combined with shape-Y-up-is-3D-Y-up means we want a
  // straight (non-inverted) V mapping:
  //   shape y=0 (3D bottom) → V=0 → canvas BOTTOM (where editor y=H content lives)
  //   shape y=wallH (3D top) → V=1 → canvas TOP    (where editor y=0 content lives)
  // The canvas is drawn with editor-Y-down (op.y=0 at canvas top), so canvas top
  // holds wall-top content — exactly what 3D top needs.
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(flipX ? -1 / wallW : 1 / wallW, 1 / wallH);
  tex.offset.set(0.5, 0);
  tex.needsUpdate = true;
  return tex;
}

/* ---- helpers ---- */
export { get3DWallProfileForFace };

export function doorOpeningAs3DBayDoor(op, fallbackStyle) {
  const styleKey = (op && op.style) || fallbackStyle;
  const style = styleKey ? DOOR_STYLES[styleKey] : null;
  if (!style || !style.rollingSlats) return null;
  // Legacy/current wall editor "Rolling shutter" is a DOOR_STYLES item,
  // but visually it should render like a bay shutter in 3D rather than
  // using the generic personnel-door pane path.
  return {
    x: op.x, y: op.y, w: op.w, h: op.h,
    type: 'bay',
    doorStyle: 'roller',
    doorPercentOpen: Number(op.doorPercentOpen) || 0,
    _fromRollingDoorStyle: styleKey,
  };
}

export function effective3DWindowStyleKey(cfg, op, isGround) {
  if (op && op.style) return op.style;
  if (isGround && cfg && cfg.firstFloorWindowStyleEnabled && cfg.firstFloorWindowStyle) {
    return cfg.firstFloorWindowStyle;
  }
  return (cfg && cfg.windowStyle) || 'industrial_small';
}

export function get3DWallOpenings(cfg, plan, face) {
  if (!plan) return [];
  const { H, matT, fbWidth, sideLen } = plan;
  const chamfer = plan.frontCornerChamfer || { enabled: false, westInset: 0, eastInset: 0, frontWidth: fbWidth, eastSideLen: sideLen, westSideLen: sideLen };
  const isChamferFace = face === 'front_chamfer_west' || face === 'front_chamfer_east';
  let wallW = (face === 'front' || face === 'back') ? fbWidth : sideLen;
  if (chamfer.enabled && face === 'front') wallW = chamfer.frontWidth;
  if (chamfer.enabled && face === 'east') wallW = chamfer.eastSideLen;
  if (chamfer.enabled && face === 'west') wallW = chamfer.westSideLen;
  if (chamfer.enabled && face === 'front_chamfer_west') wallW = chamfer.westDiagLen;
  if (chamfer.enabled && face === 'front_chamfer_east') wallW = chamfer.eastDiagLen;
  if (isChamferFace && !chamfer.enabled) return [];
  const hasBay = ((face === 'front' && plan.hasFrontBay) || (face === 'back' && plan.hasBackBay))
    && !(face === 'front' && chamfer.enabled);
  const bayH   = plan.bayHeight || 0;
  const shiftFrontOp = op => {
    if (face !== 'front' || !chamfer.enabled) return op;
    return { ...op, x: Number(op.x || 0) - (chamfer.westInset || 0) };
  };

  // Collect the structural wall holes (windows + doors) from EITHER manual or
  // auto, then ALWAYS append bay/wing-connection holes. Bay holes come from
  // the resolved plan (which derived them from manualOpenings entries);
  // wing-connection holes come from cfg.wings.
  // Use manualStructuralOps so a wall whose manualOpenings array contains
  // ONLY non-structural entries (bays, awnings, fixtures, balconies, cladding
  // overrides, printed items) still falls through to auto-mode window
  // computation. Without this, a default through-bay on front/back would
  // silently suppress all auto windows on those walls in the 3D preview.
  const manualRaw = manualStructuralOps(cfg, face);
  const manual = face === 'front' && chamfer.enabled && Array.isArray(manualRaw)
    ? manualRaw.map(shiftFrontOp).filter(op => (Number(op.x || 0) + Number(op.w || 0)) > 0 && Number(op.x || 0) < wallW)
    : manualRaw;
  let wins = [], doors = [];
  if (manual) {
    // Manual mode — only window + door cut through the wall. Awnings sit on
    // the surface; fixtures, balconies, cladding overrides, and printed items
    // are surface decoration (or don't penetrate). Etched windows don't cut.
    for (const op of manual) {
      if (op.type === 'window') {
        const style = op.style ? WINDOW_STYLES[op.style] : null;
        const placement = (style && style.placement) || 'opening';
        // Blanked windows of EITHER variant (etched outline or filled
        // panel) are kept out of the 3D hole list. blanked_etched isn't
        // a real hole in the laser cut either, so a 3D hole would be
        // wrong; blanked_filled IS cut in the laser path but a blanking
        // panel fills it from behind — in 3D we render that as a solid
        // dark panel on the wall surface (see getBlankedWindows3D), so
        // cutting a hole would just expose interior the panel would
        // hide anyway. Either way the result reads as "boarded-up" or
        // "painted-on" window, which is the whole point of the style.
        if (placement === 'etched' || placement === 'blanked') continue;
        wins.push({
          x: op.x, y: op.y, w: op.w, h: op.h, type: 'window',
          style: effective3DWindowStyleKey(cfg, op, false),
        });
      } else if (op.type === 'door') {
        const rollingBay = doorOpeningAs3DBayDoor(op, cfg.doorStyle);
        if (rollingBay) {
          doors.push(rollingBay);
        } else {
          doors.push({ x: op.x, y: op.y, w: op.w, h: op.h, type: 'door', style: op.style || cfg.doorStyle });
        }
      }
      // awning, balcony, fixture, cladding_override, printed_item → no hole
    }
  } else if (!isChamferFace) {
    // Auto mode — compute layout fresh
    const winDims = getWindowDims(cfg), gwDims = getGroundFloorWindowDims(cfg);
    const doorStyle = cfg.doorStyle;
    const dCnt = face === 'front' ? (cfg.frontDoorCount || 0)
               : face === 'back'  ? (cfg.backDoorCount  || 0)
               :                    (cfg.sideDoorCount  || 0);
    const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
    const doorRes = (dCnt > 0 && !hasBay) ? doorH + 3 : 0;
    const slotYs  = plan.slotYs || [], floorCYs = plan.floorCenterYs || [];
    const autoWins = computeWindows(wallW, H, {
      density: cfg.windowDensity, winDims, groundWinDims: gwDims,
      groundFloorCenterY: plan.groundFloorCenterY,
      hasOpening: hasBay, openingY: H - bayH, openingH: bayH,
      slotYs, floorCenterYs: floorCYs, parapetH: plan.parapetH,
      matT, doorReserveH: doorRes,
      cfg, plan, edgeId: face,
    });
    for (const w of autoWins) {
      wins.push({
        x: w.x, y: w.y, w: w.width, h: w.height, type: 'window',
        style: effective3DWindowStyleKey(cfg, null, !!w.isGround),
      });
    }
    if (!hasBay && dCnt > 0) {
      const autoDoors = computeDoors(wallW, H, { doorStyle, doorCount: dCnt, hasOpening: false, bayXStart: 0, bayXEnd: 0, cfg, plan, edgeId: face });
      for (const d of autoDoors) {
        const op = { x: d.x, y: d.y, w: d.width, h: d.height, style: doorStyle };
        const rollingBay = doorOpeningAs3DBayDoor(op, doorStyle);
        if (rollingBay) doors.push(rollingBay);
        else doors.push({ ...op, type: 'door' });
      }
    }
  }

  // Bay opening — independent of manual/auto mode for the structural opening list.
  // Embedded-rail bays are generated live from cfg.embeddedRails and keep a
  // marker flag so the 3D renderer can apply face-specific mirror correction
  // without changing the SVG/wall-editor coordinates. If a rail-generated bay
  // exists on this face, prefer it over the generic resolved-plan bay. The
  // resolved plan is still used for normal/manual bay openings.
  const bayHoles = [];
  const railBayOps3D = isChamferFace ? [] : embeddedRailBayOpsForFace(cfg, face, { coordSpace: 'physical' });
  if (railBayOps3D.length) {
    for (const rb of railBayOps3D) {
      bayHoles.push({ ...rb, type: 'bay' });
    }
  } else if (hasBay && plan.bayXStart != null && plan.bayXEnd != null) {
    // Preserve bay-door metadata for the 3D preview. The structural plan only
    // tells us where the bay hole is; the actual door panel style/open amount
    // lives on the wall feature. For through-bays, the opposite wall may be
    // the canonical/manual source, so fall back to the paired face when needed.
    const faceBay = findBayOnFace(cfg, face);
    const pairedFace = face === 'front' ? 'back'
                    : face === 'back'  ? 'front'
                    : face === 'east'  ? 'west'
                    : face === 'west'  ? 'east'
                    : null;
    const pairedBay = pairedFace ? findBayOnFace(cfg, pairedFace) : null;
    const bayDoorSrc = faceBay || (pairedBay && pairedBay.style === 'through' ? pairedBay : null) || {};
    bayHoles.push({
      x: plan.bayXStart, y: H - bayH,
      w: plan.bayXEnd - plan.bayXStart, h: bayH,
      type: 'bay',
      doorStyle: bayDoorSrc.doorStyle || 'none',
      doorPercentOpen: Number(bayDoorSrc.doorPercentOpen) || 0,
    });
  } else if (!isChamferFace) {
    const faceBay = findBayOnFace(cfg, face);
    if (faceBay) {
      const bw = Math.max(0, Math.min(wallW, Number(faceBay.w) || 0));
      const bh = Math.max(0, Math.min(H, Number(faceBay.h) || 0));
      if (bw > 0 && bh > 0) {
        bayHoles.push({
          x: Math.max(0, Math.min(wallW - bw, Number(faceBay.x) || 0)),
          y: Math.max(0, H - bh),
          w: bw,
          h: bh,
          type: 'bay',
          doorStyle: faceBay.doorStyle || 'none',
          doorPercentOpen: Number(faceBay.doorPercentOpen) || 0,
        });
      }
    }
  }

  // Wing connection holes — punch openings where a wing attaches
  const wingHoles = [];
  for (const wing of (isChamferFace ? [] : (cfg.wings || []))) {
    if (wing.face !== face) continue;
    const bounds = weWingBounds(cfg, wing);
    const wCfg   = buildWingCfg(cfg, wing);
    const wH     = wCfg.height;
    let hx, hw;
    if (face === 'east' || face === 'west') {
      hx = Math.max(0, bounds.y - matT);
      hw = Math.min(wallW, bounds.y + bounds.d - matT) - hx;
    } else {
      hx = Math.max(0, face === 'front' && chamfer.enabled ? bounds.x - (chamfer.westInset || 0) : bounds.x);
      hw = Math.min(wallW, (face === 'front' && chamfer.enabled ? bounds.x - (chamfer.westInset || 0) : bounds.x) + bounds.w) - hx;
    }
    if (hw > 0) wingHoles.push({ x: hx, y: 0, w: hw, h: wH, type: 'connection' });
  }

  return [...wins, ...doors, ...bayHoles, ...wingHoles];
}

/**
 * Return blanked-window rectangles on a wall, in wall-local (x, y, w, h)
 * coords (same convention as get3DWallOpenings). Used by the 3D scene to
 * place a solid darker panel where each blanked window sits, so blanked
 * windows read as boarded-up / painted-over rather than as see-through
 * glass.
 *
 * Two flavours both qualify (style.placement === 'etched' OR 'blanked'):
 *   • blanked_etched — etched outline on the cladding, no cut. The dark
 *     panel sits flush with the cladding surface.
 *   • blanked_filled — laser DOES cut a hole, but a blanking panel fills
 *     it from behind. The dark panel covers the would-be hole. (Note:
 *     get3DWallOpenings filters these out of the hole list above, so the
 *     wall mesh stays solid in 3D too — no need to render through.)
 *
 * Auto-generated windows are never blanked; this only looks at the
 * manual-mode opening list. Returns [] when no manual openings exist on
 * the face. */
export function getBlankedWindows3D(cfg, face) {
  const manual = structuralWallFeaturesForFace(cfg, face);
  if (!manual.length) return [];
  const plan = buildEdgePlans(cfg);
  const chamfer = plan.frontCornerChamfer || { enabled: false, westInset: 0, frontWidth: plan.fbWidth };
  let wallW = face === 'front' && chamfer.enabled ? chamfer.frontWidth : plan.fbWidth;
  if (chamfer.enabled && face === 'front_chamfer_west') wallW = chamfer.westDiagLen;
  if (chamfer.enabled && face === 'front_chamfer_east') wallW = chamfer.eastDiagLen;
  const out = [];
  for (const op of manual) {
    if (op.type !== 'window') continue;
    const style = op.style ? WINDOW_STYLES[op.style] : null;
    const placement = (style && style.placement) || 'opening';
    if (placement !== 'etched' && placement !== 'blanked') continue;
    const x = face === 'front' && chamfer.enabled ? Number(op.x || 0) - (chamfer.westInset || 0) : op.x;
    if (face === 'front' && chamfer.enabled && (x + Number(op.w || 0) <= 0 || x >= wallW)) continue;
    out.push({
      x, y: op.y, w: op.w, h: op.h,
      style: effective3DWindowStyleKey(cfg, op, false),
    });
  }
  return out;
}

/**
 * Build one wall panel mesh using THREE.Shape with rectangular holes for each opening.
 * wallW / wallH in mm; the shape is centred at x=0, y spans 0..wallH.
 * `baseH` is the editor's wall height — the reference from which opening op.y values
 * are measured. For walls with no slope extension this equals wallH; for the
 * high-side wall of a slanted NS-axis roof the mesh extends ABOVE baseH by sPitch
 * (wallH = baseH + sPitch) but openings stay anchored to baseH so they line up
 * with the editor and with the glass-pane positions below (which also use baseH).
 * If mirrorX is true the hole x-coords are flipped (used for walls viewed in reverse).
 */
export function buildWallMesh3D(wallW, wallH, baseH, thickness, openings, material, mirrorX, texture, gablePitch, slantPitch) {
  const shape = new THREE.Shape();
  shape.moveTo(-wallW / 2, 0);
  shape.lineTo( wallW / 2, 0);
  // Top edge: flat, gable-peaked, or slanted
  if (gablePitch && gablePitch > 0) {
    shape.lineTo( wallW / 2, wallH);
    shape.lineTo(0, wallH + gablePitch);   // apex of gable triangle
    shape.lineTo(-wallW / 2, wallH);
  } else if (slantPitch && slantPitch !== 0) {
    // slantPitch > 0 → right side (+wallW/2) is taller; < 0 → left side is taller
    const hR = wallH + Math.max(0,  slantPitch);
    const hL = wallH + Math.max(0, -slantPitch);
    shape.lineTo( wallW / 2, hR);
    shape.lineTo(-wallW / 2, hL);
  } else {
    shape.lineTo( wallW / 2, wallH);
    shape.lineTo(-wallW / 2, wallH);
  }
  shape.closePath();

  for (const op of openings) {
    const hx = mirrorX ? wallW / 2 - op.x - op.w : op.x - wallW / 2;
    const hy = baseH - op.y - op.h;   // op.y is from BASE top (editor convention)
    const hole = new THREE.Path();
    hole.moveTo(hx,        hy);
    hole.lineTo(hx + op.w, hy);
    hole.lineTo(hx + op.w, hy + op.h);
    hole.lineTo(hx,        hy + op.h);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });

  // Use a single material with the texture so it applies regardless of ExtrudeGeometry group layout
  let mat;
  if (texture) {
    // Texture already encodes the material colour and cladding grooves, so
    // use white here to avoid double-tinting the canvas texture.
    mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: material.roughness != null ? material.roughness : 0.82,
      metalness: material.metalness != null ? material.metalness : 0.0,
      side: material.side || THREE.DoubleSide,
    });
  } else {
    mat = material;
  }

  return new THREE.Mesh(geo, mat);
}

function frameThreePreviewObject(object) {
  if (!object || !threeCamera) return;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = Math.max(90, maxDim * 1.55);
  const verticalLift = Math.max(size.y * 0.45, 35);

  threeCamera.position.set(
    center.x + distance * 0.72,
    center.y + verticalLift,
    center.z + distance * 0.72
  );
  threeCamera.near = Math.max(0.25, maxDim / 700);
  threeCamera.far = Math.max(1000, maxDim * 7);
  threeCamera.updateProjectionMatrix();

  if (threeControls) {
    threeControls.target.copy(center);
    threeControls.update();
  } else {
    threeCamera.lookAt(center);
  }
}

/**
 * Add a thin glass pane inside each window opening.
 * Positioned coplanar with the outer face of the wall.
 */
export function addWindowGlass3D(group, wallW, wallH, wallZPos, wallRot, openings, glassMat, mirrorX) {
  for (const op of openings) {
    if (op.type !== 'window') continue;
    const gx = mirrorX ? wallW / 2 - op.x - op.w : op.x - wallW / 2;
    const gy = wallH - op.y - op.h;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(op.w, op.h),
      glassMat
    );
    // Centre the pane in the opening, offset it 0.1mm above the outer wall face
    pane.position.set(gx + op.w / 2, gy + op.h / 2, 0.1);
    if (wallRot !== undefined) pane.rotation.y = wallRot;

    // Apply same world transform as the wall
    const dummy = new THREE.Object3D();
    dummy.rotation.y = wallRot || 0;
    dummy.position.copy(wallZPos);
    dummy.add(pane);
    group.add(dummy);
  }
}

/**
 * Construct a Three.js Group representing one piece of rooftop equipment,
 * styled to match the 3D-printed STL emitted by the build (same shape,
 * same proportions, same detail elements — louvers, fan rings, FRP panel
 * seams, mast tip, etc.). The returned group's origin is at the centre of
 * the equipment footprint at deck level (y=0), so the caller just needs to
 * translate the group to the deck-top world position.
 *
 *   • box_louvered (AC condensers): main box body with louver ridges on
 *     the front (-Z) face and a small fan circle on top.
 *   • cooling_tower: tapered body with vertical louver ridges on all four
 *     sides, fan housing cylinder and hub on top.
 *   • tank_round_legged: short cylinder body + tapered dome top + vent
 *     stack, raised on four box legs at the tank's perimeter.
 *   • tank_square_legged: rectangular FRP tank on four corner legs, with
 *     a small vent on top.
 *   • mushroom: vertical stack with a wider cap (cylinder + frustum).
 *   • cabinet_tall: tall narrow box with a horizontal door divider on the
 *     front face and an overhanging top cap.
 *   • antenna: small square base with a thin tall mast and capped tip.
 *
 * @param {Object} item   - one rooftopItems entry with equipKey
 * @returns {THREE.Group | null}
 */
export function build3DEquipMesh(item) {
  if (!item || !item.equipKey) return null;
  const eq = ROOFTOP_EQUIPMENT[item.equipKey];
  if (!eq) return null;
  const w = eq.w, d = eq.d, h = eq.h;
  const group = new THREE.Group();

  // Shared material palette — chosen to read against the roof's dark grey
  // and to give each shape's primary surface a distinct hue/finish.
  const housingMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.7, metalness: 0.15 });
  const accentMat  = new THREE.MeshStandardMaterial({ color: 0x5a6066, roughness: 0.6, metalness: 0.2 });
  const fanMat     = new THREE.MeshStandardMaterial({ color: 0x404448, roughness: 0.5, metalness: 0.3 });
  const tankMat    = new THREE.MeshStandardMaterial({ color: 0xe0dccc, roughness: 0.85, metalness: 0.05 });
  const legMat     = new THREE.MeshStandardMaterial({ color: 0x383c40, roughness: 0.6, metalness: 0.4 });
  const ventMat    = new THREE.MeshStandardMaterial({ color: 0x707478, roughness: 0.6, metalness: 0.25 });
  const cabMat     = new THREE.MeshStandardMaterial({ color: 0xc4b890, roughness: 0.75, metalness: 0.1 });

  switch (eq.shape) {
    case 'box_louvered': {
      const det = eq.details || {};
      const louverCount = det.louverCount || 5;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), housingMat);
      body.position.y = h / 2;
      group.add(body);
      // Louver ridges on the -Z (front) face. Modeled as thin slabs
      // protruding slightly; matches the STL's `tris.box` ridge pattern.
      const louverGap = h * 0.15;
      const louverHeight = Math.max(0.4, (h - 2 * louverGap) / louverCount);
      const ridgeH = Math.max(0.15, louverHeight * 0.5);
      for (let i = 0; i < louverCount; i++) {
        const yMid = louverGap + (i + 0.5) * louverHeight;
        const louver = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.8, ridgeH, 0.2),
          accentMat
        );
        louver.position.set(0, yMid, -d / 2 - 0.1);
        group.add(louver);
      }
      // Small fan circle on top.
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.min(w, d) * 0.3, Math.min(w, d) * 0.3, 0.4, 12),
        fanMat
      );
      fan.position.y = h + 0.2;
      group.add(fan);
      break;
    }
    case 'cooling_tower': {
      const det = eq.details || {};
      const fanR = det.fanRadius  || Math.min(w, d) * 0.3;
      const fanH = det.fanHeight  || 1.5;
      const bodyH = h - fanH;
      const louverCount = det.louverCount || 8;
      // Main body.
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), housingMat);
      body.position.y = bodyH / 2;
      group.add(body);
      // Vertical louver ridges on +/-Z faces.
      const louverGap = bodyH * 0.1;
      for (let i = 0; i < louverCount; i++) {
        const xMid = -w / 2 + (i + 0.5) * (w / louverCount);
        const ridgeW = (w / louverCount) * 0.4;
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(ridgeW, bodyH - 2 * louverGap, 0.2),
          accentMat
        );
        ridge.position.set(xMid, bodyH / 2, -d / 2 - 0.1);
        group.add(ridge);
        const back = ridge.clone();
        back.position.z = d / 2 + 0.1;
        group.add(back);
      }
      // Fan housing cylinder + hub on top.
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(fanR, fanR, fanH, 16),
        fanMat
      );
      fan.position.y = bodyH + fanH / 2;
      group.add(fan);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(fanR * 0.25, fanR * 0.25, 0.3, 8),
        accentMat
      );
      hub.position.y = bodyH + fanH + 0.15;
      group.add(hub);
      break;
    }
    case 'tank_round_legged': {
      const det = eq.details || {};
      const tankR = det.tankRadius || Math.min(w, d) / 2;
      const tankH = det.tankHeight || h * 0.8;
      const legH  = det.legHeight  || (h - tankH);
      const legCount = det.legCount || 4;
      const legSize = 0.4;
      const legR = Math.max(0.5, tankR - legSize);
      // Legs.
      for (let i = 0; i < legCount; i++) {
        const ang = (i / legCount) * Math.PI * 2;
        const cx = legR * Math.cos(ang);
        const cz = legR * Math.sin(ang);
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(legSize, legH, legSize),
          legMat
        );
        leg.position.set(cx, legH / 2, cz);
        group.add(leg);
      }
      // Tank body (cylinder).
      const bodyTankH = tankH * 0.85;
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR, tankR, bodyTankH, 16),
        tankMat
      );
      tank.position.y = legH + bodyTankH / 2;
      group.add(tank);
      // Top dome (frustum) tapering to a narrower top.
      const domeH = tankH - bodyTankH;
      const dome = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR * 0.7, tankR, domeH, 16),
        tankMat
      );
      dome.position.y = legH + bodyTankH + domeH / 2;
      group.add(dome);
      // Small vent stack on top.
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(tankR * 0.15, tankR * 0.15, 0.6, 8),
        ventMat
      );
      vent.position.y = legH + tankH + 0.3;
      group.add(vent);
      break;
    }
    case 'tank_square_legged': {
      const det = eq.details || {};
      const tankH = det.tankH || h * 0.75;
      const legH  = det.legH  || (h - tankH);
      const legSize = 0.5;
      const corners = [
        [-w/2 + legSize/2, -d/2 + legSize/2],
        [ w/2 - legSize/2, -d/2 + legSize/2],
        [-w/2 + legSize/2,  d/2 - legSize/2],
        [ w/2 - legSize/2,  d/2 - legSize/2],
      ];
      for (const [cx, cz] of corners) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legSize, legH, legSize), legMat);
        leg.position.set(cx, legH / 2, cz);
        group.add(leg);
      }
      // Tank body.
      const tank = new THREE.Mesh(new THREE.BoxGeometry(w, tankH, d), tankMat);
      tank.position.y = legH + tankH / 2;
      group.add(tank);
      // Panel seams: faint cross on front & back faces.
      const seamH = 0.08;
      const seamFront = new THREE.Mesh(new THREE.BoxGeometry(w, seamH, 0.15), accentMat);
      seamFront.position.set(0, legH + tankH * 0.5, -d / 2 - 0.075);
      group.add(seamFront);
      const seamFrontV = new THREE.Mesh(new THREE.BoxGeometry(0.08, tankH, 0.15), accentMat);
      seamFrontV.position.set(0, legH + tankH / 2, -d / 2 - 0.075);
      group.add(seamFrontV);
      const seamBack = seamFront.clone();  seamBack.position.z = d / 2 + 0.075;
      const seamBackV = seamFrontV.clone(); seamBackV.position.z = d / 2 + 0.075;
      group.add(seamBack); group.add(seamBackV);
      // Vent on top.
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8),
        ventMat
      );
      vent.position.y = legH + tankH + 0.25;
      group.add(vent);
      break;
    }
    case 'mushroom': {
      const det = eq.details || {};
      const stackR = det.stackRadius || 1.0;
      const stackH = det.stackHeight || h * 0.7;
      const capR   = det.capRadius   || stackR * 1.6;
      const capH   = det.capHeight   || (h - stackH);
      // Stack.
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(stackR, stackR, stackH, 12),
        ventMat
      );
      stack.position.y = stackH / 2;
      group.add(stack);
      // Cap base.
      const capCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(capR, capR, capH * 0.3, 12),
        accentMat
      );
      capCyl.position.y = stackH + capH * 0.15;
      group.add(capCyl);
      // Cap top tapering up.
      const capTop = new THREE.Mesh(
        new THREE.CylinderGeometry(capR * 0.6, capR, capH * 0.7, 12),
        accentMat
      );
      capTop.position.y = stackH + capH * 0.3 + (capH * 0.7) / 2;
      group.add(capTop);
      break;
    }
    case 'cabinet_tall': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cabMat);
      body.position.y = h / 2;
      group.add(body);
      // Door divider on front (-Z).
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.08, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x4a4030 })
      );
      divider.position.set(0, h * 0.5, -d / 2 - 0.075);
      group.add(divider);
      // Door handle bumps.
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x202020, metalness: 0.6 });
      for (const yPos of [h * 0.4, h * 0.65]) {
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.1, 0.15),
          handleMat
        );
        handle.position.set(0, yPos, -d / 2 - 0.075);
        group.add(handle);
      }
      // Top cap (overhanging slightly).
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.3, 0.2, d + 0.3),
        cabMat
      );
      cap.position.y = h - 0.1;
      group.add(cap);
      break;
    }
    case 'antenna': {
      const det = eq.details || {};
      const baseW = det.baseW || w;
      const baseH = det.baseH || 1.0;
      const mastR = det.mastRadius || 0.3;
      const mastH = det.mastHeight || (h - baseH);
      const baseMat3D = new THREE.MeshStandardMaterial({ color: 0x303035, metalness: 0.4 });
      const mastMat3D = new THREE.MeshStandardMaterial({ color: 0x202025, metalness: 0.5 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), baseMat3D);
      base.position.y = baseH / 2;
      group.add(base);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(mastR, mastR, mastH, 8),
        mastMat3D
      );
      mast.position.y = baseH + mastH / 2;
      group.add(mast);
      // Tip cap.
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(mastR * 1.3, mastR * 1.3, 0.3, 6),
        mastMat3D
      );
      tip.position.y = baseH + mastH - 0.15;
      group.add(tip);
      break;
    }
    default: {
      const fallback = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), housingMat);
      fallback.position.y = h / 2;
      group.add(fallback);
    }
  }
  return group;
}

/* ---- STL preview helpers ---- */

export function triListToThreeGeometry(tris, opts = {}) {
  if (!tris || !Array.isArray(tris.tris) || tris.tris.length === 0) return null;
  const verts = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const tri of tris.tris) {
    for (const p of tri) {
      // STL generation uses X=width, Y=depth, Z=up.
      // Three preview uses X=width, Y=up, Z=depth.
      const x = Number(p[0]) || 0;
      const y = Number(p[2]) || 0;
      const z = Number(p[1]) || 0;
      verts.push(x, y, z);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  geom.computeBoundingBox();

  if (opts.center !== false) {
    // Centre horizontally around world origin, keep the bottom on Y=0.
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const y0 = minY;
    const pos = geom.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) - cx, pos.getY(i) - y0, pos.getZ(i) - cz);
    }
    pos.needsUpdate = true;
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }
  return geom;
}

export function stlTriListToMesh(tris, material, opts = {}) {
  const geom = triListToThreeGeometry(tris, opts);
  if (!geom) return null;
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildGeneratedStlPreviewGroup(cfg) {
  const group = new THREE.Group();
  group.name = 'Generated STL Preview';

  const stlMat = new THREE.MeshStandardMaterial({
    color: 0x95a0a6,
    roughness: 0.78,
    metalness: 0.02,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x4c5960,
    transparent: true,
    opacity: 0.32,
  });

  const tris = generateBuildingStl(cfg);
  const mesh = stlTriListToMesh(tris, stlMat, { center: true });
  if (mesh) {
    group.add(mesh);

    // Add a subtle edge overlay so openings and separate boxes are readable,
    // while keeping the preview solid-shaded rather than wireframe-only.
    try {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 35), edgeMat);
      group.add(edges);
    } catch (_) { /* edge overlay is optional */ }
  }

  // The STL export also includes individual equipment STLs under /equipment.
  // The building preview STL contains simple footprint boxes for those
  // placements; add the exact printable equipment STL shapes as a light
  // overlay so the preview shows both exported STL outputs.
  try {
    const plan = buildEdgePlans(cfg);
    const t = cfg.coreThickness || 1.5;
    const isParapet = cfg.roofStyle === 'parapet';
    const roofW = isParapet ? (cfg.width - 2 * t) : cfg.width;
    const roofD = isParapet ? (cfg.depth - 2 * t) : cfg.depth;
    const deckTop = (plan.H || wallBodyHeightFromConfig(cfg)) + t;
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xd0c3a0,
      roughness: 0.72,
      metalness: 0.08,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    for (const p of (plan.rooftopEquipPlacements || [])) {
      const eqTris = generateEquipmentStl(p.key);
      const eqMesh = stlTriListToMesh(eqTris, eqMat, { center: true });
      if (!eqMesh) continue;
      const cx = (p.x + p.w / 2) - roofW / 2;
      const cz = (p.y + p.d / 2) - roofD / 2;
      eqMesh.position.set(cx, deckTop + 0.05, cz);
      eqMesh.name = 'Equipment STL: ' + p.key;
      group.add(eqMesh);
    }
  } catch (e) {
    logger.warn('Equipment STL preview overlay failed:', e);
  }

  return group;
}

/* ---- main preview builder ---- */

export function buildHakoMachiBuildingPreviewGroup(cfg, opts = {}) {
  upgradeConfigToCurrentStorage(cfg);
  const includeStlOverlay = opts.includeStlOverlay ?? threePreviewUseStlGeometry;

  // Use lastPlan if available; otherwise compute it fresh
  // Always rebuild to avoid stale plan / ghost windows mismatch with current cfg
  const plan = buildEdgePlans(cfg);
  const { H, matT, fbWidth, sideLen } = plan;

  const w = fbWidth;     // full front/back wall width
  const d = cfg.depth;
  const h = H;
  const t = cfg.coreThickness || 1.5;
  const chamfer = plan.frontCornerChamfer || { enabled: false, westInset: 0, eastInset: 0, frontWidth: w, eastSideLen: sideLen, westSideLen: sideLen, westDiagLen: 0, eastDiagLen: 0 };
  const frontWallW = chamfer.enabled ? chamfer.frontWidth : w;
  const frontCenterX = chamfer.enabled ? ((chamfer.westInset || 0) - (chamfer.eastInset || 0)) / 2 : 0;
  const eastWallLen = chamfer.enabled ? chamfer.eastSideLen : sideLen;
  const westWallLen = chamfer.enabled ? chamfer.westSideLen : sideLen;
  const eastWallCenterZ = chamfer.enabled ? (chamfer.eastInset || 0) / 2 : 0;
  const westWallCenterZ = chamfer.enabled ? (chamfer.westInset || 0) / 2 : 0;

  const wallMat = material3DForId(cfg, 'cladding', { roughness: 0.8 }, 0xc9b89b);
  const roofMat = material3DForId(cfg, 'core', { roughness: 0.9 }, 0x666666);
  const glassMat = material3DForId(cfg, 'window', {
    transparent: true, opacity: 0.45,
    roughness: 0.1, metalness: 0.05, side: THREE.DoubleSide,
  }, 0x88bbdd);

  const windowMatCache3D = new Map();
  function getWindowMaterial3D(styleKey, winW, winH) {
    const key = `${styleKey || 'industrial_small'}|${winW}|${winH}`;
    if (windowMatCache3D.has(key)) return windowMatCache3D.get(key);

    const style = WINDOW_STYLES[styleKey] || WINDOW_STYLES.industrial_small || {};
    const cw = Math.max(128, Math.round((winW || style.width || 8) * 30));
    const ch = Math.max(96, Math.round((winH || style.height || 8) * 30));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    // Match the exact style preview logic used by the window SVG body, so the
    // live 3D preview reflects the real style (mullions, sliders, blanked
    // variants, mushiko, yukimi, etc.) instead of generic glass.
    const body = buildWindowSvgBody(style, winW || style.width || 8, winH || style.height || 8, {
      strokeWidth: 0.32,
      stroke: style.frameColor || '#2a64aa',
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${winW || style.width || 8} ${winH || style.height || 8}">${body}</svg>`;
    const img = new Image();
    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      tex.needsUpdate = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

    const placement = style.placement || 'opening';
    const isOpaqueBlanked = placement === 'blanked' || placement === 'etched';
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: !isOpaqueBlanked,
      alphaTest: isOpaqueBlanked ? 0.0 : 0.02,
      opacity: isOpaqueBlanked ? 1.0 : 0.95,
      roughness: isOpaqueBlanked ? 0.88 : 0.18,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    windowMatCache3D.set(key, mat);
    return mat;
  }

  const doorMatCache3D = new Map();
  function getDoorMaterial3D(styleKey, doorW, doorH) {
    const key = `${styleKey || 'single'}|${doorW}|${doorH}`;
    if (doorMatCache3D.has(key)) return doorMatCache3D.get(key);

    const style = DOOR_STYLES[styleKey] || DOOR_STYLES.single || {};
    const cw = Math.max(128, Math.round((doorW || 7) * 28));
    const ch = Math.max(192, Math.round((doorH || 18) * 28));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    const baseFill = style.panelFill
      || (style.rollingSlats ? '#90979f'
      : ((style.glassPanes && style.glassPanes.length) ? '#6b573f' : '#6c4f39'));
    const frameStroke = style.frameColor || (style.rollingSlats ? '#555d65' : '#2e241c');
    const panelFill = style.panelFill || '#7b6148';
    const accentFill = '#4c3828';
    const glassFill = style.glassFill || 'rgba(155, 201, 230, 0.82)';
    const glassStroke = 'rgba(78, 108, 132, 0.95)';

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = baseFill;
    ctx.fillRect(0, 0, cw, ch);

    const sx = cw / Math.max(1, doorW || 1);
    const sy = ch / Math.max(1, doorH || 1);
    const px = v => v * sx;
    const py = v => v * sy;

    function strokeRectMM(x1, y1, x2, y2, widthPx = 2, stroke = frameStroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = widthPx;
      ctx.strokeRect(px(x1), py(y1), px(x2 - x1), py(y2 - y1));
    }
    function fillRectMM(x1, y1, x2, y2, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(px(x1), py(y1), px(x2 - x1), py(y2 - y1));
    }
    function lineMM(x1, y1, x2, y2, widthPx = 2, stroke = frameStroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = widthPx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1));
      ctx.lineTo(px(x2), py(y2));
      ctx.stroke();
    }
    function circleMM(cx, cy, r, fill = accentFill) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px(cx), py(cy), Math.max(1.2, ((sx + sy) * 0.5) * r), 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer door outline/frame.
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = Math.max(2, Math.round(cw * 0.012));
    ctx.strokeRect(1.5, 1.5, cw - 3, ch - 3);

    if (style.centerSplit) {
      lineMM((doorW || 1) / 2, 0.8, (doorW || 1) / 2, (doorH || 1) - 0.8, Math.max(2, cw * 0.008), frameStroke);
    }

    if (style.rollingSlats) {
      const insetX = 0.7, insetY = 1.0;
      strokeRectMM(insetX, insetY, (doorW || 1) - insetX, (doorH || 1) - 0.7, Math.max(2, cw * 0.01), frameStroke);
      const slatStep = Math.max(3, Math.round(py(0.9)));
      ctx.strokeStyle = '#69717a';
      ctx.lineWidth = Math.max(1, Math.round(ch * 0.004));
      for (let y = py(1.5); y < py((doorH || 1) - 1.2); y += slatStep) {
        ctx.beginPath();
        ctx.moveTo(px(0.8), y);
        ctx.lineTo(px((doorW || 1) - 0.8), y);
        ctx.stroke();
      }
    }

    for (const gp of (style.glassPanes || [])) {
      fillRectMM(gp.x1, gp.y1, gp.x2, gp.y2, glassFill);
      strokeRectMM(gp.x1, gp.y1, gp.x2, gp.y2, Math.max(2, cw * 0.007), glassStroke);
    }

    for (const feat of (style.features || [])) {
      switch (feat.type) {
        case 'panel':
          fillRectMM(feat.x1, feat.y1, feat.x2, feat.y2, panelFill);
          strokeRectMM(feat.x1, feat.y1, feat.x2, feat.y2, Math.max(1.5, cw * 0.006), frameStroke);
          break;
        case 'knob':
          circleMM(feat.cx, feat.cy, feat.r || 0.3, '#c9b072');
          break;
        case 'handle':
          lineMM(feat.x1, feat.y1, feat.x2, feat.y2, Math.max(3, cw * 0.012), '#dad7d1');
          break;
        case 'crashBar':
          lineMM(feat.x1, feat.y, feat.x2, feat.y, Math.max(3, cw * 0.013), '#cfd3d8');
          break;
        case 'kickPlate':
        case 'lockPlate':
          fillRectMM(feat.x1, feat.y1, feat.x2, feat.y2, '#b8aa96');
          strokeRectMM(feat.x1, feat.y1, feat.x2, feat.y2, Math.max(1.5, cw * 0.005), '#7c7266');
          break;
        case 'track':
          lineMM(0.6, feat.y, (doorW || 1) - 0.6, feat.y, Math.max(2, cw * 0.009), '#4b5158');
          break;
        case 'rail':
          lineMM(feat.x1, feat.y1, feat.x2, feat.y2, feat.thick ? Math.max(3, cw * 0.012) : Math.max(2, cw * 0.008), frameStroke);
          break;
        case 'latticeVertical': {
          const count = Math.max(4, Math.floor((feat.x2 - feat.x1) / 0.9));
          for (let i = 0; i <= count; i++) {
            const x = feat.x1 + (feat.x2 - feat.x1) * (i / count);
            lineMM(x, feat.y1, x, feat.y2, Math.max(1.5, cw * 0.005), frameStroke);
          }
          break;
        }
        case 'hikite':
          strokeRectMM(feat.x1, feat.y1, feat.x2, feat.y2, Math.max(1.5, cw * 0.005), frameStroke);
          break;
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: style.rollingSlats ? 0.72 : 0.84,
      metalness: style.rollingSlats ? 0.22 : 0.05,
      side: THREE.DoubleSide,
    });
    doorMatCache3D.set(key, mat);
    return mat;
  }

  const bayDoorMatCache3D = new Map();
  function getBayDoorMaterial3D(styleKey, panelW, panelH) {
    const key = `${styleKey || 'none'}|${Math.round((panelW || 0) * 100)}|${Math.round((panelH || 0) * 100)}`;
    if (bayDoorMatCache3D.has(key)) return bayDoorMatCache3D.get(key);

    const style = BAY_DOOR_STYLES[styleKey];
    const cw = Math.max(192, Math.round((panelW || 20) * 18));
    const ch = Math.max(192, Math.round((panelH || 20) * 18));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const sx = cw / Math.max(1, panelW || 1);
    const sy = ch / Math.max(1, panelH || 1);
    const px = v => v * sx;
    const py = v => v * sy;

    const isMetal = styleKey !== 'slatted';
    const baseFill = isMetal ? '#8e969d' : '#7b5738';
    const frameStroke = isMetal ? '#4b535a' : '#3c2919';
    const featureStroke = isMetal ? '#626b73' : '#4a3120';
    const tintFill = isMetal ? 'rgba(64,72,80,0.18)' : 'rgba(45,30,20,0.18)';

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = baseFill;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = Math.max(2, Math.round(Math.min(cw, ch) * 0.012));
    ctx.strokeRect(1.5, 1.5, cw - 3, ch - 3);

    function lineMM(x1, y1, x2, y2, widthPx = 2, stroke = featureStroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = widthPx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1));
      ctx.lineTo(px(x2), py(y2));
      ctx.stroke();
    }
    function rectMM(x, y, w, h, fill = null, stroke = featureStroke) {
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(px(x), py(y), px(w), py(h));
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.5, Math.round(Math.min(cw, ch) * 0.007));
      ctx.strokeRect(px(x), py(y), px(w), py(h));
    }
    function circleMM(cx, cy, r, fill = featureStroke) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px(cx), py(cy), Math.max(1.5, ((sx + sy) * 0.5) * r), 0, Math.PI * 2);
      ctx.fill();
    }

    // Use the bay-door style's own etch recipe instead of the regular door
    // material. This prevents a roller/sectional bay from rendering as a
    // stretched pedestrian door in the 3D preview.
    const features = (style && typeof style.etchFn === 'function') ? style.etchFn(panelW || 1, panelH || 1) : [];
    for (const f of features) {
      if (!f) continue;
      if (f.type === 'line') {
        lineMM(f.x1, f.y1, f.x2, f.y2, Math.max(1.5, Math.round(Math.min(cw, ch) * 0.006)));
      } else if (f.type === 'rect') {
        rectMM(f.x, f.y, f.w, f.h, f.tint ? tintFill : null);
      } else if (f.type === 'circle') {
        circleMM(f.cx, f.cy, f.r || 0.18);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: isMetal ? 0.62 : 0.82,
      metalness: isMetal ? 0.28 : 0.03,
      side: THREE.DoubleSide,
    });
    bayDoorMatCache3D.set(key, mat);
    return mat;
  }

  function visibleBayDoorPanel3D(op) {
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
      return { ...op, type: 'baydoor', x: op.x, y: op.y, w: panelW, h: op.h, _bayDoorStyle: styleKey };
    }
    // Overhead/roller/sectional/tilt-up: visible fabric remains anchored to
    // the bottom of the bay opening as the door retracts upward.
    const panelH = Math.max(0, Number(op.h || 0) * remain);
    if (panelH <= 0.2) return null;
    return { ...op, type: 'baydoor', x: op.x, y: op.y + op.h - panelH, w: op.w, h: panelH, _bayDoorStyle: styleKey };
  }
  const group = new THREE.Group();

  // ---- Inter-floor divider preview ----
  // These are the horizontal floor/ceiling divider plates generated between
  // storeys. Wall SVGs already cut the matching slots; this makes the stack
  // visible in the live 3D preview as both a faint internal slab and a thin
  // exterior edge line around the block.
  function addInterFloorDividersPreview3D(blockCfg, blockPlan, blockW, blockD, blockH, blockCX = 0, blockCZ = 0, labelPrefix = 'Main') {
    const ys = Array.isArray(blockPlan && blockPlan.interFloorYs) ? blockPlan.interFloorYs : [];
    if (!ys.length) return;

    const localT = Math.max(0.25, Math.min(0.7, Number(blockCfg.coreThickness || t || 1.5) * 0.35));
    const slabW = Math.max(0.5, blockW - 2 * (Number(blockCfg.coreThickness || t || 1.5) * 0.5));
    const slabD = Math.max(0.5, blockD - 2 * (Number(blockCfg.coreThickness || t || 1.5) * 0.5));
    const edgeT = Math.max(0.18, localT * 0.75);
    const edgeOut = 0.035;

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xd8c9aa,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x8f7f63,
      roughness: 0.86,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });

    function addEdgeBand(sizeX, sizeY, sizeZ, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sizeX, sizeY, sizeZ), edgeMat);
      m.position.set(x, y, z);
      m.name = `${labelPrefix} inter-floor divider edge`;
      group.add(m);
      return m;
    }

    for (const wallY of ys) {
      const y = blockH - Number(wallY || 0);
      if (!(y > 0.25 && y < blockH - 0.25)) continue;

      const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, localT, slabD), slabMat);
      slab.position.set(blockCX, y, blockCZ);
      slab.name = `${labelPrefix} inter-floor divider slab`;
      group.add(slab);

      // Thin visible perimeter lines, slightly outside the wall planes, so the
      // divider remains legible even when the opaque wall faces hide the slab.
      addEdgeBand(blockW, edgeT, edgeT, blockCX, y, blockCZ - blockD / 2 - edgeOut);
      addEdgeBand(blockW, edgeT, edgeT, blockCX, y, blockCZ + blockD / 2 + edgeOut);
      addEdgeBand(edgeT, edgeT, blockD, blockCX - blockW / 2 - edgeOut, y, blockCZ);
      addEdgeBand(edgeT, edgeT, blockD, blockCX + blockW / 2 + edgeOut, y, blockCZ);
    }
  }

  addInterFloorDividersPreview3D(cfg, plan, w, d, h, 0, 0, 'Main');

  // ---- Walls with openings ----

  // Helper: strip structural connection slots — they're covered by wing meshes and
  // must not punch visible transparent holes in the main-block wall geometry.
  const visOnly = ops => ops.filter(o => o.type !== 'connection');

  // Shared 3D wall profiles. Main and wing walls now use the same helper
  // for gable/slanted height, gable pitch, slant pitch, and texture height.
  // This prevents future roof-profile fixes from landing on the main block
  // but not on wing blocks, or vice versa.
  const frontProfile3D = get3DWallProfileForFace(cfg, plan, 'front');
  const backProfile3D  = get3DWallProfileForFace(cfg, plan, 'back');
  const eastProfile3D  = get3DWallProfileForFace(cfg, plan, 'east');
  const westProfile3D  = get3DWallProfileForFace(cfg, plan, 'west');

  const frontH = frontProfile3D.wallH;
  const backH  = backProfile3D.wallH;
  const eastH  = eastProfile3D.wallH;
  const westH  = westProfile3D.wallH;

  const fbGable   = frontProfile3D.gablePitch || backProfile3D.gablePitch;
  const sideGable = eastProfile3D.gablePitch  || westProfile3D.gablePitch;
  const fbSlant   = frontProfile3D.slantPitch || backProfile3D.slantPitch;
  const eastSlant = eastProfile3D.slantPitch;
  const westSlant = westProfile3D.slantPitch;

  const frontTexH = frontProfile3D.texH;
  const backTexH  = backProfile3D.texH;
  const eastTexH  = eastProfile3D.texH;
  const westTexH  = westProfile3D.texH;

  function normalizeOpeningFor3DWallMesh(op, wallW, mirrorX) {
    if (!op) return op;
    // Rail-generated bay ops are in floor/physical coordinates so they line
    // up with the SVG and linked bay handles. Faces rendered with mirrorX
    // already flip hole coordinates inside buildWallMesh3D(); pre-mirror just
    // these generated bay ops so the final 3D cut lands at the same physical
    // track centerline instead of appearing on the opposite side.
    if (mirrorX && op._embeddedRail && op.type === 'bay') {
      const ow = Number(op.w) || 0;
      return { ...op, x: wallW - (Number(op.x) || 0) - ow };
    }
    return op;
  }

  function makeWallFace3D(blockCfg, blockPlan, face, wallW, ops, mirrorX) {
    const profile = get3DWallProfileForFace(blockCfg, blockPlan, face);
    const vis = visOnly(ops).map(op => normalizeOpeningFor3DWallMesh(op, wallW, mirrorX));
    const tex = buildWallTexture(blockCfg, wallW, profile.texH, profile.baseH, vis, mirrorX);
    const faceMat = material3DForCladdingStyle(blockCfg, blockCfg.claddingStyle, { roughness: 0.8 }, 0xc9b89b);
    const mesh = buildWallMesh3D(
      wallW, profile.wallH, profile.baseH, t, vis,
      faceMat, mirrorX, tex, profile.gablePitch, profile.slantPitch
    );
    return { mesh, vis, profile };
  }

  function add3DPane(op, placement, blockCfgForDoor, isBlanked = false) {
    if (!placement) return;
    let paneMat = glassMat;
    if (isBlanked || op.type === 'window' || op.type === 'blanked') {
      paneMat = getWindowMaterial3D(
        op.style || blockCfgForDoor.windowStyle || cfg.windowStyle,
        op.w, op.h
      );
    } else if (op.type === 'door') {
      paneMat = getDoorMaterial3D(op.style || blockCfgForDoor.doorStyle || cfg.doorStyle, op.w, op.h);
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(op.w, op.h), paneMat);
    if (placement.rotY) pane.rotation.y = placement.rotY;
    pane.position.set(placement.x, placement.y, placement.z);
    group.add(pane);
  }

  function render3DWallFace(def) {
    if (!def) return null;
    const wall = makeWallFace3D(
      def.blockCfg,
      def.blockPlan,
      def.face,
      def.wallW,
      def.ops || [],
      !!def.mirrorX
    );
    const mesh = wall.mesh;
    if (def.meshRotY) mesh.rotation.y = def.meshRotY;
    mesh.position.set(def.meshPos.x, def.meshPos.y || 0, def.meshPos.z);
    group.add(mesh);

    const paneOps = wall.vis.filter(o => o.type === 'window' || o.type === 'door'); // style-aware window/door panes
    for (const op of paneOps) {
      add3DPane(op, def.panePosition ? def.panePosition(op, false) : null, def.blockCfg, false);
    }

    // Bay doors use BAY_DOOR_STYLES, not DOOR_STYLES. Render them as a
    // separate wall-surface panel so roller/sectional/slatted bays show their
    // own shutter/slat detail instead of looking like huge stretched regular doors.
    const bayDoorOps = wall.vis
      .filter(o => o.type === 'bay' && o.doorStyle && o.doorStyle !== 'none')
      .map(visibleBayDoorPanel3D)
      .filter(Boolean);
    for (const op of bayDoorOps) {
      const placement = def.panePosition ? def.panePosition(op, false) : null;
      if (!placement) continue;
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(op.w, op.h),
        getBayDoorMaterial3D(op._bayDoorStyle || op.doorStyle, op.w, op.h)
      );
      if (placement.rotY) pane.rotation.y = placement.rotY;
      // Slightly offset from the wall surface to avoid z-fighting with the
      // dark inset texture painted on the cut bay opening.
      pane.position.set(placement.x, placement.y, placement.z);
      group.add(pane);
    }

    const blankOps = def.blankedOps || [];
    for (const op of blankOps) {
      add3DPane({ ...op, type: 'blanked' }, def.panePosition ? def.panePosition(op, true) : null, def.blockCfg, true);
    }

    return wall;
  }

  function render3DBlockWalls3D(label, faceDefs) {
    for (const def of (faceDefs || [])) render3DWallFace(def);
  }

  /* ---- Shared 3D wall-surface placement helper ----
     Wall-local coords use the editor convention:
       x = distance from the wall's left edge in its 2D editor view
       y = distance down from the wall top
       w/h = object's visible wall footprint
     The returned pose positions a pivot at the wall surface with local -Z
     pointing OUTWARD from the building. Surface meshes can then be added
     at local z = -thickness/2 to sit proud of the wall.
  */
  function wallSurfaceMirrorX3D(face) {
    // Must match the per-face panePosition() logic below. Front/back wall
    // cutouts are mirrored in 3D relative to the flat wall editor; east/west
    // side panes are not. Surface features must use the same transform or
    // fixtures/overrides/printed items land on the opposite side of a wall
    // even when windows and doors are correct.
    return face === 'front' || face === 'back';
  }

  function wallLocalTo3D(face, localX, localY, objW, objH, opts = {}) {
    const rawCenterX = Number(opts.centerX != null ? opts.centerX : (Number(localX || 0) + Number(objW || 0) / 2));
    const cy = Number(opts.centerY != null ? opts.centerY : (Number(localY || 0) + Number(objH || 0) / 2));
    const wallH = Number(opts.wallH != null ? opts.wallH : h);
    const worldY = wallH - cy;
    const mirrorX = (opts.mirrorX != null) ? !!opts.mirrorX : wallSurfaceMirrorX3D(face);
    const wallSpan = (face === 'front' || face === 'back') ? w : sideLen;
    const cx = mirrorX ? (wallSpan - rawCenterX) : rawCenterX;
    let x = 0, z = 0, rotY = 0;

    switch (face) {
      case 'front':
        x = cx - w / 2;
        z = -d / 2;
        rotY = 0;
        break;
      case 'back':
        x = cx - w / 2;
        z = d / 2;
        rotY = Math.PI;
        break;
      case 'east':
        x = w / 2;
        z = cx - sideLen / 2;
        rotY = Math.PI / 2;
        break;
      case 'west':
        x = -w / 2;
        z = cx - sideLen / 2;
        rotY = -Math.PI / 2;
        break;
      default:
        x = cx - w / 2;
        z = -d / 2;
        rotY = 0;
        break;
    }

    // Optional tiny outward offset for cases that need to avoid z-fighting
    // without relying solely on the child mesh local-z.
    const out = Number(opts.outward || 0);
    if (out) {
      if (face === 'front') z -= out;
      else if (face === 'back') z += out;
      else if (face === 'east') x += out;
      else if (face === 'west') x -= out;
    }

    return { x, y: worldY, z, rotY, centerX: cx, centerY: cy };
  }

  function makeWallSurfacePivot3D(face, localX, localY, objW, objH, opts = {}) {
    const pose = wallLocalTo3D(face, localX, localY, objW, objH, opts);
    const pivot = new THREE.Object3D();
    pivot.rotation.y = pose.rotY;
    pivot.position.set(pose.x, pose.y, pose.z);
    pivot.userData.wallSurfacePose = pose;
    return pivot;
  }

  // Main block walls. This is now routed through the shared block-wall
  // renderer used by wings as well; the face definitions below only describe
  // placement/orientation in world space.
  function frontChamferPanePosition3D(sideKey, op, blanked) {
    const len = sideKey === 'west' ? chamfer.westDiagLen : chamfer.eastDiagLen;
    const inset = sideKey === 'west' ? (chamfer.westInset || 0) : (chamfer.eastInset || 0);
    const theta = sideKey === 'west' ? -Math.PI / 4 : Math.PI / 4;
    const centerX = sideKey === 'west' ? -w / 2 + inset / 2 : w / 2 - inset / 2;
    const centerZ = -d / 2 + inset / 2;
    const localX = (Number(op.x) || 0) + (Number(op.w) || 0) / 2 - len / 2;
    const hy = h - (Number(op.y) || 0) - (Number(op.h) || 0);
    const outward = blanked ? 0.05 : 0.1;
    return {
      x: centerX + localX * Math.cos(theta),
      y: hy + (Number(op.h) || 0) / 2,
      z: centerZ - localX * Math.sin(theta) - outward,
      rotY: theta,
    };
  }

  render3DBlockWalls3D('Main', [
    {
      blockCfg: cfg, blockPlan: plan, face: 'front',
      wallW: frontWallW, ops: get3DWallOpenings(cfg, plan, 'front'),
      // The flat wall editor shows the exterior face of the panel. In the
      // 3D scene the front wall's local shape is viewed from the opposite
      // side of the SVG/shape plane, so the structural cutouts need the same
      // horizontal mirror used by the wall mesh. Panes use the identical
      // mirrored centre coordinate so glass/doors stay aligned with holes.
      mirrorX: true,
      meshPos: { x: frontCenterX, y: 0, z: -d / 2 },
      blankedOps: getBlankedWindows3D(cfg, 'front'),
      panePosition: (op, blanked) => {
        const hx = frontWallW / 2 - op.x - op.w;
        const hy = h - op.y - op.h;
        return { x: frontCenterX + hx + op.w / 2, y: hy + op.h / 2, z: -d / 2 - (blanked ? 0.05 : 0.1), rotY: 0 };
      },
    },
    {
      blockCfg: cfg, blockPlan: plan, face: 'back',
      wallW: w, ops: get3DWallOpenings(cfg, plan, 'back'),
      mirrorX: true,
      meshPos: { x: 0, y: 0, z: d / 2 - t },
      blankedOps: getBlankedWindows3D(cfg, 'back'),
      panePosition: (op, blanked) => {
        const hx = w / 2 - op.x - op.w;
        const hy = h - op.y - op.h;
        return { x: hx + op.w / 2, y: hy + op.h / 2, z: d / 2 + (blanked ? 0.05 : 0.1), rotY: 0 };
      },
    },
    {
      blockCfg: cfg, blockPlan: plan, face: 'east',
      wallW: eastWallLen, ops: get3DWallOpenings(cfg, plan, 'east'),
      mirrorX: true,
      meshRotY: Math.PI / 2,
      meshPos: { x: w / 2 - t, y: 0, z: eastWallCenterZ },
      blankedOps: getBlankedWindows3D(cfg, 'east'),
      panePosition: (op, blanked) => {
        const hz = op.x - eastWallLen / 2;
        const hy = h - op.y - op.h;
        return { x: w / 2 + (blanked ? 0.05 : 0.1), y: hy + op.h / 2, z: eastWallCenterZ + hz + op.w / 2, rotY: Math.PI / 2 };
      },
    },
    {
      blockCfg: cfg, blockPlan: plan, face: 'west',
      wallW: westWallLen, ops: get3DWallOpenings(cfg, plan, 'west'),
      mirrorX: false,
      meshRotY: -Math.PI / 2,
      meshPos: { x: -(w / 2 - t), y: 0, z: westWallCenterZ },
      blankedOps: getBlankedWindows3D(cfg, 'west'),
      panePosition: (op, blanked) => {
        const hz = op.x - westWallLen / 2;
        const hy = h - op.y - op.h;
        return { x: -w / 2 - (blanked ? 0.05 : 0.1), y: hy + op.h / 2, z: westWallCenterZ + hz + op.w / 2, rotY: -Math.PI / 2 };
      },
    },
    ...(chamfer.enabled && chamfer.westDiagLen > 0 ? [{
      blockCfg: cfg, blockPlan: plan, face: 'front_chamfer_west',
      wallW: chamfer.westDiagLen, ops: get3DWallOpenings(cfg, plan, 'front_chamfer_west'),
      mirrorX: false,
      meshRotY: -Math.PI / 4,
      meshPos: { x: -w / 2 + (chamfer.westInset || 0) / 2, y: 0, z: -d / 2 + (chamfer.westInset || 0) / 2 },
      blankedOps: getBlankedWindows3D(cfg, 'front_chamfer_west'),
      panePosition: (op, blanked) => frontChamferPanePosition3D('west', op, blanked),
    }] : []),
    ...(chamfer.enabled && chamfer.eastDiagLen > 0 ? [{
      blockCfg: cfg, blockPlan: plan, face: 'front_chamfer_east',
      wallW: chamfer.eastDiagLen, ops: get3DWallOpenings(cfg, plan, 'front_chamfer_east'),
      mirrorX: false,
      meshRotY: Math.PI / 4,
      meshPos: { x: w / 2 - (chamfer.eastInset || 0) / 2, y: 0, z: -d / 2 + (chamfer.eastInset || 0) / 2 },
      blankedOps: getBlankedWindows3D(cfg, 'front_chamfer_east'),
      panePosition: (op, blanked) => frontChamferPanePosition3D('east', op, blanked),
    }] : []),
  ]);

  const roofStyle3d = cfg.roofStyle || 'parapet';
  const pH3d = plan.parapetH || 0;   // parapet height — sloped roofs sit above the parapet base
  const ohFB3 = cfg.roofOverhangFB || 0;
  const ohEW3 = cfg.roofOverhangEW || 0;

  // Build the roof-cladding textured material once per regen. Used for the
  // top face of slanted and gabled roofs; falls back to the plain grey
  // roofMat when the style key is unset or unknown. Mirrors the wing-box
  // pattern: buildWallTexture is calibrated for ExtrudeGeometry UVs (in
  // world mm) so we override repeat/offset for the BoxGeometry's 0–1 UVs.
  function makeRoofTopMat(topW, topD) {
    const styleKey = cfg.roofCladdingStyle || cfg.claddingStyle;
    if (!styleKey || !CLADDING_STYLES[styleKey]) return roofMat;
    const tex = buildWallTexture(cfg, topW, topD, topD, [], false, styleKey);
    if (!tex) return roofMat;
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.85 });
  }
  // BoxGeometry face order is [+X, -X, +Y, -Y, +Z, -Z]. The "+Y" face is
  // the top of the box — for slanted/gabled roofs the box is rotated so
  // +Y becomes the upward-facing slope. The other 5 faces are edges and
  // the underside; those stay plain grey since they're either invisible
  // or look unrealistic stretched with a tile/seam pattern.
  function makeRoofMats(topW, topD) {
    const top = makeRoofTopMat(topW, topD);
    return [roofMat, roofMat, top, roofMat, roofMat, roofMat];
  }

  // Parapet roof preview:
  // show a recessed roof deck plus the parapet ring/top caps so it reads as a
  // true parapet well in 3D instead of a plain flat slab.
  function addParapetRoofPreview(boxW, boxD, totalH, parapetH, cx = 0, cz = 0, topMatOverride = null, options = {}) {
    const pH = Math.max(0.5, Number(parapetH) || 0);
    const innerW = Math.max(t, boxW - 2 * t);
    const innerD = Math.max(t, boxD - 2 * t);
    const deckY = totalH - pH;
    const roofTopMat = topMatOverride || makeRoofTopMat(innerW, innerD);
    const includeDeck = options.includeDeck !== false;

    if (includeDeck) {
      // Recessed roof deck.
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, t, innerD),
        [roofMat, roofMat, roofTopMat, roofMat, roofMat, roofMat]
      );
      deck.position.set(cx, deckY + t / 2, cz);
      group.add(deck);
    }

    // Simple top caps around the parapet.
    const capMat = roofMat;
    const northCap = new THREE.Mesh(new THREE.BoxGeometry(innerW, t, t), capMat);
    northCap.position.set(cx, totalH - t / 2, cz - boxD / 2 + t / 2);
    group.add(northCap);

    const southCap = new THREE.Mesh(new THREE.BoxGeometry(innerW, t, t), capMat);
    southCap.position.set(cx, totalH - t / 2, cz + boxD / 2 - t / 2);
    group.add(southCap);

    const westCap = new THREE.Mesh(new THREE.BoxGeometry(t, t, innerD), capMat);
    westCap.position.set(cx - boxW / 2 + t / 2, totalH - t / 2, cz);
    group.add(westCap);

    const eastCap = new THREE.Mesh(new THREE.BoxGeometry(t, t, innerD), capMat);
    eastCap.position.set(cx + boxW / 2 - t / 2, totalH - t / 2, cz);
    group.add(eastCap);

    // Inner parapet faces so the recess is visually obvious.
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xc8c4bd,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const northInner = new THREE.Mesh(new THREE.PlaneGeometry(innerW, pH), innerMat);
    northInner.position.set(cx, deckY + pH / 2, cz - boxD / 2 + t + 0.02);
    group.add(northInner);

    const southInner = new THREE.Mesh(new THREE.PlaneGeometry(innerW, pH), innerMat);
    southInner.rotation.y = Math.PI;
    southInner.position.set(cx, deckY + pH / 2, cz + boxD / 2 - t - 0.02);
    group.add(southInner);

    const westInner = new THREE.Mesh(new THREE.PlaneGeometry(innerD, pH), innerMat);
    westInner.rotation.y = Math.PI / 2;
    westInner.position.set(cx - boxW / 2 + t + 0.02, deckY + pH / 2, cz);
    group.add(westInner);

    const eastInner = new THREE.Mesh(new THREE.PlaneGeometry(innerD, pH), innerMat);
    eastInner.rotation.y = -Math.PI / 2;
    eastInner.position.set(cx + boxW / 2 - t - 0.02, deckY + pH / 2, cz);
    group.add(eastInner);
  }

  if (roofStyle3d === 'slanted') {
    const pitch = cfg.roofPitch || 10;
    const slopeDir = cfg.roofSlopeDirection || 'back';
    const nsAxis = (slopeDir === 'front' || slopeDir === 'back');
    const span = nsAxis ? d : w;
    const angle = Math.atan2(pitch, span);
    const panelH0 = Math.hypot(span, pitch);
    // Overhang: eave direction extends along slope at both ends; verge extends perpendicular
    const ohEave  = nsAxis ? ohFB3 : ohEW3;
    const ohVerge = nsAxis ? ohEW3 : ohFB3;
    const ohSlant = ohEave * (panelH0 / span);
    const panelH  = panelH0 + 2 * ohSlant;
    // Top-face dimensions (the slope, in roof-local frame): nsAxis →
    // (w+2·ohVerge) by panelH; ewAxis → panelH by (d+2·ohVerge).
    const topW = nsAxis ? (w + 2 * ohVerge) : panelH;
    const topD = nsAxis ? panelH            : (d + 2 * ohVerge);
    const rm = new THREE.Mesh(
      nsAxis ? new THREE.BoxGeometry(w + 2*ohVerge, t, panelH)
             : new THREE.BoxGeometry(panelH, t, d + 2*ohVerge),
      makeRoofMats(topW, topD)
    );
    rm.rotation.x = nsAxis ? (slopeDir === 'back' ? -angle : angle) : 0;
    // Z-axis rotations use the opposite sign convention from X-axis slopes:
    // positive rotation around Z raises the +X/east side. The old code had
    // this sign inverted, which made east/west sloped preview roofs render
    // as if the high side were on the opposite edge.
    rm.rotation.z = nsAxis ? 0 : (slopeDir === 'east' ? angle : -angle);
    rm.position.set(0, h + pitch / 2, 0);   // centre of slope above wall top (both eave ends equal)
    group.add(rm);
  } else if (isPreviewGabledRoofStyle(roofStyle3d)) {
    const pitch = cfg.roofPitch || 10;
    const ridgeDir = getPreviewEffectiveRidgeDir(cfg);
    const ewRidge = (ridgeDir === 'ew');
    const isParapetGable = roofStyle3d === 'parapet_gable';
    const roofBaseY = isParapetGable ? h - pH3d : h;
    const roofW = isParapetGable ? Math.max(t, w - 2 * t) : w;
    const roofD = isParapetGable ? Math.max(t, d - 2 * t) : d;
    const roofOverhangFB = isParapetGable ? 0 : ohFB3;
    const roofOverhangEW = isParapetGable ? 0 : ohEW3;
    const halfSpan = ewRidge ? roofD / 2 : roofW / 2;
    const slantAngle = Math.atan2(pitch, halfSpan);
    const slantLen0  = Math.hypot(halfSpan, pitch);
    // Eave = the outer edge of each panel that hangs beyond the building wall
    const ohEave  = ewRidge ? roofOverhangFB : roofOverhangEW;
    const ohVerge = ewRidge ? roofOverhangEW : roofOverhangFB;
    const ohEaveSlant = ohEave * (slantLen0 / halfSpan);
    const slantLen = slantLen0 + ohEaveSlant;   // each panel: only the eave end extends
    // Each panel's ridge end spans ±(t/2)·sin(angle) across z=0 due to material thickness.
    // Shift each panel outward by that amount so their INNER faces meet cleanly at the ridge
    // with no penetration — outer faces diverge symmetrically above the peak.
    const ridgeShift    = (t / 2) * Math.sin(slantAngle);
    const panelCentreOffset = (halfSpan + ohEave) / 2 + ridgeShift;
    const topW = ewRidge ? (roofW + 2 * ohVerge) : slantLen;
    const topD = ewRidge ? slantLen               : (roofD + 2 * ohVerge);
    for (const sign of [-1, 1]) {
      const rm = new THREE.Mesh(
        ewRidge ? new THREE.BoxGeometry(roofW + 2*ohVerge, t, slantLen)
                : new THREE.BoxGeometry(slantLen, t, roofD + 2*ohVerge),
        makeRoofMats(topW, topD)
      );
      if (ewRidge) {
        rm.rotation.x = sign * slantAngle;
        rm.position.set(0, roofBaseY + pitch / 2, sign * panelCentreOffset);
      } else {
        // For an N/S ridge the slope runs along world X. Positive rotation
        // around Z raises +X, so the panel sitting on the +X/east side must
        // use the NEGATIVE sign to put its high edge at the centre ridge.
        // The previous sign made the ridge a low valley and the outside
        // eaves high, so the 3D gable preview looked upside down.
        rm.rotation.z = -sign * slantAngle;
        rm.position.set(sign * panelCentreOffset, roofBaseY + pitch / 2, 0);
      }
      group.add(rm);
    }
    if (isParapetGable) {
      addParapetRoofPreview(w, d, h, pH3d, 0, 0, null, { includeDeck: false });
    }
  } else if (roofStyle3d === 'flat_overhang') {
    // Flat slab oversized past the walls by `O` mm on every side, centred
    // on the building footprint, sitting on top of the walls (y = h..h+t).
    // The top face gets the chosen roof cladding texture (typically the
    // new 'standing_seam_metal' style); edges + bottom stay plain grey
    // since they're rarely seen and stretched textures look unrealistic.
    const O = Math.max(0, cfg.roofOverhang || 5);
    const topW = w + 2 * O;
    const topD = d + 2 * O;
    const rm = new THREE.Mesh(
      new THREE.BoxGeometry(topW, t, topD),
      makeRoofMats(topW, topD)
    );
    rm.position.set(0, h + t / 2, 0);
    group.add(rm);
  } else if (roofStyle3d === 'parapet') {
    addParapetRoofPreview(w, d, h, plan.parapetH || 0, 0, 0);
  } else {
    // Plain flat roof (no parapet): simple top slab.
    const roofMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, t, d),
      [roofMat, roofMat, makeRoofTopMat(w, d), roofMat, roofMat, roofMat]
    );
    roofMesh.position.set(0, h + t / 2, 0);
    group.add(roofMesh);
  }



  // ---- Embedded rail preview on floor / raised slab ----
  // Draws the active embedded-rail zones directly in the 3D preview. The
  // laser-cut layer generator still owns the real exported parts; this is a
  // visual aid so the rail centerline, sleeper trench, raised area, and paired
  // rails can be checked against bay openings and wall/wing placement.
  function addEmbeddedRailsPreview3D(blockCfg, blockW, blockD, blockCX = 0, blockCZ = 0) {
    const rails = embeddedRailsForCfg(blockCfg);
    if (!rails.length) return;

    const matTLocal = Number(blockCfg.coreThickness || t || 1.5);
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xb8b2a3,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x3b3b36,
      roughness: 0.86,
      metalness: 0.05,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x3c3025, roughness: 0.88, metalness: 0.02 });
    const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x5f666b, roughness: 0.46, metalness: 0.65 });
    const insertMat = new THREE.MeshStandardMaterial({ color: 0xc2bbaa, roughness: 0.9, metalness: 0.0 });

    function addBox(sizeX, sizeY, sizeZ, posX, posY, posZ, mat) {
      if (!(sizeX > 0 && sizeY > 0 && sizeZ > 0)) return null;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sizeX, sizeY, sizeZ), mat);
      mesh.position.set(posX, posY, posZ);
      group.add(mesh);
      return mesh;
    }

    for (const z of rails) {
      const pr = embeddedRailProfile(z);
      const orientation = embeddedRailOrientation(z);
      const totalH = Math.max(0.8, Number(pr.totalTrackHeightMm) || 3.0);
      const sleeperW = Math.max(1, Number(pr.sleeperWidthMm) || 16);
      const outsideRailW = Math.max(1, Number(pr.outsideRailWidthMm) || 10.8);
      const gaugeInside = Math.max(1, Number(pr.gaugeInsideRailsMm) || 9.0);
      const insertW = Math.max(0.5, Number(pr.betweenRailsInsertWidthMm) || 7.2);
      const railW = Math.max(0.35, (outsideRailW - gaugeInside) / 2 || 0.55);
      const railH = Math.max(0.35, Math.min(0.8, (Number(pr.railHeightMm) || 2.03) * 0.25));
      const railCenterOffset = Math.max(railW / 2, outsideRailW / 2 - railW / 2);

      // Convert floor-editor/interior coordinates into world coordinates.
      const x0 = blockCX - blockW / 2 + matTLocal + Number(z.x || 0);
      const x1 = x0 + Number(z.w || 0);
      const z0 = blockCZ - blockD / 2 + matTLocal + Number(z.y || 0);
      const z1 = z0 + Number(z.h || 0);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;

      // Raised embedded slab/zone, slightly transparent so tracks remain legible.
      addBox(Math.max(0.1, x1 - x0), totalH, Math.max(0.1, z1 - z0), cx, totalH / 2, cz, concreteMat);

      if (orientation === 'ns') {
        const trackX = x0 + (x1 - x0) / 2 + Number(z.trackOffset || 0);
        let runZ0 = z0;
        let runZ1 = z1;
        if ((Number(z.y || 0)) <= 0.5) runZ0 = blockCZ - blockD / 2 - 2;
        const innerD = Math.max(0, (blockCfg.depth || blockD) - 2 * matTLocal);
        if ((Number(z.y || 0) + Number(z.h || 0)) >= innerD - 0.5) runZ1 = blockCZ + blockD / 2 + 2;
        const len = Math.max(0.1, runZ1 - runZ0);
        const runCZ = (runZ0 + runZ1) / 2;

        // Dark sleeper trench and concrete insert between rails.
        addBox(sleeperW, 0.08, len, trackX, totalH + 0.025, runCZ, trenchMat);
        addBox(insertW, 0.10, len, trackX, totalH + 0.10, runCZ, insertMat);

        // Sleepers/ties as short crossbars, clipped to the rail run.
        const tiePitch = 4.0;
        for (let zz = runZ0 + tiePitch / 2; zz < runZ1 - 0.1; zz += tiePitch) {
          addBox(sleeperW, 0.18, 0.75, trackX, totalH + 0.18, zz, sleeperMat);
        }
        // Paired rails.
        addBox(railW, railH, len, trackX - railCenterOffset, totalH + 0.35 + railH / 2, runCZ, railSteelMat);
        addBox(railW, railH, len, trackX + railCenterOffset, totalH + 0.35 + railH / 2, runCZ, railSteelMat);
      } else {
        const trackZ = z0 + (z1 - z0) / 2 + Number(z.trackOffset || 0);
        let runX0 = x0;
        let runX1 = x1;
        if ((Number(z.x || 0)) <= 0.5) runX0 = blockCX - blockW / 2 - 2;
        const innerW = Math.max(0, (blockCfg.width || blockW) - 2 * matTLocal);
        if ((Number(z.x || 0) + Number(z.w || 0)) >= innerW - 0.5) runX1 = blockCX + blockW / 2 + 2;
        const len = Math.max(0.1, runX1 - runX0);
        const runCX = (runX0 + runX1) / 2;

        addBox(len, 0.08, sleeperW, runCX, totalH + 0.025, trackZ, trenchMat);
        addBox(len, 0.10, insertW, runCX, totalH + 0.10, trackZ, insertMat);

        const tiePitch = 4.0;
        for (let xx = runX0 + tiePitch / 2; xx < runX1 - 0.1; xx += tiePitch) {
          addBox(0.75, 0.18, sleeperW, xx, totalH + 0.18, trackZ, sleeperMat);
        }
        addBox(len, railH, railW, runCX, totalH + 0.35 + railH / 2, trackZ - railCenterOffset, railSteelMat);
        addBox(len, railH, railW, runCX, totalH + 0.35 + railH / 2, trackZ + railCenterOffset, railSteelMat);
      }
    }
  }

  // ---- Internal trusses + column supports (3D preview) ----
  // Renders any enabled truss systems inside the block so the lifted-roof
  // preview shows the internal structure, not just the cut sheets.
  function addTrussAndSupportPreview3D(blockCfg, blockPlan, blockW, blockD, blockH, blockCX, blockCZ) {
    const tCfg = blockCfg.trusses;
    if (!tCfg || !tCfg.enabled) return;

    const matT     = blockPlan.matT || blockCfg.coreThickness || 1.5;
    const chordW   = Math.max(0.4, Number(tCfg.chordW) || 2);
    const flangeW  = Math.max(0.5, (tCfg.supportFlangeW != null) ? Number(tCfg.supportFlangeW) : 4);
    const webDepth = Math.max(0.5, (tCfg.supportDepth   != null) ? Number(tCfg.supportDepth)   : 4);
    const axis     = resolveTrussAxis(blockCfg);
    const innerW   = Math.max(1, blockW - 2 * matT);
    const innerD   = Math.max(1, blockD - 2 * matT);
    const fullSpan = axis === 'ns' ? innerD : innerW;
    const alongLen = axis === 'ns' ? innerW : innerD;
    const spacing  = Math.max(5, Number(tCfg.spacing) || 30);
    const margin   = tCfg.supports ? (flangeW / 2) : 0;
    const positions = trussSupportPositions(alongLen, spacing, margin);
    if (!positions.length) return;

    const spanDims = { roofPitch: blockCfg.roofPitch || 10 };
    const geom = generateTrussGeometry(blockCfg.roofStyle || 'parapet', fullSpan, spanDims, chordW);
    if (!geom || !Array.isArray(geom.outline) || geom.outline.length < 3) return;

    const ys = geom.outline.map(p => p.y);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const geomH = Math.max(1, maxY - minY);
    const trussT3d = Math.max(0.45, Math.min(1.2, matT * 0.45));

    function makeTrussShape() {
      const outline = geom.outline;
      const shape = new THREE.Shape();
      shape.moveTo(outline[0].x - fullSpan / 2, maxY - outline[0].y);
      for (let i = 1; i < outline.length; i++) {
        shape.lineTo(outline[i].x - fullSpan / 2, maxY - outline[i].y);
      }
      shape.closePath();
      for (const holePoly of (geom.voids || [])) {
        if (!holePoly || holePoly.length < 3) continue;
        const hole = new THREE.Path();
        hole.moveTo(holePoly[0].x - fullSpan / 2, maxY - holePoly[0].y);
        for (let i = 1; i < holePoly.length; i++) {
          hole.lineTo(holePoly[i].x - fullSpan / 2, maxY - holePoly[i].y);
        }
        hole.closePath();
        shape.holes.push(hole);
      }
      return shape;
    }

    const trussShape = makeTrussShape();
    const trussGeo = new THREE.ExtrudeGeometry(trussShape, {
      depth: trussT3d,
      bevelEnabled: false,
      curveSegments: 24,
    });
    trussGeo.translate(0, 0, -trussT3d / 2);
    const trussMat3d = new THREE.MeshStandardMaterial({
      color: 0x6d5641,
      roughness: 0.86,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });

    function trussBaseY() {
      const style = blockCfg.roofStyle || 'parapet';
      const pH = blockPlan.parapetH || 0;
      if (style === 'flat' || style === 'parapet' || style === 'flat_overhang') {
        const roofUnderside = (style === 'parapet') ? (blockH - pH) : blockH;
        return roofUnderside - geomH;
      }
      if (style === 'parapet_gable') return blockH - pH;
      return blockH;
    }
    const baseY = trussBaseY();

    function makeColumnMesh(columnType, height, orientY) {
      const g = new THREE.Group();
      const steelMat = new THREE.MeshStandardMaterial({
        color: 0x70767c,
        roughness: 0.72,
        metalness: 0.35,
        transparent: true,
        opacity: 0.95,
      });
      const flangeT = Math.max(0.35, matT * 0.55);
      const webT    = Math.max(0.35, matT * 0.45);
      const hMid    = height / 2;

      const web = new THREE.Mesh(new THREE.BoxGeometry(webT, height, webDepth), steelMat);
      web.position.set(0, hMid, 0);
      g.add(web);

      if (columnType === 't') {
        const flange = new THREE.Mesh(new THREE.BoxGeometry(flangeW, height, flangeT), steelMat);
        flange.position.set(0, hMid, -webDepth / 2 + flangeT / 2);
        g.add(flange);
      } else {
        const flangeA = new THREE.Mesh(new THREE.BoxGeometry(flangeW, height, flangeT), steelMat);
        flangeA.position.set(0, hMid, -webDepth / 2 + flangeT / 2);
        g.add(flangeA);
        const flangeB = new THREE.Mesh(new THREE.BoxGeometry(flangeW, height, flangeT), steelMat);
        flangeB.position.set(0, hMid, webDepth / 2 - flangeT / 2);
        g.add(flangeB);
      }
      g.rotation.y = orientY || 0;
      return g;
    }

    const colH = Math.max(5, blockH - (blockPlan.parapetH || 0));
    const columnType = tCfg.supportColumnType === 't' ? 't' : 'i';
    const colInset = Math.max(webDepth / 2, matT / 2) + 0.05;

    // Interior wall X-braces, rendered as thin metal strap braces on the
    // bearing walls between adjacent truss stations.
    if (wallXBracingEnabled(tCfg) && positions.length >= 2) {
      const braceMat = new THREE.MeshStandardMaterial({
        color: 0x8a9198,
        roughness: 0.58,
        metalness: 0.48,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
      });
      const memberW = Math.max(0.25, Number(tCfg.xBraceW) || 1.0);
      const fitInset = tCfg.supports ? flangeW / 2 : 0;
      const braceH = Math.max(5, blockH - (blockPlan.parapetH || 0));
      const braceT = Math.max(0.12, Math.min(0.35, matT * 0.12));
      const strapW = Math.max(0.3, memberW);
      const faceOffset = 0.05;

      function makeBraceMesh(bayW) {
        const diagLen = Math.hypot(bayW, braceH);
        if (!(diagLen > strapW * 2)) return null;
        const angle = Math.atan2(braceH, bayW);
        const strapGeo = new THREE.BoxGeometry(diagLen, strapW, braceT);
        const g = new THREE.Group();
        const a = new THREE.Mesh(strapGeo, braceMat);
        a.rotation.z = angle;
        g.add(a);
        const b = new THREE.Mesh(strapGeo, braceMat);
        b.rotation.z = -angle;
        g.add(b);
        const gusset = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(strapW * 1.4, 0.6), Math.max(strapW * 1.4, 0.6), braceT * 1.2),
          braceMat
        );
        g.add(gusset);
        return g;
      }

      for (let i = 0; i < positions.length - 1; i++) {
        const x0 = Math.max(0, positions[i] + fitInset);
        const x1 = Math.min(alongLen, positions[i + 1] - fitInset);
        const bayW = x1 - x0;
        if (bayW < strapW * 2) continue;
        const bayCenter = (x0 + x1) / 2;
        const braceFront = makeBraceMesh(bayW);
        const braceBack  = makeBraceMesh(bayW);
        const braceWest  = makeBraceMesh(bayW);
        const braceEast  = makeBraceMesh(bayW);

        if (axis === 'ns') {
          if (braceFront) {
            braceFront.position.set(blockCX - innerW / 2 + bayCenter, braceH / 2, blockCZ - innerD / 2 + faceOffset);
            group.add(braceFront);
          }
          if (braceBack) {
            braceBack.rotation.y = Math.PI;
            braceBack.position.set(blockCX - innerW / 2 + bayCenter, braceH / 2, blockCZ + innerD / 2 - faceOffset);
            group.add(braceBack);
          }
        } else {
          if (braceWest) {
            braceWest.rotation.y = Math.PI / 2;
            braceWest.position.set(blockCX - innerW / 2 + faceOffset, braceH / 2, blockCZ - innerD / 2 + bayCenter);
            group.add(braceWest);
          }
          if (braceEast) {
            braceEast.rotation.y = -Math.PI / 2;
            braceEast.position.set(blockCX + innerW / 2 - faceOffset, braceH / 2, blockCZ - innerD / 2 + bayCenter);
            group.add(braceEast);
          }
        }
      }
    }

    for (const pos of positions) {
      const tr = new THREE.Mesh(trussGeo, trussMat3d);
      if (axis === 'ns') {
        tr.rotation.y = Math.PI / 2;
        tr.position.set(blockCX - innerW / 2 + pos, baseY, blockCZ);
      } else {
        tr.position.set(blockCX, baseY, blockCZ - innerD / 2 + pos);
      }
      group.add(tr);

      if (tCfg.supports) {
        if (axis === 'ns') {
          const x = blockCX - innerW / 2 + pos;
          const zN = blockCZ - innerD / 2 + colInset;
          const zS = blockCZ + innerD / 2 - colInset;
          const c1 = makeColumnMesh(columnType, colH, 0);
          c1.position.set(x, 0, zN);
          group.add(c1);
          const c2 = makeColumnMesh(columnType, colH, Math.PI);
          c2.position.set(x, 0, zS);
          group.add(c2);
        } else {
          const z = blockCZ - innerD / 2 + pos;
          const xW = blockCX - innerW / 2 + colInset;
          const xE = blockCX + innerW / 2 - colInset;
          const c1 = makeColumnMesh(columnType, colH, -Math.PI / 2);
          c1.position.set(xW, 0, z);
          group.add(c1);
          const c2 = makeColumnMesh(columnType, colH, Math.PI / 2);
          c2.position.set(xE, 0, z);
          group.add(c2);
        }
      }
    }
  }

  // Main block embedded rail preview + internal trusses / supports
  addEmbeddedRailsPreview3D(cfg, w, d, 0, 0);
  addTrussAndSupportPreview3D(cfg, plan, w, d, h, 0, 0);

  // ---- Wings — shared block-wall renderer with per-face cladding texture + glass panes ----
  for (let wi = 0; wi < (cfg.wings || []).length; wi++) {
    const wing = cfg.wings[wi];
    const wCfg  = buildWingCfg(cfg, wing);
    const wPlan = buildEdgePlans(wCfg);
    const wH    = wCfg.height;
    const fW    = wPlan.fbWidth;   // outer-face width (= span)
    const sLen  = wPlan.sideLen;   // parallel-face width (= depth - 2*matT)

    const bounds = weWingBounds(cfg, wing);
    const wx0 = bounds.x - w / 2,  wx1 = wx0 + bounds.w;
    // Z-flip: north = -Z, south = +Z  →  wz0 = north end (negative), wz1 = south end (positive)
    const wz0 = bounds.y - d / 2,  wz1 = bounds.y + bounds.d - d / 2;
    const wxC = (wx0 + wx1) / 2,   wzC = (wz0 + wz1) / 2;
    const bW  = bounds.w,           bD  = bounds.d;

    const cp3d = wingCoplanarCheck(wing, cfg.width, cfg.depth);

    // Openings for each face
    const outerOps = get3DWallOpenings(wCfg, wPlan, 'back');
    const westOps  = get3DWallOpenings(wCfg, wPlan, 'west');
    const eastOps  = get3DWallOpenings(wCfg, wPlan, 'east');


    const outerVis = visOnly(outerOps);
    const westVisW = visOnly(westOps);
    const eastVisW = visOnly(eastOps);

    // Shared wing wall profiles. These use the same helper as the main
    // building, so slanted/gabled/parapet wall behaviour stays consistent.
    // Local back wall = wing outer face. Local west/east = wing parallel faces.
    const wBackProfile3D = get3DWallProfileForFace(wCfg, wPlan, 'back');
    const wWestProfile3D = get3DWallProfileForFace(wCfg, wPlan, 'west');
    const wEastProfile3D = get3DWallProfileForFace(wCfg, wPlan, 'east');

    const wFbGable   = wBackProfile3D.gablePitch;
    const wSideGable = wWestProfile3D.gablePitch || wEastProfile3D.gablePitch;

    const wBackFaceH = wBackProfile3D.wallH;
    const wWestFaceH = wWestProfile3D.wallH;
    const wEastFaceH = wEastProfile3D.wallH;

    const wBackSlant = wBackProfile3D.slantPitch;
    const wWestSlant = wWestProfile3D.slantPitch;
    const wEastSlant = wEastProfile3D.slantPitch;

    const wOuterTexH = wBackProfile3D.texH;
    const wWestTexH  = wWestProfile3D.texH;
    const wEastTexH  = wEastProfile3D.texH;

    // Keep the simple box only as the hidden bulk / underside / connection
    // carrier. Exposed faces are made invisible and replaced by real wall
    // meshes with cut openings so wing glazing can actually be transparent.
    const cMat = wallMat;  // connection (interior) face — plain
    const wingIsParapet3D = (wCfg.roofStyle || cfg.roofStyle || 'parapet') === 'parapet';
    const hiddenFaceMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const wingTopMat = wingIsParapet3D ? hiddenFaceMat : roofMat;

    // Map face roles to BoxGeometry material slots
    let mats;
    switch (wing.face) {
      case 'east':  mats = [hiddenFaceMat, cMat, wingTopMat, wallMat, hiddenFaceMat, hiddenFaceMat]; break;
      case 'west':  mats = [cMat, hiddenFaceMat, wingTopMat, wallMat, hiddenFaceMat, hiddenFaceMat]; break;
      case 'front': mats = [hiddenFaceMat, hiddenFaceMat, wingTopMat, wallMat, cMat, hiddenFaceMat]; break;
      case 'back':  mats = [hiddenFaceMat, hiddenFaceMat, wingTopMat, wallMat, hiddenFaceMat, cMat]; break;
      default:      mats = wallMat;
    }

    const wingBox = new THREE.Mesh(new THREE.BoxGeometry(bW, wH, bD), mats);
    wingBox.position.set(wxC, wH / 2, wzC);
    group.add(wingBox);
    addInterFloorDividersPreview3D(wCfg, wPlan, bW, bD, wH, wxC, wzC, `Wing ${wi + 1}`);

    // Exposed wing wall meshes with real cut openings. The shared
    // render3DBlockWalls3D path now handles mesh creation + window/door/
    // blanked-window overlays; this block only maps each wing-local face into
    // world-space placement.
    const wingFaceDefs3D = [];
    const eps = 0.2;
    const blankEps = 0.05;
    const wingBlankedOuter = getBlankedWindows3D(wCfg, 'back');
    const wingBlankedWest  = getBlankedWindows3D(wCfg, 'west');
    const wingBlankedEast  = getBlankedWindows3D(wCfg, 'east');

    function addWingFaceDef(localFace, wallW, ops, blankedOps, mirrorX, meshRotY, meshPos, panePosition) {
      wingFaceDefs3D.push({
        blockCfg: wCfg,
        blockPlan: wPlan,
        face: localFace,
        wallW,
        ops,
        mirrorX,
        meshRotY,
        meshPos,
        blankedOps,
        panePosition,
      });
    }

    function outerPanePos(op, blanked) {
      const off = blanked ? blankEps : eps;
      const hx = op.x - fW / 2;
      const hy = wH - op.y - op.h / 2;
      switch (wing.face) {
        case 'east':  return { x: wx1 + off, y: hy, z: wzC + hx + op.w / 2, rotY:  Math.PI / 2 };
        case 'west':  return { x: wx0 - off, y: hy, z: wzC + hx + op.w / 2, rotY: -Math.PI / 2 };
        case 'front': return { x: wxC + hx + op.w / 2, y: hy, z: wz0 - off, rotY: 0 };
        case 'back':  return { x: wxC - hx - op.w / 2, y: hy, z: wz1 + off, rotY: Math.PI };
      }
      return null;
    }

    function westPanePos(op, blanked) {
      const off = blanked ? blankEps : eps;
      const hy = wH - op.y - op.h / 2;
      const px = wx0 + t + op.x + op.w / 2;
      switch (wing.face) {
        case 'east':
        case 'west':
          return { x: px, y: hy, z: wz0 - off, rotY: 0 };
        case 'front':
          return { x: wx0 - off, y: hy, z: wz1 - t - op.x - op.w / 2, rotY: -Math.PI / 2 };
        case 'back':
          return { x: wx0 - off, y: hy, z: wz0 + t + op.x + op.w / 2, rotY: -Math.PI / 2 };
      }
      return null;
    }

    function eastPanePos(op, blanked) {
      const off = blanked ? blankEps : eps;
      const hy = wH - op.y - op.h / 2;
      const px = wx1 - t - op.x - op.w / 2;
      switch (wing.face) {
        case 'east':
        case 'west':
          return { x: px, y: hy, z: wz1 + off, rotY: Math.PI };
        case 'front':
          return { x: wx1 + off, y: hy, z: wz1 - t - op.x - op.w / 2, rotY: Math.PI / 2 };
        case 'back':
          return { x: wx1 + off, y: hy, z: wz0 + t + op.x + op.w / 2, rotY: Math.PI / 2 };
      }
      return null;
    }

    switch (wing.face) {
      case 'east':
        addWingFaceDef('back', fW, outerOps, wingBlankedOuter, false, Math.PI / 2, { x: wx1 - t, y: 0, z: wzC }, outerPanePos);
        if (!cp3d.westCoplanar) addWingFaceDef('west', sLen, westOps, wingBlankedWest, false, 0, { x: wxC, y: 0, z: wz0 }, westPanePos);
        if (!cp3d.eastCoplanar) addWingFaceDef('east', sLen, eastOps, wingBlankedEast, true, 0, { x: wxC, y: 0, z: wz1 - t }, eastPanePos);
        break;

      case 'west':
        addWingFaceDef('back', fW, outerOps, wingBlankedOuter, false, -Math.PI / 2, { x: wx0 + t, y: 0, z: wzC }, outerPanePos);
        if (!cp3d.westCoplanar) addWingFaceDef('west', sLen, westOps, wingBlankedWest, false, 0, { x: wxC, y: 0, z: wz0 }, westPanePos);
        if (!cp3d.eastCoplanar) addWingFaceDef('east', sLen, eastOps, wingBlankedEast, true, 0, { x: wxC, y: 0, z: wz1 - t }, eastPanePos);
        break;

      case 'front':
        addWingFaceDef('back', fW, outerOps, wingBlankedOuter, false, 0, { x: wxC, y: 0, z: wz0 }, outerPanePos);
        if (!cp3d.westCoplanar) addWingFaceDef('west', sLen, westOps, wingBlankedWest, true, -Math.PI / 2, { x: wx0 + t, y: 0, z: wzC }, westPanePos);
        if (!cp3d.eastCoplanar) addWingFaceDef('east', sLen, eastOps, wingBlankedEast, true,  Math.PI / 2, { x: wx1 - t, y: 0, z: wzC }, eastPanePos);
        break;

      case 'back':
        addWingFaceDef('back', fW, outerOps, wingBlankedOuter, true, Math.PI, { x: wxC, y: 0, z: wz1 - t }, outerPanePos);
        if (!cp3d.westCoplanar) addWingFaceDef('west', sLen, westOps, wingBlankedWest, false, -Math.PI / 2, { x: wx0 + t, y: 0, z: wzC }, westPanePos);
        if (!cp3d.eastCoplanar) addWingFaceDef('east', sLen, eastOps, wingBlankedEast, false,  Math.PI / 2, { x: wx1 - t, y: 0, z: wzC }, eastPanePos);
        break;
    }

    render3DBlockWalls3D(`Wing ${wi + 1}`, wingFaceDefs3D);

    // Wing roof
    if (wingIsParapet3D) {
      addParapetRoofPreview(bW, bD, wH, wPlan.parapetH || 0, wxC, wzC, makeRoofTopMat(Math.max(t, bW - 2 * t), Math.max(t, bD - 2 * t)));
    } else {
      const wRoof = new THREE.Mesh(
        new THREE.BoxGeometry(bW, t, bD),
        [roofMat, roofMat, makeRoofTopMat(bW, bD), roofMat, roofMat, roofMat]
      );
      wRoof.position.set(wxC, wH + t / 2, wzC);
      group.add(wRoof);
    }

    // Wing embedded rail preview + internal trusses / supports
    addEmbeddedRailsPreview3D(wCfg, bW, bD, wxC, wzC);
    addTrussAndSupportPreview3D(wCfg, wPlan, bW, bD, wH, wxC, wzC);
  }

  // ---- Rooftop mech room ----
  if (cfg.rooftopMechRoom) {
    const mechMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const mech = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.rooftopMechRoomWidth, cfg.rooftopMechRoomHeight, cfg.rooftopMechRoomDepth),
      mechMat
    );
    mech.position.set(cfg.rooftopMechRoomXOffset, h + cfg.rooftopMechRoomHeight / 2 + t, cfg.rooftopMechRoomYOffset);
    group.add(mech);
  }

  // ---- Rooftop equipment STLs (matches the 3D-printable model emitted by
  // the build). Each placement's roof-local (x, y) gives the bottom-left
  // (front-west) corner of the footprint; centre it and translate the mesh
  // group to the deck-top world position. The roof-local frame has y=0 at
  // the FRONT (south) edge and y=roofD at the BACK (north) edge, matching
  // the mech-room positioning convention where +Z = back. ----
  if (plan.rooftopEquipPlacements && plan.rooftopEquipPlacements.length > 0) {
    const isParapet = (cfg.roofStyle === 'parapet');
    const pH = plan.parapetH || 0;
    // Roof bounds used by the placement algorithm (must match buildEdgePlans).
    const roofW = isParapet ? (cfg.width - 2 * t)  : cfg.width;
    const roofD = isParapet ? (cfg.depth - 2 * t)  : cfg.depth;
    // Deck top world-Y. For parapet roofs, the deck is recessed below the
    // wall tops by parapetH; for non-parapet roofs the mech room convention
    // (h + t) is the closest approximation we have. Slanted/gabled roofs
    // get the same flat-deck approximation — equipment placement is
    // already authored against a flat roof piece in the laser-cut output.
    const deckTopY = isParapet ? (h - pH + t) : (h + t);
    for (const p of plan.rooftopEquipPlacements) {
      const mesh = build3DEquipMesh({ equipKey: p.key });
      if (!mesh) continue;
      // Convert roof-local bottom-left → world-centered position.
      const cx = (p.x + p.w / 2) - roofW / 2;
      const cz = (p.y + p.d / 2) - roofD / 2;
      mesh.position.set(cx, deckTopY, cz);
      group.add(mesh);
    }
  }

  // ---- Rooftop shield wall ----
  if (cfg.rooftopShield && cfg.rooftopShield.enabled) {
    const { height: shH = 8, offset: shOff = 3 } = cfg.rooftopShield;
    const shMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
    const roofTopZ = h + t;
    const shW = w - 2 * shOff, shD = d - 2 * shOff;
    // Four thin walls around the perimeter
    const shDefs = [
      // [geomW, geomH, geomD, posX, posZ]
      [shW, shH, t,  0,              -(shD/2 + t/2) + shOff - d/2],  // north
      [shW, shH, t,  0,               (shD/2 + t/2) - shOff + d/2],  // south
      [t,   shH, shD, -(shW/2 + t/2) + shOff - w/2, 0],              // west
      [t,   shH, shD,  (shW/2 + t/2) - shOff + w/2, 0],              // east
    ];
    for (const [gW, gH, gD, px, pz] of shDefs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(gW, gH, gD), shMat);
      m.position.set(px, roofTopZ + gH / 2, pz);
      group.add(m);
    }
  }

  // ---- Awnings (cfg.awnings — legacy sloped style) ----
  for (const aw of (cfg.awnings || [])) {
    const awMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
    const awDepth = aw.depth || 15, awAngle = (aw.angle || 20) * Math.PI / 180;
    const awH = awDepth * Math.sin(awAngle);
    const awPose = wallLocalTo3D(aw.face || 'front', Number(aw.x || 0), 0, Number(aw.w || 0), awH, {
      // Legacy cfg.awnings have no wall-y coordinate; keep their old low-wall
      // vertical placement but unify face orientation and X/Z mapping here.
      centerY: h - (awH / 2 + h * 0.15),
      outward: awDepth * Math.cos(awAngle) / 2,
    });
    const awMesh = new THREE.Mesh(new THREE.BoxGeometry(aw.w, t * 2, awDepth), awMat);
    awMesh.rotation.x = -awAngle;
    awMesh.rotation.y = awPose.rotY;
    awMesh.position.set(awPose.x, awPose.y, awPose.z);
    group.add(awMesh);
  }

  // ---- Balconies (editor-placed) ----
  // Pivot sits at the wall face. Local -z = outward (away from building), +z = inward.
  // External slabs project in -z; internal voids open in +z.
  {
    const intWallMat = new THREE.MeshStandardMaterial({ color: 0x3a5a6e, roughness: 0.8 });
    const extSlabMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.9 });
    const railMat    = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const beamMat    = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.7 });
    const floorMat   = new THREE.MeshStandardMaterial({ color: 0x2a4a5e, transparent: true, opacity: 0.22, side: THREE.DoubleSide });

    for (const face of ['front', 'back', 'east', 'west']) {
      const bals   = surfaceWallFeaturesForFace(cfg, face, 'balcony');
      const wallW_b = (face === 'front' || face === 'back') ? w : sideLen;

      for (const b of bals) {
        const bW = Number(b.w) || 0, bD = Number(b.d) || 0, bH = Number(b.h) || 0;
        const bX = Number(b.x) || 0;
        if (bW <= 0 || bD <= 0 || bH <= 0 || !isFinite(bW + bD + bH)) continue;

        const touchL = bX <= BALCONY_TOUCH_MARGIN;
        const touchR = (bX + bW) >= (wallW_b - BALCONY_TOUCH_MARGIN);
        const isInt  = b.balconyType === 'internal';

        const pivot = makeWallSurfacePivot3D(face, bX, Number(b.y || 0), bW, bH);

        if (isInt) {
          // Side walls run inward (+z)
          if (!touchL) { const m=new THREE.Mesh(new THREE.BoxGeometry(t,bH,bD),intWallMat); m.position.set(-bW/2, 0, +bD/2); pivot.add(m); }
          if (!touchR) { const m=new THREE.Mesh(new THREE.BoxGeometry(t,bH,bD),intWallMat); m.position.set( bW/2, 0, +bD/2); pivot.add(m); }
          // Back railing at rear of void (+z = bD)
          { const m=new THREE.Mesh(new THREE.BoxGeometry(bW,bH,t),railMat); m.position.set(0, 0, +bD); pivot.add(m); }
          // Floor plane at bottom of void
          { const m=new THREE.Mesh(new THREE.PlaneGeometry(bW,bD),floorMat); m.rotation.x=-Math.PI/2; m.position.set(0,-bH/2,+bD/2); pivot.add(m); }
          // L-shape corner beam at outer inward corner
          if (touchL || touchR) {
            const bsz = t * 2, bx = touchL ? -bW/2 : bW/2;
            const m = new THREE.Mesh(new THREE.BoxGeometry(bsz,bH,bsz),beamMat);
            m.position.set(bx, 0, +bD); pivot.add(m);
          }
        } else {
          // External: slab and railings project outward (-z)
          const slabT3d = 1.2, railH = Math.max(2, bH - slabT3d);
          { const m=new THREE.Mesh(new THREE.BoxGeometry(bW,slabT3d,bD),extSlabMat); m.position.set(0,-bH/2+slabT3d/2,-bD/2); pivot.add(m); }
          { const m=new THREE.Mesh(new THREE.BoxGeometry(bW,railH,t),railMat); m.position.set(0,-bH/2+slabT3d+railH/2,-bD); pivot.add(m); }
          if (!touchL) { const m=new THREE.Mesh(new THREE.BoxGeometry(t,railH,bD),railMat); m.position.set(-bW/2,-bH/2+slabT3d+railH/2,-bD/2); pivot.add(m); }
          if (!touchR) { const m=new THREE.Mesh(new THREE.BoxGeometry(t,railH,bD),railMat); m.position.set( bW/2,-bH/2+slabT3d+railH/2,-bD/2); pivot.add(m); }
          // Corner posts
          const psz = t * 2;
          if (!touchL) { const m=new THREE.Mesh(new THREE.BoxGeometry(psz,bH,psz),beamMat); m.position.set(-bW/2,-bH/2+bH/2,-bD); pivot.add(m); }
          if (!touchR) { const m=new THREE.Mesh(new THREE.BoxGeometry(psz,bH,psz),beamMat); m.position.set( bW/2,-bH/2+bH/2,-bD); pivot.add(m); }
        }

        group.add(pivot);
      }
    }
  }

  // ---- Surface fixtures (editor-placed: vents, meters, signs, lanterns…) ----
  // Each fixture renders as a stacked column of thin boxes — one per piece in
  // the style. The stack grows outward from the wall surface so deep-tier
  // fixtures (mini-split AC, banners, lanterns) project visibly further than
  // shallow-tier ones (vents, downspouts, noren). Local +Z is into the building,
  // local -Z is outward, mirroring the balcony pivot convention.
  {
    // Approximate cardstock thickness, exaggerated × 4 for 3D legibility at
    // this scale. Real 0.28mm material is invisibly thin in a building-sized
    // model; bumping it up gives the depth tiers a chance to read.
    const LAYER_T = 1.1;
    // Fallback material colours per material id (used when a piece doesn't
    // carry a panelFill, or for tinted faces).
    function parseFixtureColor(raw) {
      // Accept '#rrggbb' or 'rgba(r,g,b,a)'. Return null when the fixture
      // piece does not specify its own colour so the assigned material swatch
      // can drive the 3D colour.
      if (!raw) return null;
      if (raw[0] === '#') {
        const hex = raw.slice(1);
        if (hex.length === 6) return parseInt(hex, 16);
        if (hex.length === 3) return parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16);
      }
      const m = raw.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
      if (m) return (parseInt(m[1]) << 16) | (parseInt(m[2]) << 8) | parseInt(m[3]);
      return null;
    }

    for (const face of ['front', 'back', 'east', 'west']) {
      const fxs = surfaceWallFeaturesForFace(cfg, face, 'fixture');
      const wallW_fx = (face === 'front' || face === 'back') ? w : sideLen;

      for (const fx of fxs) {
        const style = FIXTURE_STYLES[fx.style];
        if (!style) continue;
        // Etched fixtures are pure cladding engraving — no 3D geometry.
        // They show on the cladding cut sheet but don't project from the wall.
        if (style.placement === 'etched') continue;
        const fW = Number(fx.w) || style.width;
        const fH = Number(fx.h) || style.height;
        const fX = Number(fx.x) || 0;
        if (fW <= 0 || fH <= 0 || !isFinite(fW + fH)) continue;

        // Mount-point pivot at the wall surface, oriented outward (-z local)
        const pivot = makeWallSurfacePivot3D(face, fX, Number(fx.y || 0), fW, fH);

        // Cutout fixtures — render as a flat dark patch at the wall surface,
        // suggesting a hole without doing actual CSG. The patch is sized to
        // the fixture's footprint and uses the piece's shape (circle or rect).
        // Very thin (LAYER_T_HOLE) so it reads as "into the wall" rather than
        // proud of it; matte near-black material to feel cavity-like.
        if (style.placement === 'cutout') {
          const LAYER_T_HOLE = 0.2;
          const piece0 = style.pieces && style.pieces[0];
          const isCircleHole = piece0 && piece0.shape === 'circle';
          const holeMat = new THREE.MeshStandardMaterial({
            color: 0x080808, roughness: 0.95, metalness: 0.0,
          });
          let holeMesh;
          if (isCircleHole) {
            // Cylinder along local Z axis (axis = outward from wall)
            const rx = fW / 2, ry = fH / 2;
            // Use min radius for cylinder (single radius). For oval/ellipse,
            // approximate with the smaller radius for the visible disc.
            const radius = Math.min(rx, ry);
            const geo = new THREE.CylinderGeometry(radius, radius, LAYER_T_HOLE, 24);
            holeMesh = new THREE.Mesh(geo, holeMat);
            holeMesh.rotation.x = Math.PI / 2;  // cylinder axis along z (out)
            // If user made it oval, scale x or y to match. Visual approximation.
            if (Math.abs(rx - ry) > 0.05) {
              holeMesh.scale.x = rx / radius;
              holeMesh.scale.y = ry / radius;
            }
          } else {
            const geo = new THREE.BoxGeometry(fW, fH, LAYER_T_HOLE);
            holeMesh = new THREE.Mesh(geo, holeMat);
          }
          // Sit the patch's outer face just barely proud of the wall (so it's
          // not z-fighting with the cladding) but still reads as flat/recessed.
          holeMesh.position.set(0, 0, -LAYER_T_HOLE / 2 - 0.02);
          pivot.add(holeMesh);
          group.add(pivot);
          continue;
        }

        // Each piece is a thin box stacked outward.
        // The depth tier controls how many full-size base layers stack; accent
        // pieces (with their own offsetX/Y/width/height) sit ON TOP of the
        // full bases at their own offset, NOT adding to the stack height.
        // We grow zOut as we go through base-shaped pieces; accent pieces
        // get their own zOut atop the current stack.
        const renderPieces = effectiveFixturePieces(cfg, face, fx.style, fW, fH);
        let baseZOut = 0;
        for (const piece of renderPieces) {
          const hasOffset = (piece.offsetX != null) || (piece.offsetY != null) ||
                            (piece.width   != null) || (piece.height  != null);
          // Piece bounds (in fixture-local mm, top-left origin)
          const pOx = (piece.offsetX != null) ? piece.offsetX : 0;
          const pOy = (piece.offsetY != null) ? piece.offsetY : 0;
          const pW  = (piece.width   != null) ? piece.width   : style.width;
          const pH  = (piece.height  != null) ? piece.height  : style.height;
          // Scale to user-resized fixture
          const scaleX = fW / style.width;
          const scaleY = fH / style.height;
          const wWorld = pW * scaleX;
          const hWorld = pH * scaleY;

          // Position within fixture-local space (offset from fixture top-left)
          // Convert to pivot-centred local coords (pivot is at fixture centre,
          // +Y up, -Z out from wall)
          const localX = (pOx + pW / 2) * scaleX - fW / 2;
          const localY = fH / 2 - (pOy + pH / 2) * scaleY;
          // Outward stacking: base pieces extend the stack; accent pieces sit
          // on top of the existing stack.
          const zOut = hasOffset ? (baseZOut + LAYER_T / 2)
                                 : (baseZOut + LAYER_T / 2);
          if (!hasOffset) baseZOut += LAYER_T;

          // Material
          const matKey = piece.material || 'cladding';
          const color  = parseFixtureColor(piece.panelFill);
          const fxMat  = color != null
            ? new THREE.MeshStandardMaterial({ color, roughness: matKey === 'plaster' ? 0.88 : 0.72, metalness: 0.0 })
            : material3DForId(cfg, matKey, { roughness: matKey === 'plaster' ? 0.88 : 0.72, metalness: 0.0 }, 0xc8c8c0);

          let mesh;
          if (piece.shape === 'circle') {
            // Cylinder along Z axis — flat disc parallel to wall face
            const radius = wWorld / 2;
            const geo = new THREE.CylinderGeometry(radius, radius, LAYER_T, 18);
            mesh = new THREE.Mesh(geo, fxMat);
            mesh.rotation.x = Math.PI / 2;  // cylinder axis = Z (out from wall)
          } else {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(wWorld, hWorld, LAYER_T), fxMat);
          }
          // Place outward: local -Z is outward, so negate zOut
          mesh.position.set(localX, localY, -zOut);
          pivot.add(mesh);

          // Visualize internal cutouts in glue-on ring/flange pieces as a dark
          // shallow patch on top. Actual laser cut is generated in fixture SVG.
          if (piece.innerCut) {
            const ic = piece.innerCut;
            const ix = ((ic.x != null) ? ic.x : ((ic.xRatio || 0) * pW)) * scaleX;
            const iy = ((ic.y != null) ? ic.y : ((ic.yRatio || 0) * pH)) * scaleY;
            const iw = ((ic.w != null) ? ic.w : ((ic.wRatio || 0.5) * pW)) * scaleX;
            const ih = ((ic.h != null) ? ic.h : ((ic.hRatio || 0.5) * pH)) * scaleY;
            const holeX = (pOx * scaleX + ix + iw / 2) - fW / 2;
            const holeY = fH / 2 - (pOy * scaleY + iy + ih / 2);
            const hmat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.0 });
            let hmesh;
            if (ic.shape === 'circle') {
              const rad = Math.min(iw, ih) / 2;
              hmesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, LAYER_T * 0.18, 18), hmat);
              hmesh.rotation.x = Math.PI / 2;
              if (Math.abs(iw - ih) > 0.05) {
                hmesh.scale.x = (iw / 2) / rad;
                hmesh.scale.y = (ih / 2) / rad;
              }
            } else {
              hmesh = new THREE.Mesh(new THREE.BoxGeometry(iw, ih, LAYER_T * 0.18), hmat);
            }
            hmesh.position.set(holeX, holeY, -zOut - LAYER_T * 0.11);
            pivot.add(hmesh);
          }
        }

        group.add(pivot);
      }
    }
  }

  // ---- Shutters (decorative pairs flanking selected windows) ----
  // Each window with hasShutters:true gets a left + right shutter pair
  // glued to the cladding next to the opening. Width = SHUTTER_W_RATIO of
  // the window's width, height = window height. Same color/material logic
  // as fixtures, with a thin (1×LAYER_T) projection out from the wall.
  {
    const SHUTTER_T = 1.0;  // 3D thickness (slightly less than fixtures)
    function parseShColor(raw) {
      if (!raw) return 0x6a4a2a;
      if (raw[0] === '#') {
        const hex = raw.slice(1);
        if (hex.length === 6) return parseInt(hex, 16);
        if (hex.length === 3) return parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16);
      }
      return 0x6a4a2a;
    }
    for (const face of ['front', 'back', 'east', 'west']) {
      const ops = structuralWallFeaturesForFace(cfg, face);
      const wallW_sh = (face === 'front' || face === 'back') ? w : sideLen;
      for (const op of ops) {
        if (op.type !== 'window' || !op.hasShutters) continue;
        const styleKey = op.shutterStyle || 'louvered';
        const style = SHUTTER_STYLES[styleKey];
        if (!style) continue;
        const winW = Number(op.w) || 0;
        const winH = Number(op.h) || 0;
        const winX = Number(op.x) || 0;
        if (winW <= 0 || winH <= 0) continue;

        const shW = Math.max(2, winW * SHUTTER_W_RATIO);
        const shH = winH;
        const worldY = h - Number(op.y || 0) - winH / 2;

        const fill = parseShColor(style.panelFill);
        const matObj = new THREE.MeshStandardMaterial({ color: fill, roughness: 0.75, metalness: 0.0 });
        // Build both shutters; place them flanking the window
        for (const side of ['L', 'R']) {
          const isL = side === 'L';
          // Center of the shutter in wall-local x = window x ± shW/2 ± winW/2
          const centerX_wall = winX + (isL ? -shW / 2 : winW + shW / 2);
          // Mesh in pivot-local coords (pivot at wall centre, outward = -z)
          const pivot = makeWallSurfacePivot3D(face, centerX_wall, Number(op.y || 0), shW, shH, {
            centerX: centerX_wall,
            centerY: Number(op.y || 0) + winH / 2,
          });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(shW, shH, SHUTTER_T), matObj);
          mesh.position.set(0, 0, -SHUTTER_T / 2 - 0.05);
          pivot.add(mesh);
          group.add(pivot);
        }
      }
    }
  }

  // ---- Cladding overrides (secondary-cladding patches glued onto the wall) ----
  // Render as a very thin plate just proud of the cladding surface so it
  // reads as a different material zone without disturbing the wall depth.
  // The plate's colour comes from the cladding style; if the style has no
  // distinctive colour, we pick a soft beige hatching tone.
  {
    const OVERRIDE_T = 0.4;  // 3D thickness — thin layer over the cladding
    function parseClColor(raw) {
      if (!raw || raw[0] !== '#') return null;
      const hex = raw.slice(1);
      if (hex.length === 6) return parseInt(hex, 16);
      if (hex.length === 3) return parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16);
      return null;
    }
    // Per-style tint map for visual contrast. Cladding styles don't carry
    // their own colour, so we derive a soft hint here based on the style's
    // typical real-world tone (concrete grey, brick red, wood brown, etc.)
    const styleTintByKey = {
      alc_panel:           0xd4ccc0,
      alc_panel_horizontal:0xd4ccc0,
      alc_panel_wide:      0xd4ccc0,
      alc_panel_bolted:    0xc8c0b4,
      alc_panel_ribbed:    0xd4ccc0,
      ribbed_metal_wide:   0xa8a8a4,
      ribbed_metal_narrow: 0xa8a8a4,
      galvalume_vertical:  0xb4b0a8,
      corrugated_metal_overlap: 0xa8a098,
      cement_siding_lap:   0xe0d8c4,
      concrete_panel_large:0xc4bfb4,
      fluted_concrete:     0xb0aaa0,
      mosaic_tile:         0xc0b09c,
      hira_gawara_wall:    0x5a4838,
      board_batten:        0xa88860,
      brick_running:       0xa05844,
      brick_stack:         0xa05844,
      vertical_planks:     0xa88860,
      shou_sugi_ban:       0x2a2218,
      plaster_smooth:      0xece4cf,
      plaster_textured:    0xe8dcc4,
      tile_square:         0xc0a890,
      tile_subway:         0xe8e0d4,
    };
    for (const face of ['front', 'back', 'east', 'west']) {
      const ops = surfaceWallFeaturesForFace(cfg, face, 'cladding_override');
      const wallW_ov = (face === 'front' || face === 'back') ? w : sideLen;
      for (const op of ops) {
        const ow = Number(op.w) || 0;
        const oh = Number(op.h) || 0;
        const ox_op = Number(op.x) || 0;
        if (ow <= 0 || oh <= 0) continue;
        const tint = MaterialRegistry.colorNumber(MaterialRegistry.claddingMaterialId(op.claddingStyle, cfg), cfg, styleTintByKey[op.claddingStyle] || 0xd4c8ad);
        const matObj = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, metalness: 0.0 });
        const centerX_wall = ox_op + ow / 2;
        const pivot = makeWallSurfacePivot3D(face, ox_op, Number(op.y || 0), ow, oh);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, OVERRIDE_T), matObj);
        mesh.position.set(0, 0, -OVERRIDE_T / 2 - 0.03);
        pivot.add(mesh);
        group.add(pivot);
      }
    }
  }

  // ---- Printed items (paper/sticker pieces glued to the wall) ----
  // Render the actual PRINTED_STYLES designSvg artwork as a texture on a
  // paper-thin wall plane, with a tiny backing slab so placement remains
  // visible even before the browser finishes loading the SVG data texture.
  {
    const PRINTED_T = 0.25;  // very thin sticker-like layer
    const backingMat = new THREE.MeshStandardMaterial({
      color: MaterialRegistry.colorNumber('printed', cfg, 0xf7f4ea),
      roughness: 0.9,
      metalness: 0.0,
    });

    for (const face of ['front', 'back', 'east', 'west']) {
      const items = surfaceWallFeaturesForFace(cfg, face, 'printed_item');
      for (const op of items) {
        const ow = Number(op.w) || 0;
        const oh = Number(op.h) || 0;
        const ox_op = Number(op.x) || 0;
        if (ow <= 0 || oh <= 0) continue;

        const pivot = makeWallSurfacePivot3D(face, ox_op, Number(op.y || 0), ow, oh);

        // Thin backing gives the print physical thickness and avoids the
        // "invisible while texture is loading" problem.
        const backing = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, PRINTED_T), backingMat);
        backing.position.set(0, 0, -PRINTED_T / 2 - 0.018);
        pivot.add(backing);

        const tex = printedItemTexture3D(op.style, ow, oh);
        const artMat = tex
          ? new THREE.MeshBasicMaterial({
              color: 0xffffff,
              map: tex,
              transparent: true,
              side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
            })
          : backingMat;

        const art = new THREE.Mesh(new THREE.PlaneGeometry(ow, oh), artMat);
        art.position.set(0, 0, -PRINTED_T - 0.035);
        pivot.add(art);

        group.add(pivot);
      }
    }
  }

    // ---- Skylights (roof hole with framed plexi pane) ----
  // Skylight x/y are stored as the CENTRE of the roof hole in plan view.
  // In 3D, build each skylight as a small assembly that sits on top of the
  // actual roof surface instead of floating at a single flat Y plane.
  {
    const FRAME_T = 1.5;
    const PLEXI_T = 0.5;
    const SKY_EPS = 0.03;   // tiny lift to avoid z-fighting with the roof
    const skyFrameMat = new THREE.MeshStandardMaterial({ color: 0x6a6055, roughness: 0.7, metalness: 0.0 });
    const skyPlexiMat = new THREE.MeshStandardMaterial({
      color: 0x9bcfee, roughness: 0.15, metalness: 0.0,
      transparent: true, opacity: 0.55,
    });

    function addSkylightAssembly(worldX, worldY, worldZ, sw, sh, rotX = 0, rotZ = 0) {
      const outerW_sky = sw + SKYLIGHT_FRAME_MARGIN * 2;
      const outerH_sky = sh + SKYLIGHT_FRAME_MARGIN * 2;

      const skyGroup = new THREE.Group();
      skyGroup.position.set(worldX, worldY + SKY_EPS, worldZ);
      skyGroup.rotation.x = rotX;
      skyGroup.rotation.z = rotZ;

      // Plexi pane (sits between the two frames). Sized to the outer frame
      // footprint so it visually fills the framed area.
      const plexi = new THREE.Mesh(
        new THREE.BoxGeometry(outerW_sky, PLEXI_T, outerH_sky),
        skyPlexiMat);
      plexi.position.set(0, FRAME_T + PLEXI_T / 2, 0);
      skyGroup.add(plexi);

      // Render a four-bar outline for the lower frame and upper frame so
      // they read as a "frame around the plexi" without rendering a hole
      // (CSG ops are heavy at runtime; a 4-bar approximation is cheap).
      const barTop  = SKYLIGHT_FRAME_MARGIN;
      const barSide = SKYLIGHT_FRAME_MARGIN;
      function addFrameBars(baseY) {
        const topBar = new THREE.Mesh(
          new THREE.BoxGeometry(outerW_sky, FRAME_T, barTop),
          skyFrameMat);
        topBar.position.set(0, baseY + FRAME_T / 2, -sh / 2 - barTop / 2);
        skyGroup.add(topBar);

        const botBar = new THREE.Mesh(
          new THREE.BoxGeometry(outerW_sky, FRAME_T, barTop),
          skyFrameMat);
        botBar.position.set(0, baseY + FRAME_T / 2, sh / 2 + barTop / 2);
        skyGroup.add(botBar);

        const lftBar = new THREE.Mesh(
          new THREE.BoxGeometry(barSide, FRAME_T, sh),
          skyFrameMat);
        lftBar.position.set(-sw / 2 - barSide / 2, baseY + FRAME_T / 2, 0);
        skyGroup.add(lftBar);

        const rgtBar = new THREE.Mesh(
          new THREE.BoxGeometry(barSide, FRAME_T, sh),
          skyFrameMat);
        rgtBar.position.set(sw / 2 + barSide / 2, baseY + FRAME_T / 2, 0);
        skyGroup.add(rgtBar);
      }

      addFrameBars(0);                         // lower frame
      addFrameBars(FRAME_T + PLEXI_T);         // upper frame
      group.add(skyGroup);
    }

    function skylightRoofSurfacePose(skyX, skyY) {
      const worldX = skyX - w / 2;
      const worldZ = skyY - d / 2;

      if (roofStyle3d === 'slanted') {
        const pitch = cfg.roofPitch || 10;
        const slopeDir = cfg.roofSlopeDirection || 'back';
        const nsAxis = (slopeDir === 'front' || slopeDir === 'back');
        const span = nsAxis ? d : w;
        const angle = Math.atan2(pitch, span);
        const centerY = h + pitch / 2;

        if (nsAxis) {
          const rotX = (slopeDir === 'back' ? -angle : angle);
          const surfaceY = centerY + (t / (2 * Math.cos(rotX))) - worldZ * Math.tan(rotX);
          return { worldX, worldY: surfaceY, worldZ, rotX, rotZ: 0 };
        } else {
          const rotZ = (slopeDir === 'east' ? angle : -angle);
          const surfaceY = centerY + (t / (2 * Math.cos(rotZ))) + worldX * Math.tan(rotZ);
          return { worldX, worldY: surfaceY, worldZ, rotX: 0, rotZ };
        }
      }

      if (isPreviewGabledRoofStyle(roofStyle3d)) {
        const pitch = cfg.roofPitch || 10;
        const ridgeDir = getPreviewEffectiveRidgeDir(cfg);
        const ewRidge = (ridgeDir === 'ew');
        const isParapetGable = roofStyle3d === 'parapet_gable';
        const roofBaseY = isParapetGable ? h - pH3d : h;
        const roofW = isParapetGable ? Math.max(t, w - 2 * t) : w;
        const roofD = isParapetGable ? Math.max(t, d - 2 * t) : d;
        const roofOverhangFB = isParapetGable ? 0 : ohFB3;
        const roofOverhangEW = isParapetGable ? 0 : ohEW3;
        const halfSpan = ewRidge ? roofD / 2 : roofW / 2;
        const slantAngle = Math.atan2(pitch, halfSpan);
        const ohEave  = ewRidge ? roofOverhangFB : roofOverhangEW;
        const ridgeShift = (t / 2) * Math.sin(slantAngle);
        const panelCentreOffset = (halfSpan + ohEave) / 2 + ridgeShift;
        const centerY = roofBaseY + pitch / 2;

        if (ewRidge) {
          const sign = (worldZ < 0) ? -1 : 1;          // front half / back half
          const rotX = sign * slantAngle;
          const centerZ = sign * panelCentreOffset;
          const surfaceY = centerY + (t / (2 * Math.cos(rotX))) - (worldZ - centerZ) * Math.tan(rotX);
          return { worldX, worldY: surfaceY, worldZ, rotX, rotZ: 0 };
        } else {
          const sign = (worldX < 0) ? -1 : 1;          // west half / east half
          const rotZ = -sign * slantAngle;
          const centerX = sign * panelCentreOffset;
          const surfaceY = centerY + (t / (2 * Math.cos(rotZ))) + (worldX - centerX) * Math.tan(rotZ);
          return { worldX, worldY: surfaceY, worldZ, rotX: 0, rotZ };
        }
      }

      if (roofStyle3d === 'flat_overhang') {
        return { worldX, worldY: h + t, worldZ, rotX: 0, rotZ: 0 };
      }

      // Parapet / flat deck: skylights sit on the recessed roof deck inside
      // the parapet rather than up at the parapet wall top.
      const deckY = h - (plan.parapetH || 0) + t;
      return { worldX, worldY: deckY, worldZ, rotX: 0, rotZ: 0 };
    }

    for (const sky of (cfg.skylights || [])) {
      const sw = Number(sky.w) || 0;
      const sh = Number(sky.h) || 0;
      const sx_local = Number(sky.x) || 0;
      const sy_local = Number(sky.y) || 0;
      if (sw <= 0 || sh <= 0) continue;

      const pose = skylightRoofSurfacePose(sx_local, sy_local);
      addSkylightAssembly(pose.worldX, pose.worldY, pose.worldZ, sw, sh, pose.rotX, pose.rotZ);
    }
  }

  // ---- Billboards ----
  for (const bb of (cfg.billboards || [])) {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.75, metalness: 0.45 });
    const bbW = bb.w || 25, bbH = bb.height || 18, postH = bb.postHeight || 12;
    const roofTopY = h + t;
    let bbX = (bb.x || 0) + bbW / 2 - w / 2, bbZ = 0;
    switch (bb.face) {
      case 'front': bbZ = -d / 4; break;
      case 'back':  bbZ =  d / 4; break;
      case 'east':  bbZ = 0; bbX = w / 4; break;
      case 'west':  bbZ = 0; bbX = -w / 4; break;
    }

    const mR = t * 0.38, bR = t * 0.26;
    const upV = new THREE.Vector3(0, 1, 0);
    function beam(ax, ay, az, bx, by, bz, r) {
      const pA = new THREE.Vector3(ax, ay, az), pB = new THREE.Vector3(bx, by, bz);
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const len = dir.length();
      if (len < 0.1) return;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), steelMat);
      m.position.copy(pA).addScaledVector(dir.clone().normalize(), len / 2);
      m.quaternion.setFromUnitVectors(upV, dir.normalize());
      group.add(m);
    }

    // ── Square / four-faced column sign ─────────────────────────────────────
    if (bb.type === 'square') {
      const tW = bbW * 0.65, tHalf = tW / 2;
      const tBot = roofTopY, tTop = roofTopY + postH;
      const signCY = tTop + bbH / 2;

      // Semi-transparent sign cube (lets you see the tower inside)
      const cubeSign = new THREE.Mesh(
        new THREE.BoxGeometry(bbW, bbH, bbW),
        new THREE.MeshStandardMaterial({ color: 0xdde8f0, roughness: 0.5, transparent: true, opacity: 0.22 })
      );
      cubeSign.position.set(bbX, signCY, bbZ);
      group.add(cubeSign);

      // Four corner posts + base foot plates
      const corners = [
        [bbX - tHalf, bbZ - tHalf], [bbX + tHalf, bbZ - tHalf],
        [bbX + tHalf, bbZ + tHalf], [bbX - tHalf, bbZ + tHalf],
      ];
      for (const [cx, cz] of corners) {
        beam(cx, tBot, cz, cx, tTop, cz, mR * 1.1);
        const fp = new THREE.Mesh(new THREE.CylinderGeometry(mR * 2.5, mR * 2.5, t * 0.4, 6), steelMat);
        fp.position.set(cx, tBot + t * 0.2, cz);
        group.add(fp);
      }

      // Four identical faces — horizontal rails + X-bracing per bay
      // (each face is a flat laser-cuttable lattice panel)
      const facePairs = [[0,1],[1,2],[2,3],[3,0]];
      const hRails = 3;
      for (const [ai, bi] of facePairs) {
        const [ax, az] = corners[ai], [bx, bz] = corners[bi];
        for (let i = 0; i <= hRails; i++) {
          const ry = tBot + postH * i / hRails;
          beam(ax, ry, az, bx, ry, bz, bR);
        }
        for (let i = 0; i < hRails; i++) {
          const y0 = tBot + postH * i / hRails, y1 = tBot + postH * (i + 1) / hRails;
          beam(ax, y0, az, bx, y1, bz, bR * 0.75);
          beam(bx, y0, bz, ax, y1, az, bR * 0.75);
        }
      }

      // Diagonal knee braces from each post base outward to roof — classic Japanese detail
      const braceOut = tW * 0.55;
      for (const [cx, cz] of corners) {
        const ox = bbX + Math.sign(cx - bbX) * braceOut;
        const oz = bbZ + Math.sign(cz - bbZ) * braceOut;
        beam(cx, tBot + postH * 0.35, cz, ox, tBot, oz, bR);
      }

    // ── Flat / two-faced panel sign (standard rooftop billboard) ────────────
    } else {
      const sL = bbX - bbW / 2, sR = bbX + bbW / 2;
      const signBot = roofTopY + postH, signTop = signBot + bbH;
      const depth = t * 3;
      const fZ = bbZ - depth / 2, bkZ = bbZ + depth / 2;
      const spread = bbW * 0.28;
      const baseL = sL - spread, baseR = sR + spread;

      // Sign panel (ghost face)
      const signMesh = new THREE.Mesh(
        new THREE.BoxGeometry(bbW, bbH, t * 1.5),
        new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.55, transparent: true, opacity: 0.18 })
      );
      signMesh.position.set(bbX, signBot + bbH / 2, fZ);
      group.add(signMesh);

      // Sign face grid — perimeter + 3 horizontal rails + 2 verticals + alternating diagonals
      beam(sL, signTop, fZ, sR, signTop, fZ, mR);
      beam(sL, signBot, fZ, sR, signBot, fZ, mR);
      beam(sL, signBot, fZ, sL, signTop, fZ, mR);
      beam(sR, signBot, fZ, sR, signTop, fZ, mR);
      const hRows = 3, vCols = 2;
      for (let i = 1; i <= hRows; i++) beam(sL, signBot + bbH * i / (hRows + 1), fZ, sR, signBot + bbH * i / (hRows + 1), fZ, bR);
      for (let i = 1; i <= vCols; i++) beam(sL + bbW * i / (vCols + 1), signBot, fZ, sL + bbW * i / (vCols + 1), signTop, fZ, bR);
      const panW = bbW / (vCols + 1), panH = bbH / (hRows + 1);
      for (let col = 0; col <= vCols; col++) for (let row = 0; row <= hRows; row++) {
        const px1 = sL + col * panW, px2 = px1 + panW;
        const py1 = signBot + row * panH, py2 = py1 + panH;
        if ((col + row) % 2 === 0) beam(px1, py1, fZ, px2, py2, fZ, bR * 0.7);
        else                        beam(px2, py1, fZ, px1, py2, fZ, bR * 0.7);
      }

      // Back face perimeter + front-to-back ties at corners
      beam(sL, signTop, bkZ, sR, signTop, bkZ, mR);
      beam(sL, signBot, bkZ, sR, signBot, bkZ, mR);
      beam(sL, signBot, bkZ, sL, signTop, bkZ, mR);
      beam(sR, signBot, bkZ, sR, signTop, bkZ, mR);
      for (const [sx, sy] of [[sL,signTop],[sR,signTop],[sL,signBot],[sR,signBot]])
        beam(sx, sy, fZ, sx, sy, bkZ, bR);

      // Support A-frame: outer splayed legs + inner verticals + rails + X-bracing
      beam(sL, signBot, fZ, baseL, roofTopY, fZ, mR);
      beam(sR, signBot, fZ, baseR, roofTopY, fZ, mR);
      const iL = bbX - bbW * 0.1, iR = bbX + bbW * 0.1;
      beam(iL, signBot, fZ, iL, roofTopY, fZ, mR);
      beam(iR, signBot, fZ, iR, roofTopY, fZ, mR);
      beam(baseL, roofTopY, fZ, baseR, roofTopY, fZ, mR);
      for (let i = 1; i <= 2; i++) {
        const ry = roofTopY + postH * i / 3;
        const frac = 1 - i / 3;
        beam(baseL + (sL - baseL) * frac, ry, fZ, baseR + (sR - baseR) * frac, ry, fZ, bR);
      }
      const m1Y = roofTopY + postH / 3, m2Y = roofTopY + postH * 2 / 3;
      const m2L = baseL + (sL - baseL) * (1/3), m2R = baseR + (sR - baseR) * (1/3);
      beam(baseL, roofTopY, fZ, m2L, m2Y, fZ, bR);
      beam(baseL, roofTopY, fZ, iL,  m2Y, fZ, bR * 0.8);
      beam(baseR, roofTopY, fZ, m2R, m2Y, fZ, bR);
      beam(baseR, roofTopY, fZ, iR,  m2Y, fZ, bR * 0.8);

      // Back face support + front-to-back ties
      beam(sL, signBot, bkZ, baseL, roofTopY, bkZ, mR);
      beam(sR, signBot, bkZ, baseR, roofTopY, bkZ, mR);
      beam(iL, signBot, bkZ, iL, roofTopY, bkZ, mR);
      beam(iR, signBot, bkZ, iR, roofTopY, bkZ, mR);
      beam(baseL, roofTopY, bkZ, baseR, roofTopY, bkZ, mR);
      for (const dx of [baseL, iL, iR, baseR])
        beam(dx, roofTopY, fZ, dx, roofTopY, bkZ, bR);
    }
  }

  // Optional STL overlay: compare the actual preview_3d.stl triangle mesh
  // against the designed/material preview without replacing the coloured
  // model. The preview STL is a simplified laser-cut assembly/massing STL,
  // so it should be a translucent reference layer, not the main view.
  if (includeStlOverlay) {
    try {
      const stlOverlay = buildGeneratedStlPreviewGroup(cfg);
      stlOverlay.name = 'Generated STL Overlay';
      group.add(stlOverlay);
    } catch (e) {
      logger.warn('Generated STL overlay failed:', e);
    }
  }

  applyLayoutCutClippingToGroup(group, cfg);
  addLayoutCutGuidePreview3D(group, cfg, h + t + 0.45);

  return group;
}

function addLayoutCutGuidePreview3D(group, cfg, topY) {
  const cuts = collectPreviewLayoutCuts(cfg);
  if (!group || !cuts.length || typeof THREE === 'undefined') return null;
  const w = Number(cfg.width || 0) || 0;
  const d = Number(cfg.depth || 0) || 0;
  if (!(w > 0) || !(d > 0)) return null;
  const verts = [];
  const ribbonVerts = [];
  const yTop = Number.isFinite(Number(topY)) ? Number(topY) : 2;
  const yBase = 0.18;
  const toWorld = p => ({ x: Number(p.x || 0) - w / 2, z: Number(p.y || 0) - d / 2 });
  const guide = new THREE.Group();
  guide.name = 'Layout cut guide';
  guide.renderOrder = 50;
  guide.userData.layoutCutGuide = true;
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xd95f24,
    emissive: 0x5a1f0f,
    emissiveIntensity: 0.35,
    roughness: 0.65,
    depthTest: false,
    depthWrite: false,
  });
  const addTube = (p0, p1, y, radius = 0.55) => {
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    if (len <= 0.001) return;
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mesh = new THREE.Mesh(geo, tubeMat);
    mesh.position.set((p0.x + p1.x) / 2, y, (p0.z + p1.z) / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, 0, dz / len));
    mesh.renderOrder = 51;
    mesh.userData.layoutCutGuide = true;
    guide.add(mesh);
  };
  for (const cut of cuts) {
    for (const [a, b] of sampleLayoutCutSegments(cut, cfg)) {
      const p0 = toWorld(a), p1 = toWorld(b);
      verts.push(p0.x, yTop, p0.z, p1.x, yTop, p1.z);
      verts.push(p0.x, yBase, p0.z, p1.x, yBase, p1.z);
      ribbonVerts.push(
        p0.x, yBase, p0.z, p1.x, yBase, p1.z, p1.x, yTop, p1.z,
        p0.x, yBase, p0.z, p1.x, yTop, p1.z, p0.x, yTop, p0.z
      );
      addTube(p0, p1, yTop);
      addTube(p0, p1, yBase, 0.38);
    }
  }
  if (!verts.length) return null;
  if (ribbonVerts.length) {
    const ribbonGeo = new THREE.BufferGeometry();
    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
    ribbonGeo.computeVertexNormals();
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xd95f24,
      emissive: 0x5a1f0f,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.name = 'Layout cut ribbon';
    ribbon.renderOrder = 49;
    ribbon.userData.layoutCutGuide = true;
    guide.add(ribbon);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xd95f24,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false,
  });
  mat.clippingPlanes = null;
  const lines = new THREE.LineSegments(geo, mat);
  lines.renderOrder = 52;
  lines.userData.layoutCutGuide = true;
  guide.add(lines);
  group.add(guide);
  return guide;
}

export function applyLayoutCutClippingToGroup(group, cfg, transformMatrix = null) {
  if (!group || !cfg || typeof THREE === 'undefined') return [];
  const w = Number(cfg.width || 0) || 0;
  const d = Number(cfg.depth || 0) || 0;
  const planes = [];
  const cuts = collectPreviewLayoutCuts(cfg);
  if (cuts.length && w > 0 && d > 0) {
    for (const cut of cuts) {
      for (const [a, b] of sampleLayoutCutSegments(cut, cfg)) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.hypot(dx, dy) < 0.001) continue;
        const sideOffset = dx * (d / 2 - a.y) - dy * (w / 2 - a.x);
        const keepRight = cut.keepSide === 'right';
        // WebGL's local clipping path keeps the positive side of the plane.
        // The floor-plan/export cropper uses the signed 2D line side, where
        // positive means left. Keep that convention after mapping Y to Z so
        // the 3D massing stays on the same side as the Shape Editor, SVG, and
        // printed reference plan.
        const normal = keepRight
          ? new THREE.Vector3(dy, 0, -dx)
          : new THREE.Vector3(-dy, 0, dx);
        const constant = keepRight ? -sideOffset : sideOffset;
        const len = normal.length();
        if (len <= 0.000001) continue;
        normal.multiplyScalar(1 / len);
        const plane = new THREE.Plane(normal, constant / len);
        if (transformMatrix) plane.applyMatrix4(transformMatrix);
        planes.push(plane);
      }
    }
  }
  group.traverse?.(child => {
    if (child.userData && child.userData.layoutCutGuide) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.filter(Boolean).forEach(mat => {
      mat.clippingPlanes = planes.length ? planes : null;
      mat.clipIntersection = false;
      mat.needsUpdate = true;
    });
  });
  group.userData.layoutCutClippingPlaneCount = planes.length;
  return planes;
}

if (typeof window !== 'undefined') {
  document.documentElement.dataset.hakomachiPreview3d = 'ready';
}

export function updateThreePreview(cfg) {
  cfg = getThreePreviewConfig(cfg);
  if (!cfg) return null;
  setThreePreviewConfig(cfg);
  upgradeConfigToCurrentStorage(cfg);
  if (!threeScene) initThreePreview();
  if (!threeScene) return null;

  if (buildingMesh) {
    threeScene.remove(buildingMesh);
    buildingMesh = null;
  }

  const note = document.getElementById('threePreviewModeNote');
  if (note) {
    note.textContent = threePreviewUseStlGeometry
      ? 'Designed/material preview with translucent generated-STL overlay.'
      : 'Designed/material preview. Enable overlay to compare preview_3d.stl geometry.';
  }
  if (threePreviewGrid) threePreviewGrid.visible = !previewLayoutCutsActive(cfg);

  const group = buildHakoMachiBuildingPreviewGroup(cfg, {
    includeStlOverlay: threePreviewUseStlGeometry
  });

  // Add the assembled building to the scene
  threeScene.add(group);
  buildingMesh = group;
  publishThreePreviewGlobals();
  frameThreePreviewObject(group);
  requestThreePreviewRender(2);
  return group;
}  // end updateThreePreview

export function animateThree() {
  // Pause rendering while the opening editor is visible — the modal covers the
  // 3D canvas and OrbitControls/WebGL event listeners can throw "Script error."
  // (cross-origin CDN) while items are being placed.
  if (globalThis.oeEditorOpen === true) {
    threePreviewLoopActive = false;
    return;
  }

  if (!threePreviewRenderRequested && threePreviewDampingFrames <= 0) {
    threePreviewLoopActive = false;
    return;
  }

  threePreviewRenderRequested = false;

  if (threeControls) {
    try {
      if (threeControls.update && threeControls.update()) {
        threePreviewDampingFrames = Math.max(threePreviewDampingFrames, 2);
      }
    } catch(e) { /* ignore */ }
  }

  if (threeRenderer && threeScene && threeCamera) {
    try {
      threeRenderer.render(threeScene, threeCamera);
    } catch(e) {
      logger.warn('Three.js render error - rebuilding preview:', e);
      try { updateThreePreview(getThreePreviewConfig()); } catch(e2) { /* skip silently */ }
    }
  }

  if (threePreviewDampingFrames > 0) threePreviewDampingFrames--;
  if (threePreviewRenderRequested || threePreviewDampingFrames > 0) {
    requestAnimationFrame(animateThree);
  } else {
    threePreviewLoopActive = false;
  }
}

export function installThreePreviewLegacyBehavior({
  root = globalThis,
  config = root.CONFIG,
  delayMs = 100,
  suppressCrossOriginScriptErrors = true,
} = {}) {
  if (threePreviewLegacyInstalled) return false;

  const win = root.window || root;
  const doc = root.document;
  if (!win || !doc) return false;

  setThreePreviewConfig(config || root.CONFIG || null);
  threePreviewLegacyInstalled = true;

  threePreviewResizeHandler = () => {
    const container = doc.getElementById('threePreview');
    if (!container || !threeRenderer || !threeCamera) return;

    threeCamera.aspect = container.clientWidth / container.clientHeight;
    threeCamera.updateProjectionMatrix();

    threeRenderer.setSize(container.clientWidth, container.clientHeight);
    requestThreePreviewRender(2);
  };

  if (typeof win.addEventListener === 'function') {
    win.addEventListener('resize', threePreviewResizeHandler);
  }

  if (typeof root.regenerate === 'function') {
    threePreviewLegacyRegenerate = root.regenerate;
    root.regenerate = function(...args) {
      const result = threePreviewLegacyRegenerate.apply(this, args);
      try {
        updateThreePreview(getThreePreviewConfig());
      } catch(e) {
        logger.error('3D preview error:', e);
      }
      return result;
    };
  }

  const schedule = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
  threePreviewInitTimer = schedule(() => {
    try {
      const stlToggle = doc.getElementById('threePreviewUseStl');
      if (stlToggle) {
        const storage = root.localStorage || win.localStorage;
        const savedMode = storage && storage.getItem
          ? storage.getItem('hakomachi_three_preview_stl')
          : null;
        if (savedMode != null) stlToggle.checked = savedMode === '1';
        threePreviewUseStlGeometry = !!stlToggle.checked;
        publishThreePreviewGlobals(root);
        stlToggle.addEventListener('change', () => {
          threePreviewUseStlGeometry = !!stlToggle.checked;
          publishThreePreviewGlobals(root);
          try {
            const nextStorage = root.localStorage || win.localStorage;
            if (nextStorage && nextStorage.setItem) {
              nextStorage.setItem('hakomachi_three_preview_stl', threePreviewUseStlGeometry ? '1' : '0');
            }
          } catch (_) {}
          updateThreePreview(getThreePreviewConfig());
        });
      }
    } catch (_) {}
    try { initThreePreview(); } catch(e) { logger.error('initThreePreview threw:', e); return; }
    try { updateThreePreview(getThreePreviewConfig()); } catch(e) { logger.error('3D init error:', e); }
  }, delayMs);

  if (suppressCrossOriginScriptErrors) {
    // window.onerror returning true is the only reliable way to suppress
    // cross-origin "Script error." from CDN scripts in Chrome/Firefox.
    win.onerror = function(msg, src, line, col, err) {
      if (msg === 'Script error.' || (!src && line === 0)) return true;
      return false;
    };
  }

  return true;
}

publishThreePreviewGlobals();
