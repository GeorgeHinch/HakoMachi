import { intersectionFeatureKey, roadArmKey } from './road-intersection-overrides.js';

export function createRoadIntersectionMarkingControls({
  state,
  roadSystem,
  escapeAttr,
  escapeHtml,
  syncAll = () => {},
  doc = document,
}) {
  function selectedRoadIntersectionArmSettings(roadId) {
    const intersections = roadSystem.generatedRoadIntersections();
    const overrides = state.roadIntersectionOverrides || {};
    const settings = {
      count: 0,
      crosswalkEnabled: true,
      stopBarEnabled: true,
      tactilePaversEnabled: true,
      curbGuideEnabled: true,
    };
    intersections.forEach(intersection => {
      (intersection.arms || []).filter(arm => arm.roadId === roadId).forEach(arm => {
        settings.count += 1;
        const override = overrides[intersection.overrideKey]?.arms?.[roadArmKey(arm)];
        ['crosswalkEnabled', 'stopBarEnabled', 'tactilePaversEnabled', 'curbGuideEnabled'].forEach(key => {
          if (override?.[key] === false) settings[key] = false;
        });
      });
    });
    return settings;
  }

  function intersectionArmOverride(intersectionKey, armKey) {
    return (state.roadIntersectionOverrides || {})[intersectionKey]?.arms?.[armKey] || null;
  }

  function intersectionFeatureParentEnabled(override, type) {
    if (override?.enabled === false) return false;
    if (type === 'crosswalk') return override?.crosswalkEnabled !== false;
    if (type === 'stopBar') return override?.stopBarEnabled !== false;
    if (type === 'tactilePaver') return override?.tactilePaversEnabled !== false;
    if (type === 'curbGuide') return override?.curbGuideEnabled !== false;
    return true;
  }

  function roadIntersectionFeatureLabel(type, feature, index) {
    const endpoint = feature.endpoint || feature.fromEndpoint || 'arm';
    if (type === 'stopBar') return `Stop bar - ${endpoint}${feature.laneSide ? ` - ${feature.laneSide}` : ''}`;
    if (type === 'crosswalk') return `Crosswalk - ${endpoint}`;
    if (type === 'tactilePaver') return `Tactile paver - ${endpoint}${feature.side ? ` - ${feature.side}` : ` - ${index + 1}`}`;
    if (type === 'curbGuide') return `Curb guide - ${endpoint}`;
    return `Marking - ${endpoint}`;
  }

  function selectedRoadIntersectionFeatureRows(roadId) {
    const intersections = roadSystem.rawGeneratedRoadIntersections();
    const rows = [];
    const pushFeature = (intersection, type, feature, index) => {
      const armRoadId = feature.roadId || feature.fromRoadId;
      const endpoint = feature.endpoint || feature.fromEndpoint;
      if (armRoadId !== roadId) return;
      const armKey = roadArmKey({ roadId: armRoadId, endpoint });
      const featureWithKind = { ...feature, kind: type };
      const featureKey = intersectionFeatureKey(type, featureWithKind, index);
      const override = intersectionArmOverride(intersection.overrideKey, armKey);
      const parentEnabled = intersectionFeatureParentEnabled(override, type);
      const disabled = (override?.disabledFeatureKeys || []).includes(featureKey);
      rows.push({
        intersectionKey: intersection.overrideKey,
        armKey,
        featureKey,
        label: roadIntersectionFeatureLabel(type, feature, index),
        checked: parentEnabled && !disabled,
        disabled: parentEnabled ? '' : 'disabled',
      });
    };
    intersections.forEach(intersection => {
      (intersection.crosswalks || []).forEach((feature, index) => pushFeature(intersection, 'crosswalk', feature, index));
      (intersection.stopBars || []).forEach((feature, index) => pushFeature(intersection, 'stopBar', feature, index));
      (intersection.tactilePavers || []).forEach((feature, index) => pushFeature(intersection, 'tactilePaver', feature, index));
      (intersection.curbReturns || []).forEach((feature, index) => pushFeature(intersection, 'curbGuide', feature, index));
    });
    return rows;
  }

  function featureControlsHtml(roadId) {
    const rows = selectedRoadIntersectionFeatureRows(roadId);
    if (!rows.length) return '<div class="small muted" style="margin-top:8px">No individual generated markings touch this road yet.</div>';
    return `<div class="small muted" style="margin-top:8px">Individual generated markings</div>
      <div class="roadIntersectionFeatureList" style="display:grid;gap:5px;margin-top:5px">
        ${rows.map(row => `<label class="checkboxRow" style="display:flex;align-items:center;gap:8px"><input class="roadIntersectionFeatureToggle" type="checkbox" data-intersection-key="${escapeAttr(row.intersectionKey)}" data-arm-key="${escapeAttr(row.armKey)}" data-feature-key="${escapeAttr(row.featureKey)}" ${row.checked ? 'checked' : ''} ${row.disabled}> <span>${escapeHtml(row.label)}</span></label>`).join('')}
      </div>`;
  }

  function controlsHtml(roadId) {
    const s = selectedRoadIntersectionArmSettings(roadId);
    const disabled = s.count ? '' : 'disabled';
    return `<div class="section" style="margin-top:10px">
      <h3 style="margin:0 0 4px">Intersection markings</h3>
      <div class="small muted">${s.count ? `${s.count} selected-road intersection arm${s.count === 1 ? '' : 's'} detected.` : 'No generated intersections touch this road yet.'}</div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCrosswalks" type="checkbox" ${s.crosswalkEnabled ? 'checked' : ''} ${disabled}> <span>Crosswalks on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionStopBars" type="checkbox" ${s.stopBarEnabled ? 'checked' : ''} ${disabled}> <span>Stop bars on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionTactile" type="checkbox" ${s.tactilePaversEnabled ? 'checked' : ''} ${disabled}> <span>Tactile pavers on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCurbGuides" type="checkbox" ${s.curbGuideEnabled ? 'checked' : ''} ${disabled}> <span>Curb guide marks on this road</span></label>
      ${featureControlsHtml(roadId)}
      <button id="clearRoadIntersectionArmOverrides" class="secondary" type="button" style="margin-top:8px" ${disabled}>Reset selected-road overrides</button>
    </div>`;
  }

  function bindArmCheckbox(id, roadId, key) {
    const el = doc.getElementById(id);
    if (!el) return;
    el.onchange = () => {
      roadSystem.setRoadIntersectionArmOverrides(roadId, { [key]: !!el.checked });
      syncAll();
    };
  }

  function bindFeatureToggles() {
    doc.querySelectorAll('.roadIntersectionFeatureToggle').forEach(el => {
      el.onchange = () => {
        roadSystem.setRoadIntersectionFeatureOverride(el.dataset.intersectionKey, el.dataset.armKey, el.dataset.featureKey, !!el.checked);
        syncAll();
      };
    });
  }

  function bindClearArmOverrides(roadId) {
    const el = doc.getElementById('clearRoadIntersectionArmOverrides');
    if (!el) return;
    el.onclick = () => {
      roadSystem.clearRoadIntersectionArmOverrides(roadId);
      syncAll();
    };
  }

  return {
    bindArmCheckbox,
    bindClearArmOverrides,
    bindFeatureToggles,
    controlsHtml,
    selectedRoadIntersectionArmSettings,
    selectedRoadIntersectionFeatureRows,
  };
}
