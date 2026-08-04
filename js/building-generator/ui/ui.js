/* =====================================================================
   UI
   ===================================================================== */

/* Initialize dropdowns */
export function initDropdowns() {
  const buildingSel = document.getElementById('buildingType');
  for (const [k, v] of Object.entries(BUILDING_TYPES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    buildingSel.appendChild(opt);
  }
  const claddingSel = document.getElementById('claddingStyle');
  for (const [k, v] of Object.entries(CLADDING_STYLES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    claddingSel.appendChild(opt);
  }
  // Same options for ground-floor cladding override
  const groundCladSel = document.getElementById('firstFloorCladdingStyle');
  for (const [k, v] of Object.entries(CLADDING_STYLES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    groundCladSel.appendChild(opt);
  }
  // Roof cladding — same list as wall cladding so the user can mix and
  // match any style (kawara roof on yakisugi walls, ribbed metal on a
  // brick warehouse, etc.). All styles are offered; the user picks what
  // makes architectural sense.
  const roofCladSel = document.getElementById('roofCladdingStyle');
  if (roofCladSel) {
    for (const [k, v] of Object.entries(CLADDING_STYLES)) {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = v.label;
      roofCladSel.appendChild(opt);
    }
  }
  // Interior cladding style picker — same option list as exterior so any
  // style can be paired with any other (an inside-out building of all
  // styles). The placeholder "— same as exterior —" option (value="")
  // is pre-baked in HTML; we just append the named styles after it.
  const intCladSel = document.getElementById('interiorCladdingStyle');
  if (intCladSel) {
    for (const [k, v] of Object.entries(CLADDING_STYLES)) {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = v.label;
      intCladSel.appendChild(opt);
    }
  }
  const windowSel = document.getElementById('windowStyle');
  for (const [k, v] of Object.entries(WINDOW_STYLES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    windowSel.appendChild(opt);
  }
  // Same options for ground-floor window style override
  const groundWinSel = document.getElementById('firstFloorWindowStyle');
  for (const [k, v] of Object.entries(WINDOW_STYLES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    groundWinSel.appendChild(opt);
  }
  const doorSel = document.getElementById('doorStyle');
  for (const [k, v] of Object.entries(DOOR_STYLES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    doorSel.appendChild(opt);
  }
  // Rooftop equipment is now placed via the Floor Editor's roof view rather
  // than count inputs in the left panel. The container `rooftopEquipFields`
  // no longer exists; skip building per-type rows if it isn't present so the
  // older code path stays inert for older HTML.
  const equipContainer = document.getElementById('rooftopEquipFields');
  if (equipContainer) {
    for (const [k, v] of Object.entries(ROOFTOP_EQUIPMENT)) {
      const div = document.createElement('div');
      div.className = 'field';
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      const span = document.createElement('span');
      span.style.flex = '1';
      span.textContent = v.label + ' (' + v.w + '×' + v.d + '×' + v.h + 'mm)';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.id = 'rooftopEq_' + k;
      inp.min = '0'; inp.max = '20'; inp.step = '1'; inp.value = '0';
      inp.style.width = '60px';
      label.appendChild(span);
      label.appendChild(inp);
      div.appendChild(label);
      const desc = document.createElement('div');
      desc.className = 'small';
      desc.textContent = v.description;
      div.appendChild(desc);
      equipContainer.appendChild(div);
    }
  }
}

export function roofStyleHasParapet(roofStyle) {
  return roofStyle === 'parapet' || roofStyle === 'parapet_gable';
}

export function effectiveParapetHeightFromConfig(cfg) {
  if (!cfg) return 0;
  const roofStyle = cfg.roofStyle || 'flat';
  return roofStyleHasParapet(roofStyle) ? Math.max(0, Number(cfg.parapetHeight) || 0) : 0;
}

export function roofParapetHeightFromFormOrConfig() {
  const roofStyle = val('roofStyle') || (CONFIG && CONFIG.roofStyle) || 'flat';
  if (!roofStyleHasParapet(roofStyle)) return 0;
  const p = num('parapetHeight');
  if (Number.isFinite(p) && p > 0) return p;
  return Number((CONFIG && CONFIG.parapetHeight) || 0) || 0;
}

export function configHeightIncludesParapet(cfg) {
  return !!(cfg && cfg.heightIncludesParapet);
}

export function wallBodyHeightFromConfig(cfg) {
  if (!cfg) return 1;
  const total = Math.max(1, Number(cfg.height) || 1);
  const p = effectiveParapetHeightFromConfig(cfg);
  return Math.max(1, total - p);
}

export function migrateHeightToIncludeParapet(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  if (cfg.heightIncludesParapet === true) return cfg;
  const p = effectiveParapetHeightFromConfig(cfg);
  cfg.height = Math.max(1, Number(cfg.height) || 1) + p;
  cfg.heightIncludesParapet = true;
  return cfg;
}

export function groundFloorHeightFromFormOrConfig(stdFloorH) {
  const enabled = !!document.getElementById('firstFloorHeightEnabled')?.checked;
  if (!enabled) return Number(stdFloorH) || 0;
  const gf = num('firstFloorHeight');
  if (Number.isFinite(gf) && gf > 0) return gf;
  return Number((CONFIG && CONFIG.firstFloorHeight) || stdFloorH || 0) || 0;
}

export function derivedFloorHeightFromAbsolute(totalHeightInclParapet, floors, parapetH, groundHOverrideOrNull) {
  const n = Math.max(1, Math.round(Number(floors) || 1));
  const bodyH = Math.max(1, (Number(totalHeightInclParapet) || 0) - (Number(parapetH) || 0));
  if (groundHOverrideOrNull != null && n > 1) {
    return Math.max(1, (bodyH - Number(groundHOverrideOrNull)) / (n - 1));
  }
  return Math.max(1, bodyH / n);
}

export function totalHeightFromFloors(floors, floorH, parapetH, groundHOverrideOrNull) {
  const n = Math.max(1, Math.round(Number(floors) || 1));
  const upperH = Math.max(1, Number(floorH) || 1);
  const groundH = (groundHOverrideOrNull != null) ? Math.max(1, Number(groundHOverrideOrNull) || upperH) : upperH;
  const bodyH = n <= 1 ? groundH : groundH + upperH * (n - 1);
  return bodyH + Math.max(0, Number(parapetH) || 0);
}

export function syncHeightFloorModeFields({ writeComputed = true } = {}) {
  const mode = val('heightMode') || 'absolute';
  const heightEl = document.getElementById('height');
  const floorsEl = document.getElementById('floors');
  const floorHEl = document.getElementById('floorHeight');
  const heightHelp = document.getElementById('heightModeHelp');
  const floorHelp = document.getElementById('floorHeightModeHelp');
  if (!heightEl || !floorsEl || !floorHEl) return;

  const floors = Math.max(1, Math.round(parseFloat(floorsEl.value) || CONFIG.floorCount || 1));
  floorsEl.value = String(floors);
  const parapetH = roofParapetHeightFromFormOrConfig();
  const floorHCurrent = Math.max(1, parseFloat(floorHEl.value) || CONFIG.floorHeight || 30);
  const gfOverride = document.getElementById('firstFloorHeightEnabled')?.checked
    ? groundFloorHeightFromFormOrConfig(floorHCurrent)
    : null;

  if (mode === 'absolute') {
    heightEl.readOnly = false;
    heightEl.disabled = false;
    floorHEl.readOnly = true;
    floorHEl.disabled = false;
    const total = Math.max(1, parseFloat(heightEl.value) || CONFIG.height || 50);
    if (writeComputed) floorHEl.value = derivedFloorHeightFromAbsolute(total, floors, parapetH, gfOverride).toFixed(2);
    if (heightHelp) heightHelp.textContent = 'Edit total building height. This includes the parapet where present.';
    if (floorHelp) {
      floorHelp.textContent = gfOverride != null
        ? 'Read-only: (height − parapet − ground floor) ÷ upper-floor count.'
        : 'Read-only: (height − parapet) ÷ floor count.';
    }
  } else {
    heightEl.readOnly = true;
    heightEl.disabled = false;
    floorHEl.readOnly = false;
    floorHEl.disabled = false;
    const total = totalHeightFromFloors(floors, floorHCurrent, parapetH, gfOverride);
    if (writeComputed) heightEl.value = total.toFixed(2);
    if (heightHelp) {
      heightHelp.textContent = gfOverride != null
        ? 'Read-only: ground floor + upper floor height × (floors − 1) + parapet.'
        : 'Read-only: floor height × floors + parapet.';
    }
    if (floorHelp) floorHelp.textContent = 'Edit the repeated upper-floor height.';
  }

  heightEl.classList.toggle('readonly-derived', heightEl.readOnly);
  floorHEl.classList.toggle('readonly-derived', floorHEl.readOnly);
}

function defaultTrussSettings(seed = {}) {
  return {
    enabled: false,
    spacing: 30,
    axis: null,
    chordW: 2,
    xBraceEnabled: false,
    xBraceW: 1,
    xBraceWalls: [],
    supports: false,
    supportColumnType: 'i',
    supportDepth: 4,
    supportFlangeW: 4,
    ...seed,
  };
}

function readTrussFormSettings() {
  const current = defaultTrussSettings(CONFIG.trusses || {});
  const axis = val('trussAxis') || null;
  return defaultTrussSettings({
    ...current,
    enabled: !!document.getElementById('trussesEnabled')?.checked,
    spacing: Math.max(5, num('trussSpacing') || current.spacing || 30),
    axis: (axis === 'ns' || axis === 'ew') ? axis : null,
    chordW: Math.max(0.5, num('trussChordW') || current.chordW || 2),
    xBraceEnabled: !!document.getElementById('trussXBraceEnabled')?.checked,
    xBraceW: Math.max(0.3, num('trussXBraceW') || current.xBraceW || 1),
    xBraceWalls: [],
    supports: !!document.getElementById('trussSupportsEnabled')?.checked,
    supportColumnType: val('trussSupportColumnType') === 't' ? 't' : 'i',
    supportDepth: Math.max(1, num('trussSupportDepth') || current.supportDepth || 4),
    supportFlangeW: Math.max(2, num('trussSupportFlangeW') || current.supportFlangeW || 4),
  });
}

function writeTrussFormSettings() {
  const t = defaultTrussSettings(CONFIG.trusses || {});
  const enabledEl = document.getElementById('trussesEnabled');
  if (!enabledEl) return;
  enabledEl.checked = !!t.enabled;
  set('trussSpacing', t.spacing ?? 30);
  set('trussAxis', t.axis || '');
  set('trussChordW', t.chordW ?? 2);
  const xbEl = document.getElementById('trussXBraceEnabled');
  if (xbEl) xbEl.checked = !!(t.xBraceEnabled || (Array.isArray(t.xBraceWalls) && t.xBraceWalls.length > 0));
  set('trussXBraceW', t.xBraceW ?? 1);
  const supportEl = document.getElementById('trussSupportsEnabled');
  if (supportEl) supportEl.checked = !!t.supports;
  set('trussSupportColumnType', t.supportColumnType === 't' ? 't' : 'i');
  set('trussSupportDepth', t.supportDepth ?? 4);
  set('trussSupportFlangeW', t.supportFlangeW ?? 4);
}

/* Read the form into CONFIG */
export function readForm() {
  CONFIG.buildingType = val('buildingType');
  CONFIG.width = num('width');
  CONFIG.depth = num('depth');
  CONFIG.heightMode = val('heightMode') || 'absolute';
  CONFIG.roofStyle = val('roofStyle');
  CONFIG.parapetHeight = num('parapetHeight');

  // Height mode is now a true either/or:
  // - absolute: user edits total building height incl. parapet; floorHeight is derived.
  // - floors: user edits floor count + upper floor height; total height is derived.
  // Internally CONFIG.height remains the wall/body height EXCLUDING parapet, because
  // the generator still models parapet as plan.parapetH above the wall core.
  const parapetForHeight = roofParapetHeightFromFormOrConfig();
  const floorsForHeight = Math.max(1, Math.round(num('floors') || CONFIG.floorCount || 1));
  const rawFloorHeight = Math.max(1, num('floorHeight') || CONFIG.floorHeight || 30);
  const gfOverrideForHeight = !!document.getElementById('firstFloorHeightEnabled')?.checked
    ? groundFloorHeightFromFormOrConfig(rawFloorHeight)
    : null;

  CONFIG.floorCount = floorsForHeight;
  if (CONFIG.heightMode === 'absolute') {
    const totalHeight = Math.max(1, num('height') || CONFIG.height || 50);
    CONFIG.floorHeight = derivedFloorHeightFromAbsolute(totalHeight, floorsForHeight, parapetForHeight, gfOverrideForHeight);
    CONFIG.height = totalHeight;
  } else {
    CONFIG.floorHeight = rawFloorHeight;
    const totalHeight = totalHeightFromFloors(floorsForHeight, CONFIG.floorHeight, parapetForHeight, gfOverrideForHeight);
    CONFIG.height = totalHeight;
  }
  CONFIG.heightIncludesParapet = true;
  CONFIG.parapetInnerCladding = !!document.getElementById('parapetInnerCladding')?.checked;
  CONFIG.parapetSides = val('parapetSides') || 'all';
  CONFIG.roofPitch = num('roofPitch');
  CONFIG.roofRidgeDirection = val('roofRidgeDirection') || 'ew';
  CONFIG.roofSlopeDirection = val('roofSlopeDirection') || 'back';
  CONFIG.roofOverhangFB = num('roofOverhangFB') || 0;
  CONFIG.roofOverhangEW = num('roofOverhangEW') || 0;
  CONFIG.roofOverhang = num('roofOverhangAll') || 5;
  CONFIG.trusses = readTrussFormSettings();
  CONFIG.claddingStyle = val('claddingStyle');
  CONFIG.roofCladdingStyle = val('roofCladdingStyle') || CONFIG.claddingStyle;
  CONFIG.claddingExtendsToFloorBottom = !!document.getElementById('claddingExtendsToFloorBottom')?.checked;
  CONFIG.interiorCladding = !!document.getElementById('interiorCladding')?.checked;
  // Empty-string option = "same as exterior" → store null so the
  // generator's fall-back to claddingStyle kicks in.
  const _intStyleVal = val('interiorCladdingStyle');
  CONFIG.interiorCladdingStyle = _intStyleVal ? _intStyleVal : null;
  CONFIG.windowStyle = val('windowStyle');
  CONFIG.windowScale = val('windowScale');
  CONFIG.windowDensity = val('windowDensity');
  // Ground-floor window override
  CONFIG.firstFloorWindowStyleEnabled = !!document.getElementById('firstFloorWindowStyleEnabled').checked;
  CONFIG.firstFloorWindowStyle = val('firstFloorWindowStyle');
  CONFIG.firstFloorWindowScale = val('firstFloorWindowScale');
  // Ground-floor height override
  CONFIG.firstFloorHeightEnabled = !!document.getElementById('firstFloorHeightEnabled').checked;
  CONFIG.firstFloorHeight = num('firstFloorHeight');
  // Ground-floor cladding override
  CONFIG.firstFloorCladdingStyleEnabled = !!document.getElementById('firstFloorCladdingStyleEnabled').checked;
  CONFIG.firstFloorCladdingStyle = val('firstFloorCladdingStyle');
  // Ground-floor depth offset (front extension or recess)
  CONFIG.groundFloorOffsetEnabled = !!document.getElementById('groundFloorOffsetEnabled').checked;
  CONFIG.groundFloorOffsetAmount = num('groundFloorOffsetAmount');
  CONFIG.doorStyle = val('doorStyle');
  CONFIG.frontDoorCount = num('frontDoorCount');
  CONFIG.backDoorCount = num('backDoorCount');
  CONFIG.sideDoorCount = num('sideDoorCount');
  // Trim
  CONFIG.trimTop = !!document.getElementById('trimTop').checked;
  CONFIG.trimBottom = !!document.getElementById('trimBottom').checked;
  CONFIG.trimBelt = !!document.getElementById('trimBelt').checked;
  CONFIG.trimHeight = num('trimHeight');
  CONFIG.trimOverhang = num('trimOverhang');
  CONFIG.cornerTrim = !!document.getElementById('cornerTrim')?.checked;
  CONFIG.parapetCap = !!document.getElementById('parapetCap')?.checked;
  CONFIG.soffitCladding = !!document.getElementById('soffitCladding')?.checked;
  CONFIG.roofFasciaTrim = !!document.getElementById('roofFasciaTrim')?.checked;
  // Inter-floor panels
  CONFIG.floorPanels = !!document.getElementById('floorPanels').checked;
  CONFIG.lastWallSide = val('lastWallSide');
  CONFIG.floorOutlineOpening = !!document.getElementById('floorOutlineOpening')?.checked;
  CONFIG.floorOutlineBorderMm = Math.max(3, Math.min(50, num('floorOutlineBorderMm') || 8));
  CONFIG.floorOutlineOpeningOnInterFloors = !!document.getElementById('floorOutlineOpeningOnInterFloors')?.checked;
  // Rooftop mech room
  CONFIG.rooftopMechRoom = !!document.getElementById('rooftopMechRoom').checked;
  CONFIG.rooftopMechRoomWidth = num('rooftopMechRoomWidth');
  CONFIG.rooftopMechRoomDepth = num('rooftopMechRoomDepth');
  CONFIG.rooftopMechRoomHeight = num('rooftopMechRoomHeight');
  CONFIG.rooftopMechRoomXOffset = num('rooftopMechRoomXOffset');
  CONFIG.rooftopMechRoomYOffset = num('rooftopMechRoomYOffset');
  // Rooftop equipment counts. The count UI was removed (placement is now done
  // via the Floor Editor's roof view), but we still honour preset-provided
  // counts as a legacy fallback at build time — and the migration step in
  // iwSetFloor moves those counts into CONFIG.rooftopItems the first time
  // the user opens the roof tab. So: only update the count from the DOM if
  // the input field still exists; otherwise leave whatever's already in
  // CONFIG untouched.
  CONFIG.rooftopEquipment = CONFIG.rooftopEquipment || {};
  for (const k of Object.keys(ROOFTOP_EQUIPMENT)) {
    const el = document.getElementById('rooftopEq_' + k);
    if (el) {
      CONFIG.rooftopEquipment[k] = Math.max(0, parseInt(el.value) || 0);
    } else if (CONFIG.rooftopEquipment[k] == null) {
      CONFIG.rooftopEquipment[k] = 0;
    }
  }
  // Rooftop shield wall (always X-braced + louvered cladding now)
  CONFIG.rooftopShield = CONFIG.rooftopShield || {};
  CONFIG.rooftopShield.enabled = !!document.getElementById('rooftopShieldEnabled')?.checked;
  CONFIG.rooftopShield.style  = 'braced';
  CONFIG.rooftopShield.height = num('rooftopShieldHeight') || 8;
  CONFIG.rooftopShield.offset = num('rooftopShieldOffset') || 3;
  CONFIG.rooftopShield.braceThickness = num('rooftopShieldBraceThickness') || 0.7;
  CONFIG.coreThickness     = (CONFIG.materials.find(m=>m.id==='core')    ?.thickness) || 1.5;
  CONFIG.claddingThickness = (CONFIG.materials.find(m=>m.id==='cladding')?.thickness) || 0.28;
  CONFIG.tongueWidth = num('tongueWidth');
  CONFIG.kerfComp = num('kerfComp');
  const sfTrimEl = document.getElementById('surfaceFeatureTrimOffset');
  if (sfTrimEl) {
    const sfTrim = parseFloat(sfTrimEl.value);
    CONFIG.surfaceFeatureTrimOffset = isFinite(sfTrim) ? Math.max(0, Math.min(5, sfTrim)) : 0.75;
  } else if (CONFIG.surfaceFeatureTrimOffset == null) {
    CONFIG.surfaceFeatureTrimOffset = 0.75;
  }
  const ssEnabledEl = document.getElementById('sheetSplitEnabled');
  if (ssEnabledEl) CONFIG.sheetSplitEnabled = !!ssEnabledEl.checked;
  const ssMinEl = document.getElementById('sheetSplitMinSegmentMm');
  if (ssMinEl) {
    const v = parseFloat(ssMinEl.value);
    CONFIG.sheetSplitMinSegmentMm = isFinite(v) ? Math.max(10, Math.min(150, v)) : 40;
  }
  const ssSpliceEl = document.getElementById('sheetSplitSpliceWidthMm');
  if (ssSpliceEl) {
    const v = parseFloat(ssSpliceEl.value);
    CONFIG.sheetSplitSpliceWidthMm = isFinite(v) ? Math.max(6, Math.min(40, v)) : 16;
  }

  // Drop any manually-placed openings / awnings / balconies / fixtures /
  // cladding overrides / printed items that no longer fit on their wall.
  // Triggered by anything that shrinks the wall (most commonly: reducing
  // floor count, or shortening floor height). Without this, a bay that
  // was at y=96 on a 120 mm wall sticks around when the wall drops to
  // 60 mm — the item still exists in CONFIG, the wall editor renders
  // it below the visible canvas, and the user sees nothing where their
  // bay used to be. Removing rather than clamping matches what the user
  // expects: "if I delete the floor, delete the things on it too."
  pruneOpeningsBeyondWall(CONFIG);
}

/* Remove any per-face manually-placed item whose top edge sits at or
 * below the new wall bottom. Operates in-place on each manual* array so
 * downstream code (regenerate, openOpeningEditor, the IW editor) all
 * see the cleaned-up data. Items whose body extends slightly past the
 * wall bottom but whose top is still inside are KEPT — the wall outline
 * clips them visually and the user can adjust them; only fully-orphaned
 * items get culled. wallH is CONFIG.height, the base wall height
 * (excluding any gable peak above), which is the same threshold the
 * opening editor uses to size its canvas.
 */
export function pruneOpeningsBeyondWall(cfg) {
  const wallH = cfg.height;
  if (!wallH || wallH <= 0) return;

  // Prune through the unified wall feature model, then sync back to legacy
  // buckets. This keeps all feature families (openings, awnings, fixtures,
  // printed items, etc.) consistent instead of pruning six separate stores.
  migrateLegacyWallFeatures(cfg);
  for (const face of ['front', 'back', 'east', 'west']) {
    const feats = wallFeaturesForFace(cfg, face);
    if (!feats.length) continue;
    const kept = feats.filter(item =>
      !item || typeof item.y !== 'number' || item.y < wallH
    );
    if (kept.length !== feats.length) setWallFeaturesForFace(cfg, face, kept);
  }
}

/* Write CONFIG to the form */
export function writeForm() {
  set('buildingType', CONFIG.buildingType);
  set('width', CONFIG.width);
  set('depth', CONFIG.depth);
  set('heightMode', CONFIG.heightMode || 'absolute');
  set('floors', CONFIG.floorCount);
  set('roofStyle', CONFIG.roofStyle);
  set('parapetHeight', CONFIG.parapetHeight);
  set('height', Number(CONFIG.height) || 0);
  set('floorHeight', CONFIG.floorHeight);
  const parapetInnerEl = document.getElementById('parapetInnerCladding');
  if (parapetInnerEl) parapetInnerEl.checked = (CONFIG.parapetInnerCladding !== false);
  set('parapetSides', CONFIG.parapetSides || 'all');
  set('roofPitch', CONFIG.roofPitch);
  set('roofRidgeDirection', CONFIG.roofRidgeDirection || 'ew');
  set('roofSlopeDirection', CONFIG.roofSlopeDirection || 'back');
  set('roofOverhangFB', CONFIG.roofOverhangFB || 0);
  set('roofOverhangEW', CONFIG.roofOverhangEW || 0);
  set('roofOverhangAll', CONFIG.roofOverhang || 5);
  updateOverhangLinkBtn();
  writeTrussFormSettings();
  set('claddingStyle', CONFIG.claddingStyle);
  set('roofCladdingStyle', CONFIG.roofCladdingStyle || CONFIG.claddingStyle);
  const floorBottomCladEl = document.getElementById('claddingExtendsToFloorBottom');
  if (floorBottomCladEl) floorBottomCladEl.checked = !!CONFIG.claddingExtendsToFloorBottom;
  const intCladChk = document.getElementById('interiorCladding');
  if (intCladChk) intCladChk.checked = !!CONFIG.interiorCladding;
  set('interiorCladdingStyle', CONFIG.interiorCladdingStyle || '');
  // Show the style picker only when the feature is on. Hiding it when off
  // keeps the sidebar tidy and signals that the field has no effect.
  const intStyleField = document.getElementById('interiorCladdingStyleField');
  if (intStyleField) intStyleField.style.display = CONFIG.interiorCladding ? '' : 'none';
  set('windowStyle', CONFIG.windowStyle);
  set('windowScale', CONFIG.windowScale);
  set('windowDensity', CONFIG.windowDensity);
  // Ground-floor overrides — all in one block
  document.getElementById('firstFloorHeightEnabled').checked = !!CONFIG.firstFloorHeightEnabled;
  set('firstFloorHeight', CONFIG.firstFloorHeight);
  document.getElementById('firstFloorWindowStyleEnabled').checked = !!CONFIG.firstFloorWindowStyleEnabled;
  set('firstFloorWindowStyle', CONFIG.firstFloorWindowStyle);
  set('firstFloorWindowScale', CONFIG.firstFloorWindowScale);
  document.getElementById('firstFloorCladdingStyleEnabled').checked = !!CONFIG.firstFloorCladdingStyleEnabled;
  set('firstFloorCladdingStyle', CONFIG.firstFloorCladdingStyle);
  document.getElementById('groundFloorOffsetEnabled').checked = !!CONFIG.groundFloorOffsetEnabled;
  set('groundFloorOffsetAmount', CONFIG.groundFloorOffsetAmount);
  syncHeightFloorModeFields({ writeComputed: true });
  set('doorStyle', CONFIG.doorStyle);
  set('frontDoorCount', CONFIG.frontDoorCount);
  set('backDoorCount', CONFIG.backDoorCount);
  set('sideDoorCount', CONFIG.sideDoorCount);
  // Trim
  document.getElementById('trimTop').checked = !!CONFIG.trimTop;
  document.getElementById('trimBottom').checked = !!CONFIG.trimBottom;
  document.getElementById('trimBelt').checked = !!CONFIG.trimBelt;
  set('trimHeight', CONFIG.trimHeight);
  set('trimOverhang', CONFIG.trimOverhang);
  const ctEl = document.getElementById('cornerTrim');
  if (ctEl) ctEl.checked = !!CONFIG.cornerTrim;
  const pcEl = document.getElementById('parapetCap');
  if (pcEl) pcEl.checked = !!CONFIG.parapetCap;
  const scEl = document.getElementById('soffitCladding');
  if (scEl) scEl.checked = !!CONFIG.soffitCladding;
  const rftEl = document.getElementById('roofFasciaTrim');
  if (rftEl) rftEl.checked = !!CONFIG.roofFasciaTrim;
  // Inter-floor panels
  document.getElementById('floorPanels').checked = !!CONFIG.floorPanels;
  set('lastWallSide', CONFIG.lastWallSide);
  const floorOutlineEl = document.getElementById('floorOutlineOpening');
  if (floorOutlineEl) floorOutlineEl.checked = !!CONFIG.floorOutlineOpening;
  set('floorOutlineBorderMm', CONFIG.floorOutlineBorderMm ?? 8);
  const floorOutlineIFEl = document.getElementById('floorOutlineOpeningOnInterFloors');
  if (floorOutlineIFEl) floorOutlineIFEl.checked = !!CONFIG.floorOutlineOpeningOnInterFloors;
  // Rooftop mech room
  document.getElementById('rooftopMechRoom').checked = !!CONFIG.rooftopMechRoom;
  set('rooftopMechRoomWidth', CONFIG.rooftopMechRoomWidth);
  set('rooftopMechRoomDepth', CONFIG.rooftopMechRoomDepth);
  set('rooftopMechRoomHeight', CONFIG.rooftopMechRoomHeight);
  set('rooftopMechRoomXOffset', CONFIG.rooftopMechRoomXOffset);
  set('rooftopMechRoomYOffset', CONFIG.rooftopMechRoomYOffset);
  // Rooftop equipment
  if (CONFIG.rooftopEquipment) {
    for (const k of Object.keys(ROOFTOP_EQUIPMENT)) {
      const el = document.getElementById('rooftopEq_' + k);
      if (el) el.value = CONFIG.rooftopEquipment[k] || 0;
    }
  }
  // Rooftop shield (always X-braced now — no style dropdown)
  const shield = CONFIG.rooftopShield || {};
  const shieldEn = document.getElementById('rooftopShieldEnabled');
  if (shieldEn) shieldEn.checked = !!shield.enabled;
  set('rooftopShieldHeight', shield.height ?? 8);
  set('rooftopShieldOffset', shield.offset ?? 3);
  set('rooftopShieldBraceThickness', shield.braceThickness ?? 0.7);
  set('tongueWidth', CONFIG.tongueWidth);
  set('kerfComp', CONFIG.kerfComp);
  set('surfaceFeatureTrimOffset', CONFIG.surfaceFeatureTrimOffset ?? 0.75);
  const ssEnabledEl = document.getElementById('sheetSplitEnabled');
  if (ssEnabledEl) ssEnabledEl.checked = (CONFIG.sheetSplitEnabled !== false);
  set('sheetSplitMinSegmentMm', CONFIG.sheetSplitMinSegmentMm ?? 40);
  set('sheetSplitSpliceWidthMm', CONFIG.sheetSplitSpliceWidthMm ?? 16);
  updateConditionalFields();
}

/* Toggle visibility of conditional fields based on current FORM values 
   (does NOT overwrite any user input — reads directly from the DOM) */
export function updateConditionalFields() {
  const heightMode = val('heightMode');
  const roofStyle = val('roofStyle');
  const claddingStyle = val('claddingStyle');
  const windowStyle = val('windowStyle');
  const doorStyle = val('doorStyle');

  // Height mode is either/or, but both values remain visible: one is editable
  // and the other is a read-only derived value.
  document.getElementById('heightField').style.display = '';
  document.getElementById('floorsField').style.display = '';
  document.getElementById('floorHeightField').style.display = '';
  syncHeightFloorModeFields({ writeComputed: true });
  // First-floor height field only shown when override checkbox is checked
  const ffhOn = !!document.getElementById('firstFloorHeightEnabled').checked;
  document.getElementById('firstFloorHeightField').style.display = ffhOn ? '' : 'none';
  // First-floor window style fields only when override checkbox is checked
  const ffwOn = !!document.getElementById('firstFloorWindowStyleEnabled').checked;
  document.getElementById('firstFloorWindowStyleField').style.display = ffwOn ? '' : 'none';
  document.getElementById('firstFloorWindowScaleField').style.display = ffwOn ? '' : 'none';
  // Ground-floor cladding field only when override checkbox is checked
  const ffcOn = !!document.getElementById('firstFloorCladdingStyleEnabled').checked;
  document.getElementById('firstFloorCladdingStyleField').style.display = ffcOn ? '' : 'none';
  // Interior cladding style picker only when the feature is enabled.
  const intCladOn = !!document.getElementById('interiorCladding')?.checked;
  const setClassBackedVisibility = (element, visible) => {
    if (!element) return;
    element.classList.toggle('building-generator-hidden-field', !visible);
    element.style.display = visible ? '' : 'none';
  };
  const intCladField = document.getElementById('interiorCladdingStyleField');
  setClassBackedVisibility(intCladField, intCladOn);
  // Ground-floor depth offset field only when checkbox is checked
  const gfoOn = !!document.getElementById('groundFloorOffsetEnabled').checked;
  document.getElementById('groundFloorOffsetField').style.display = gfoOn ? '' : 'none';
  const floorOutlineOn = !!document.getElementById('floorOutlineOpening')?.checked;
  const floorOutlineFields = document.getElementById('floorOutlineOpeningFields');
  if (floorOutlineFields) floorOutlineFields.style.display = floorOutlineOn ? '' : 'none';
  // Rooftop mech room dimensions only when checkbox is checked
  const mrOn = !!document.getElementById('rooftopMechRoom').checked;
  document.getElementById('mechRoomDimsField').style.display = mrOn ? '' : 'none';
  document.getElementById('mechRoomPosField').style.display = mrOn ? '' : 'none';
  document.getElementById('parapetHeightField').style.display = roofStyleHasParapet(roofStyle) ? '' : 'none';
  document.getElementById('parapetInnerCladdingField').style.display = (roofStyle === 'parapet' || roofStyle === 'parapet_gable') ? '' : 'none';
  document.getElementById('parapetCapField').style.display = (roofStyle === 'parapet_gable' || roofStyle === 'gabled') ? '' : 'none';
  // Soffit cladding applies to any roof style that creates an overhang:
  // flat_overhang (all 4 sides overhang) and gabled (eave sides
  // overhang per ohFB/ohEW). For roofs without overhangs (flat,
  // parapet, parapet_gable, slanted) we hide it — generateSoffit
  // would return [] anyway, but hiding keeps the UI tidy.
  setClassBackedVisibility(document.getElementById('soffitCladdingField'), roofStyle === 'flat_overhang' || roofStyle === 'gabled' || roofStyle === 'slanted');
  // Fascia trim: 3 mm trim strips along the roof perimeter. Applies
  // to gabled (chevron + eave cap) and slanted (parallelogram) only;
  // flat_overhang doesn't get this trim feature (its eave edges are
  // covered by the soffit cladding above).
  setClassBackedVisibility(document.getElementById('roofFasciaTrimField'), roofStyle === 'gabled' || roofStyle === 'slanted');
  setClassBackedVisibility(document.getElementById('parapetSidesField'), roofStyle === 'parapet_gable');
  setClassBackedVisibility(document.getElementById('roofPitchField'), roofStyle === 'slanted' || roofStyle === 'gabled' || roofStyle === 'parapet_gable');
  setClassBackedVisibility(document.getElementById('roofOverhangAllField'), roofStyle === 'flat_overhang');
  // Roof cladding style only matters for slanted / gabled roofs — parapet
  // and flat roofs don't emit a cladding panel and reuse the wall texture
  // via 3D wrapping. Mirror the same visibility test the cladding panel
  // generator uses so the UI never offers a setting that has no effect.
  // Roof cladding style is meaningful for every roof type now that parapet
  // and flat roofs etch the chosen pattern onto their `cladding_roof` panel
  // (previously only slanted / gabled emitted a textured panel, so the field
  // was hidden for the others). Always show it.
  document.getElementById('roofCladdingStyleField').style.display = '';
  // Ridge direction is user-pickable for plain gabled and for the
  // 'all-sides' variant of parapet_gable. For the 'fb' / 'ew' variants
  // the ridge is forced perpendicular to the parapeted sides (so the
  // parapets are on the peak-end walls, which is the whole point of
  // those modes), and the dropdown is hidden to keep that constraint
  // unambiguous.
  const showRidge = (roofStyle === 'gabled') ||
                    (roofStyle === 'parapet_gable' &&
                     (document.getElementById('parapetSides')?.value || 'all') === 'all');
  setClassBackedVisibility(document.getElementById('roofRidgeDirectionField'), showRidge);
  setClassBackedVisibility(document.getElementById('roofSlopeDirectionField'), roofStyle === 'slanted');
  setClassBackedVisibility(document.getElementById('roofOverhangField'), roofStyle === 'slanted' || roofStyle === 'gabled');
  const trussesOn = !!document.getElementById('trussesEnabled')?.checked;
  const trussControls = document.getElementById('trussControls');
  setClassBackedVisibility(trussControls, trussesOn);
  const trussXBraceControls = document.getElementById('trussXBraceControls');
  setClassBackedVisibility(trussXBraceControls, trussesOn && !!document.getElementById('trussXBraceEnabled')?.checked);
  const trussSupportControls = document.getElementById('trussSupportControls');
  setClassBackedVisibility(trussSupportControls, trussesOn && !!document.getElementById('trussSupportsEnabled')?.checked);
  // Rooftop shield sub-fields
  const shieldOn = !!document.getElementById('rooftopShieldEnabled')?.checked;
  const shieldFields = document.getElementById('rooftopShieldFields');
  if (shieldFields) shieldFields.style.display = shieldOn ? '' : 'none';
  if (CLADDING_STYLES[claddingStyle]) {
    document.getElementById('claddingDescription').textContent = CLADDING_STYLES[claddingStyle].description;
  }
  const roofCladStyle = CONFIG.roofCladdingStyle || claddingStyle;
  if (CLADDING_STYLES[roofCladStyle]) {
    const desc = document.getElementById('roofCladdingDescription');
    if (desc) desc.textContent = CLADDING_STYLES[roofCladStyle].description;
  }
  if (WINDOW_STYLES[windowStyle]) {
    const ws = WINDOW_STYLES[windowStyle];
    document.getElementById('windowDescription').textContent = 
      ws.description + ' (intrinsic: ' + ws.baseW + '×' + ws.baseH + 'mm)';
  }
  if (DOOR_STYLES[doorStyle]) {
    const ds = DOOR_STYLES[doorStyle];
    document.getElementById('doorDescription').textContent = 
      ds.description + ' (' + ds.width + '×' + ds.height + 'mm)';
  }
}

/* Apply preset defaults from a building type */
export function applyBuildingTypeDefaults() {
  const type = val('buildingType');
  const defaults = BUILDING_TYPES[type].defaults;
  upgradeConfigToCurrentStorage(CONFIG);

  // Bays are part of a preset's identity. Switching presets clears existing
  // bay entries from wallFeatures, then injects the preset's bay definitions
  // directly into the current storage model.
  ensureWallFeatureMap(CONFIG);
  for (const face of ['front', 'back', 'east', 'west']) {
    const arr = wallFeaturesForFace(CONFIG, face);
    const noBays = arr.filter(op => op && op.type !== 'bay');
    CONFIG.wallFeatures[face] = noBays.length > 0 ? noBays : null;
  }

  for (const [k, v] of Object.entries(defaults)) {
    if (k === 'manualOpenings') {
      for (const face of ['front', 'back', 'east', 'west']) {
        const presetArr = (v && v[face]) ? v[face] : null;
        if (!Array.isArray(presetArr) || presetArr.length === 0) continue;
        const copy = JSON.parse(JSON.stringify(presetArr));
        const existing = wallFeaturesForFace(CONFIG, face, { clone: false });
        CONFIG.wallFeatures[face] = Array.isArray(existing) ? existing.concat(copy) : copy;
      }
    } else {
      CONFIG[k] = v;
    }
  }

  stripLegacyWallBuckets(CONFIG);
  CONFIG.heightIncludesParapet = true;
  CONFIG.storageVersion = Math.max(Number(CONFIG.storageVersion) || 0, 2);

  // Also recalc height mode if needed
  if (defaults.height) {
    CONFIG.heightMode = 'absolute';
  }
  writeForm();
  regenerate();
}

export function val(id) { return document.getElementById(id).value; }
export function num(id) { return parseFloat(document.getElementById(id).value) || 0; }
export function set(id, v) { document.getElementById(id).value = v; }

/* ---- Part output rendering (called from regenerate + on material re-assignment) ---- */
export let lastParts = null;

export function effectiveMat(partId, defaultMat) {
  return MaterialRegistry.partMaterial(partId, defaultMat, CONFIG);
}

export function isKnownMat(matId) {
  return MaterialRegistry.has(matId, CONFIG);
}

/* ---- Part deduplication for display ----
   Identical geometry → one card with ×N badge.
   The full parts array (lastParts) is unchanged so export still includes all copies. */
export function partSignature(p) {
  const isSplit = !!(p && p.meta && p.meta.sheetSplit);
  return [
    effectiveMat(p.id, p.material),
    p.bboxW.toFixed(3),
    p.bboxH.toFixed(3),
    JSON.stringify(p.paths),
    JSON.stringify(p.rects  || []),
    JSON.stringify(p.lines  || []),
    // Sheet-split cards often have the same outer boundary but different
    // clipped SVG content inside. Include source/segment identity and the
    // clipped content so front/back or floor panels do not collapse into a
    // misleading "Cut ×2 identical copies" card unless they are truly the
    // same generated split segment.
    isSplit ? (p.meta.dedupeSourceKey || p.meta.sourcePartId || p.id || '') : '',
    isSplit ? (p.meta.sheetSegment || '') : '',
    isSplit ? (p.svgContent || '') : '',
    // mirrorX is a render-time horizontal flip used on slanted-wall pairs
    // (west side wall on NS-axis, back wall on EW-axis) — the laser sheet
    // gets a `scale(-1,1)` wrapper around the part contents. Two parts
    // with the same paths/rects/lines but OPPOSITE mirrorX produce
    // PHYSICALLY MIRRORED cut pieces, so they cannot be deduplicated into
    // "Cut ×2 identical copies" — they're mirrors, not duplicates.
    p.mirrorX ? 'M' : '.',
  ].join('|||');
}

export function deduplicatePartsForDisplay(parts) {
  const sigMap = new Map(); // signature → { part, count, ids[] }
  const order  = [];
  for (const p of parts) {
    const sig = partSignature(p);
    if (sigMap.has(sig)) {
      const e = sigMap.get(sig);
      e.count++;
      e.ids.push(p.id);
    } else {
      sigMap.set(sig, { part: p, count: 1, ids: [p.id] });
      order.push(sig);
    }
  }
  return order.map(sig => sigMap.get(sig));
}

export function renderPartsOutput(parts) {
  lastParts = parts;
  if (!parts || !parts.length) {
    document.getElementById('output').innerHTML = '<p class="small">No parts generated.</p>';
    return;
  }

  // Group parts: known material buckets + unassigned
  const byMat = {};
  const unassignedParts = [];
  for (const p of parts) {
    const mat = effectiveMat(p.id, p.material);
    if (isKnownMat(mat)) {
      if (!byMat[mat]) byMat[mat] = [];
      byMat[mat].push(p);
    } else {
      unassignedParts.push(p);
    }
  }

  // All CONFIG.materials in order (empty groups still shown)
  const matOrder = MaterialRegistry.list(CONFIG).map(m => m.id);

  function matEntry(matId) {
    return MaterialRegistry.get(matId, CONFIG);
  }
  function matLabel(matId) {
    return MaterialRegistry.label(matId, CONFIG);
  }
  function matBadgeHtml(partId, matId) {
    const e   = matEntry(matId);
    const col = MaterialRegistry.colorHex(matId, CONFIG, '#aaaaaa');
    const lbl = e.thickness != null ? `${e.thickness} mm` : (e.name || matId).split(' ')[0];
    // Luminance check so text is legible on any background
    const r = parseInt(col.slice(1,3),16)||170, g = parseInt(col.slice(3,5),16)||170, b = parseInt(col.slice(5,7),16)||170;
    const tc = (0.299*r + 0.587*g + 0.114*b)/255 > 0.52 ? '#333' : '#fff';
    return `<button class="part-mat-badge" data-part-id="${partId}" style="background:${col};color:${tc}" title="Material: ${matLabel(matId)} — click to reassign">${lbl}</button>`;
  }

  let html = '<div class="output-groups">';
  for (const mat of matOrder) {
    const grpParts = byMat[mat] || [];
    // Empty materials are skipped entirely — no placeholder header, no empty
    // body. A category appears only once something has been assigned to it,
    // which keeps the parts panel focused on what's actually being cut and
    // avoids drawing the user's eye to material slots they don't need yet.
    if (grpParts.length === 0) continue;
    const col      = MaterialRegistry.colorHex(mat, CONFIG, '#aaaaaa');

    html += `<div class="mat-group">`;
    html += `<div class="mat-group-hdr"><span class="mat-hdr-swatch" style="background:${col}"></span>${matLabel(mat)}<span class="mat-count">${grpParts.length} part${grpParts.length!==1?'s':''}</span></div>`;

    html += `<div class="part-grid">`;
    const dedupedParts = deduplicatePartsForDisplay(grpParts);
    for (const { part, count } of dedupedParts) {
      const wi = wallFromPartId(part.id);
      const ea = wi
        ? ` data-editwall="${wi.wall}"` + (wi.wingIndex != null ? ` data-editwing="${wi.wingIndex}"` : '')
        : '';
      const ec = wi ? ' wall-editable' : '';
      const iwf = iwFloorIdxForPart(part.id);
      const iwAttr = iwf !== null
        ? ` data-iw-floor="${iwf.floor}"` + (iwf.wingIndex != null ? ` data-iw-wing="${iwf.wingIndex}"` : '')
        : '';
      const iwCls  = iwf !== null ? ' iw-editable' : '';
      html += `<div class="part${ec}${iwCls}"${ea}${iwAttr} data-part-id="${part.id}">`;
      // Tiled sheets (window glass, frames, dividers, door inserts, etc.)
      // carry the "I need N copies" count in part.tileCount alongside a
      // single-tile preview geometry. Multiply by the dedup count so two
      // identical tiled sheets show ×(2N) — the user only needs to keep
      // track of one number per card. The displayed dimensions also flip
      // to the single-tile size so the W×H label matches the preview.
      const tileMult  = (part.tileCount && part.tileCount > 0) ? part.tileCount : 1;
      const totalQty  = count * tileMult;
      const dimW = (part.tileGeom ? part.tileGeom.bboxW : part.bboxW);
      const dimH = (part.tileGeom ? part.tileGeom.bboxH : part.bboxH);
      html += `<div class="part-name"><span>${part.name}</span><span class="part-dims">${dimW.toFixed(1)} × ${dimH.toFixed(1)} mm</span></div>`;
      if (totalQty > 1) html += `<span class="part-qty-badge">×${totalQty}</span>`;
      if (part.assemblyNote) {
        const note = totalQty > 1
          ? part.assemblyNote + ` Cut ×${totalQty} identical copies.`
          : part.assemblyNote;
        html += `<div class="part-note">${note}</div>`;
      } else if (totalQty > 1) {
        html += `<div class="part-note">Cut ×${totalQty} identical copies.</div>`;
      }
      if (iwf !== null) {/* hover badge via CSS ::after */}
      html += matBadgeHtml(part.id, mat);
      html += partToPreviewSvg(part);
      html += `</div>`;
    }
    html += `</div>`;
    html += `</div>`;
  }
  // Unassigned group — parts whose material was deleted or is otherwise unknown
  if (unassignedParts.length > 0) {
    html += `<div class="mat-group">`;
    html += `<div class="mat-group-hdr"><span class="mat-hdr-swatch" style="background:#999"></span>Unassigned<span class="mat-count">${unassignedParts.length} part${unassignedParts.length!==1?'s':''}</span></div>`;
    html += `<div class="part-grid">`;
    for (const { part, count } of deduplicatePartsForDisplay(unassignedParts)) {
      const wi = wallFromPartId(part.id);
      const ea = wi
        ? ` data-editwall="${wi.wall}"` + (wi.wingIndex != null ? ` data-editwing="${wi.wingIndex}"` : '')
        : '';
      const ec = wi ? ' wall-editable' : '';
      const iwf = iwFloorIdxForPart(part.id);
      const iwAttr = iwf !== null
        ? ` data-iw-floor="${iwf.floor}"` + (iwf.wingIndex != null ? ` data-iw-wing="${iwf.wingIndex}"` : '')
        : '';
      const iwCls  = iwf !== null ? ' iw-editable' : '';
      const tileMult = (part.tileCount && part.tileCount > 0) ? part.tileCount : 1;
      const totalQty = count * tileMult;
      const dimW = (part.tileGeom ? part.tileGeom.bboxW : part.bboxW);
      const dimH = (part.tileGeom ? part.tileGeom.bboxH : part.bboxH);
      html += `<div class="part${ec}${iwCls}"${ea}${iwAttr} data-part-id="${part.id}">`;
      html += `<div class="part-name"><span>${part.name}</span><span class="part-dims">${dimW.toFixed(1)} × ${dimH.toFixed(1)} mm</span></div>`;
      if (totalQty > 1) html += `<span class="part-qty-badge">×${totalQty}</span>`;
      if (part.assemblyNote) html += `<div class="part-note">${part.assemblyNote}${totalQty > 1 ? ` Cut ×${totalQty} identical copies.` : ''}</div>`;
      else if (totalQty > 1) html += `<div class="part-note">Cut ×${totalQty} identical copies.</div>`;
      html += `<button class="part-mat-badge" data-part-id="${part.id}" style="background:#999;color:#fff" title="Unassigned — click to assign to a material">—</button>`;
      html += partToPreviewSvg(part);
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  html += '</div>';

  document.getElementById('output').innerHTML = html;

  document.querySelectorAll('.part[data-editwall]').forEach(card => {
    card.addEventListener('click', () => {
      const wall    = card.dataset.editwall;
      const wRaw    = card.dataset.editwing;
      const wingIdx = (wRaw != null && wRaw !== '') ? parseInt(wRaw, 10) : null;
      openOpeningEditor(wall, wingIdx);
    });
  });
  const oeTargetSelect = document.getElementById('oeTargetSelect');
  if (oeTargetSelect && !oeTargetSelect.dataset.bound) {
    oeTargetSelect.dataset.bound = 'true';
    oeTargetSelect.addEventListener('change', () => oeSetEditTarget(oeTargetSelect.value));
  }
  document.querySelectorAll('.part[data-iw-floor]').forEach(card => {
    card.addEventListener('click', () => {
      // data-iw-floor can be a numeric floor index (0 = ground floor, 1 =
      // first inter-floor, etc.) or the sentinel string 'roof' (= IW_ROOF)
      // for the roof tab. parseInt('roof') is NaN, which the original
      // fallback turned into 0 (ground floor) — that's why clicking the
      // roof's edit button used to drop the user onto the ground floor.
      // Check for the roof sentinel before parsing as an integer.
      // data-iw-wing is the wing index for per-wing roof editing; absent
      // for main-building parts (the editor opens in main mode).
      const raw     = card.dataset.iwFloor;
      const wRaw    = card.dataset.iwWing;
      const wingIdx = (wRaw != null && wRaw !== '') ? parseInt(wRaw, 10) : null;
      if (raw === IW_ROOF) {
        openInternalWallEditor(IW_ROOF, wingIdx);
        return;
      }
      const f = parseInt(raw);
      openInternalWallEditor(isNaN(f) ? 0 : f, wingIdx);
    });
  });
  document.querySelectorAll('.part-mat-badge').forEach(badge => {
    badge.addEventListener('click', e => {
      e.stopPropagation();
      showMaterialPicker(badge.dataset.partId, badge);
    });
  });
}

export function showMaterialPicker(partId, anchor) {
  document.querySelectorAll('.mat-picker').forEach(p => p.remove());

  const current = effectiveMat(partId, (lastParts||[]).find(p=>p.id===partId)?.material);
  const popup   = document.createElement('div');
  popup.className = 'mat-picker';

  const title = document.createElement('div');
  title.style.cssText = 'font:700 10px/1 system-ui;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);padding:4px 8px 6px;border-bottom:1px solid var(--border);margin-bottom:3px;';
  title.textContent = 'Move to material';
  popup.appendChild(title);

  for (const m of MaterialRegistry.list(CONFIG)) {
    const btn = document.createElement('button');
    btn.dataset.matId = m.id;
    btn.className = m.id === current ? 'mp-active' : '';
    btn.innerHTML = `<span class="mp-swatch" style="background:${MaterialRegistry.colorHex(m.id, CONFIG, '#aaaaaa')}"></span>${m.name || m.id}`;
    popup.appendChild(btn);
  }

  // Unassigned option
  const unBtn = document.createElement('button');
  unBtn.dataset.matId = '__unassigned__';
  unBtn.style.cssText = 'border-top:1px solid var(--border);margin-top:3px;padding-top:8px;color:var(--muted);';
  unBtn.className = !isKnownMat(current) ? 'mp-active' : '';
  unBtn.innerHTML = `<span class="mp-swatch" style="background:#999"></span>Unassigned`;
  popup.appendChild(unBtn);

  const r = anchor.getBoundingClientRect();
  popup.style.top  = (r.bottom + 4) + 'px';
  popup.style.left = Math.max(4, r.right - 160) + 'px';
  document.body.appendChild(popup);

  popup.querySelectorAll('[data-mat-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const matId = btn.dataset.matId;
      MaterialRegistry.setPartMaterial(partId, matId, CONFIG);
      popup.remove();
      renderPartsOutput(lastParts);
    });
  });

  setTimeout(() => {
    const dismiss = e => { if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('click', dismiss); } };
    document.addEventListener('click', dismiss);
  }, 0);
}
