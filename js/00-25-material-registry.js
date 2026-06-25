'use strict';

/* =====================================================================
   MATERIAL REGISTRY
   ---------------------------------------------------------------------
   Single access point for material metadata used by export folders,
   sheet-size checks, part reassignment, cladding-style routing, preview
   badges, and 3D material colours. Older helper names remain below as
   compatibility wrappers so the rest of the code can migrate gradually.
   ===================================================================== */

const MaterialRegistry = {
  cfg(cfg = CONFIG) {
    if (!cfg.materials) cfg.materials = [];
    if (!cfg.partMaterials) cfg.partMaterials = {};
    if (!cfg.claddingMaterials) cfg.claddingMaterials = {};
    return cfg;
  },

  list(cfg = CONFIG) {
    cfg = this.cfg(cfg);
    return cfg.materials;
  },

  get(id, cfg = CONFIG, fallback = true) {
    cfg = this.cfg(cfg);
    const mat = cfg.materials.find(m => m.id === id);
    return mat || (fallback ? { id, name: id } : null);
  },

  has(id, cfg = CONFIG) {
    return !!this.get(id, cfg, false);
  },

  label(id, cfg = CONFIG) {
    const m = this.get(id, cfg);
    const t = m && m.thickness != null ? ` — ${m.thickness} mm` : '';
    return ((m && m.name) || id || 'material') + t;
  },

  folderName(id, cfg = CONFIG) {
    const m = this.get(id, cfg);
    return sanitiseFolderName((m && m.name) || id || 'misc');
  },

  colorHex(id, cfg = CONFIG, fallback = '#cccccc') {
    const m = this.get(id, cfg, false);
    return normaliseHexColour(m && (m.colour || m.color), fallback);
  },

  colorNumber(id, cfg = CONFIG, fallback = 0xcccccc) {
    const hex = this.colorHex(id, cfg, '#' + Number(fallback || 0).toString(16).padStart(6, '0'));
    return parseInt(hex.slice(1), 16);
  },

  thickness(id, cfg = CONFIG, fallback = null) {
    const m = this.get(id, cfg, false);
    const v = m ? Number(m.thickness) : NaN;
    return isFinite(v) && v > 0 ? v : fallback;
  },

  sheetSizeMm(id, cfg = CONFIG) {
    const m = this.get(id, cfg, false);
    if (!m) return null;
    const w = parseFloat(m.maxWidthMm != null ? m.maxWidthMm : m.maxW);
    const h = parseFloat(m.maxHeightMm != null ? m.maxHeightMm : m.maxH);
    if (!isFinite(w) || w <= 0 || h <= 0) return null;
    return { w, h };
  },

  effectiveSheetSizeMm(id, cfg = CONFIG) {
    const raw = this.sheetSizeMm(id, cfg);
    if (!raw) return null;
    return {
      w: Math.max(0, raw.w - 2 * LASER_SAFETY_EDGE_BUFFER_MM),
      h: Math.max(0, raw.h - 2 * LASER_SAFETY_EDGE_BUFFER_MM),
    };
  },

  partMaterial(partOrId, defaultMat = 'core', cfg = CONFIG) {
    cfg = this.cfg(cfg);
    const partId = (partOrId && typeof partOrId === 'object') ? partOrId.id : partOrId;
    const def = (partOrId && typeof partOrId === 'object') ? (partOrId.material || defaultMat) : defaultMat;
    return (cfg.partMaterials || {})[partId] || def || 'core';
  },

  setPartMaterial(partId, matId, cfg = CONFIG) {
    cfg = this.cfg(cfg);
    cfg.partMaterials[partId] = matId;
  },

  partFits(part, materialId = null, cfg = CONFIG) {
    const matId = materialId || this.partMaterial(part, part && part.material, cfg);
    const max = this.effectiveSheetSizeMm(matId, cfg);
    if (!max || !part) return true;
    const w = part.bboxW || 0;
    const h = part.bboxH || 0;
    return (w <= max.w + 0.01 && h <= max.h + 0.01)
        || (h <= max.w + 0.01 && w <= max.h + 0.01);
  },

  claddingMaterialId(styleKey, cfg = CONFIG) {
    cfg = this.cfg(cfg);
    return (styleKey && cfg.claddingMaterials && cfg.claddingMaterials[styleKey]) || 'cladding';
  },

  claddingColorHex(styleKey, cfg = CONFIG, fallback = '#cbbfa3') {
    return this.colorHex(this.claddingMaterialId(styleKey, cfg), cfg, fallback);
  },

  threeMaterial(id, cfg = CONFIG, opts = {}, fallback = 0xcccccc) {
    const params = {
      color: opts.color != null ? opts.color : this.colorNumber(id, cfg, fallback),
      roughness: opts.roughness != null ? opts.roughness : 0.82,
      metalness: opts.metalness != null ? opts.metalness : 0.0,
    };
    if (opts.transparent != null) params.transparent = opts.transparent;
    if (opts.opacity != null) params.opacity = opts.opacity;
    if (opts.side != null) params.side = opts.side;
    if (opts.map != null) params.map = opts.map;
    return new THREE.MeshStandardMaterial(params);
  },

  threeCladdingMaterial(styleKey, cfg = CONFIG, opts = {}, fallback = 0xc9b89b) {
    return this.threeMaterial(this.claddingMaterialId(styleKey || (cfg && cfg.claddingStyle), cfg), cfg, opts, fallback);
  },
};

// Compatibility wrappers retained for older call sites.
function materialSheetSizeMm(materialId) {
  return MaterialRegistry.sheetSizeMm(materialId);
}

function materialEffectiveSheetSizeMm(materialId) {
  return MaterialRegistry.effectiveSheetSizeMm(materialId);
}

function partFitsMaterial(part, materialId) {
  return MaterialRegistry.partFits(part, materialId || (part && part.material));
}

function floorPartExceedsMaterial(part, materialId) {
  return !MaterialRegistry.partFits(part, materialId || 'core');
}

function material3DForCladdingStyle(cfg, styleKey, opts = {}, fallback = 0xc9b89b) {
  return MaterialRegistry.threeCladdingMaterial(styleKey || (cfg && cfg.claddingStyle), cfg || CONFIG, opts, fallback);
}

function addPartsToList(parts, maybePartOrList) {
  if (!maybePartOrList) return;
  if (Array.isArray(maybePartOrList)) parts.push(...maybePartOrList.filter(Boolean));
  else parts.push(maybePartOrList);
}
