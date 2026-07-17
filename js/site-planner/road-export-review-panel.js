const MEDIA_PRESETS = Object.freeze([
  { key: 'letter', label: 'Letter', widthMm: 215.9, heightMm: 279.4 },
  { key: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { key: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { key: '12x12', label: '12 x 12 in', widthMm: 304.8, heightMm: 304.8 },
  { key: '12x24', label: '12 x 24 in', widthMm: 304.8, heightMm: 609.6 },
  { key: 'custom', label: 'Custom', widthMm: 300, heightMm: 300 },
]);

const DEFAULT_REVIEW_SETTINGS = Object.freeze({
  mediaPreset: 'a4',
  orientation: 'landscape',
  customWidthMm: 300,
  customHeightMm: 300,
  marginMm: 4,
  includedRoadIds: null,
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function fmtMm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(1);
}

function addPoint(bounds, point) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return bounds;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!bounds) return { minX: x, minY: y, maxX: x, maxY: y };
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
  return bounds;
}

function addPolygon(bounds, points = []) {
  for (const point of points || []) bounds = addPoint(bounds, point);
  return bounds;
}

function addFeatureBounds(bounds, feature) {
  if (!feature || feature.hidden) return bounds;
  const x = Number(feature.x) || 0;
  const y = Number(feature.y) || 0;
  const w = Number(feature.widthPx || feature.diameterPx || 0) || 0;
  const h = Number(feature.depthPx || feature.diameterPx || w) || w;
  bounds = addPoint(bounds, { x: x - w / 2, y: y - h / 2 });
  bounds = addPoint(bounds, { x: x + w / 2, y: y + h / 2 });
  return bounds;
}

function sizeFromBounds(bounds) {
  if (!bounds) return { widthPx: 0, heightPx: 0 };
  return {
    widthPx: Math.max(0, bounds.maxX - bounds.minX),
    heightPx: Math.max(0, bounds.maxY - bounds.minY),
  };
}

export function roadExportMediaPresets() {
  return MEDIA_PRESETS.slice();
}

export function normalizeRoadExportReviewSettings(settings = {}, data = null) {
  const presetKeys = new Set(MEDIA_PRESETS.map(preset => preset.key));
  const next = {
    ...DEFAULT_REVIEW_SETTINGS,
    ...(settings || {}),
  };
  if (!presetKeys.has(next.mediaPreset)) next.mediaPreset = DEFAULT_REVIEW_SETTINGS.mediaPreset;
  next.orientation = next.orientation === 'portrait' ? 'portrait' : 'landscape';
  next.customWidthMm = Math.max(20, Number(next.customWidthMm) || DEFAULT_REVIEW_SETTINGS.customWidthMm);
  next.customHeightMm = Math.max(20, Number(next.customHeightMm) || DEFAULT_REVIEW_SETTINGS.customHeightMm);
  next.marginMm = Math.max(0, Number(next.marginMm) || DEFAULT_REVIEW_SETTINGS.marginMm);
  const roadIds = (data?.roads || []).map(road => road.id).filter(Boolean);
  const allowed = new Set(roadIds);
  const included = Array.isArray(next.includedRoadIds)
    ? next.includedRoadIds.filter(id => allowed.has(id))
    : roadIds;
  next.includedRoadIds = included;
  return next;
}

export function resolveRoadExportMedia(settings = {}) {
  const normalized = normalizeRoadExportReviewSettings(settings);
  const preset = MEDIA_PRESETS.find(item => item.key === normalized.mediaPreset) || MEDIA_PRESETS[0];
  let widthMm = preset.key === 'custom' ? normalized.customWidthMm : preset.widthMm;
  let heightMm = preset.key === 'custom' ? normalized.customHeightMm : preset.heightMm;
  if (normalized.orientation === 'landscape' && heightMm > widthMm) [widthMm, heightMm] = [heightMm, widthMm];
  if (normalized.orientation === 'portrait' && widthMm > heightMm) [widthMm, heightMm] = [heightMm, widthMm];
  return { ...preset, widthMm, heightMm, orientation: normalized.orientation, marginMm: normalized.marginMm };
}

export function roadExportSectionBounds(road) {
  let bounds = null;
  bounds = addPolygon(bounds, road?.roadPolygonPx || []);
  for (const sidewalk of road?.sidewalkPolygonsPx || []) bounds = addPolygon(bounds, sidewalk?.polygon || []);
  for (const seam of road?.seams || []) {
    bounds = addPoint(bounds, { x: seam.x1, y: seam.y1 });
    bounds = addPoint(bounds, { x: seam.x2, y: seam.y2 });
  }
  return bounds;
}

export function roadExportContentBounds(data, roadFeatures = []) {
  let bounds = null;
  for (const road of data?.roads || []) bounds = addPolygon(bounds, road?.roadPolygonPx || []);
  for (const road of data?.roads || []) {
    for (const sidewalk of road?.sidewalkPolygonsPx || []) bounds = addPolygon(bounds, sidewalk?.polygon || []);
    for (const seam of road?.seams || []) {
      bounds = addPoint(bounds, { x: seam.x1, y: seam.y1 });
      bounds = addPoint(bounds, { x: seam.x2, y: seam.y2 });
    }
  }
  for (const feature of roadFeatures || []) bounds = addFeatureBounds(bounds, feature);
  return bounds;
}

export function roadExportTransformForMedia({ bounds, media, pxPerMm }) {
  if (!bounds || !media) return { transform: '', contentWidthMm: 0, contentHeightMm: 0, fits: true, calibrated: !!pxPerMm };
  const { widthPx, heightPx } = sizeFromBounds(bounds);
  const calibrated = Number.isFinite(Number(pxPerMm)) && Number(pxPerMm) > 0;
  const scale = calibrated
    ? 1 / Number(pxPerMm)
    : Math.min(
      (Math.max(1, media.widthMm - media.marginMm * 2)) / Math.max(1, widthPx),
      (Math.max(1, media.heightMm - media.marginMm * 2)) / Math.max(1, heightPx),
    );
  const contentWidthMm = widthPx * scale;
  const contentHeightMm = heightPx * scale;
  const fits = contentWidthMm <= media.widthMm - media.marginMm * 2
    && contentHeightMm <= media.heightMm - media.marginMm * 2;
  return {
    transform: `translate(${media.marginMm} ${media.marginMm}) scale(${scale}) translate(${-bounds.minX} ${-bounds.minY})`,
    contentWidthMm,
    contentHeightMm,
    fits,
    calibrated,
  };
}

export function filterRoadExportDataByRoadIds(data, includedRoadIds = []) {
  const included = new Set(includedRoadIds || []);
  return {
    ...data,
    roads: (data?.roads || []).filter(road => included.has(road.id)),
    seams: (data?.seams || []).filter(seam => included.has(seam.roadId)),
  };
}

function layerSummary(road) {
  const layers = [];
  if ((road.roadPolygonPx || []).length) layers.push('road deck');
  if ((road.sidewalkPolygonsPx || []).length) layers.push('sidewalks');
  if ((road.seams || []).length) layers.push('seams');
  layers.push('curb engraves');
  return layers;
}

function sectionFitMessage(bounds, media, pxPerMm) {
  const result = roadExportTransformForMedia({ bounds, media, pxPerMm });
  if (!result.calibrated) return { status: 'warning', text: 'No calibration: preview will fit to sheet, not true model scale.' };
  if (!result.fits) return { status: 'warning', text: `Exceeds media at ${fmtMm(result.contentWidthMm)} x ${fmtMm(result.contentHeightMm)} mm.` };
  return { status: 'ok', text: `Fits at ${fmtMm(result.contentWidthMm)} x ${fmtMm(result.contentHeightMm)} mm.` };
}

export function createRoadExportReviewController({
  state,
  canvasWrap,
  generateRoadExportData,
  onExport,
  setStatusHint = () => {},
}) {
  let panel = null;

  function settings(data) {
    state.roadExportReviewSettings = normalizeRoadExportReviewSettings(state.roadExportReviewSettings, data);
    return state.roadExportReviewSettings;
  }

  function close() {
    if (panel) panel.classList.remove('open');
    state.roadExportReviewOpen = false;
  }

  function updatePanelBounds() {
    if (!panel) return;
    const header = document.querySelector('.top, .sitePlannerTop');
    const top = Math.max(0, header?.getBoundingClientRect?.().bottom || 0);
    panel.style.setProperty('--road-export-review-top', `${top}px`);
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'roadExportReviewPanel';
    panel.className = 'roadExportReviewPanel';
    panel.setAttribute('aria-label', 'Road export review');
    panel.addEventListener('pointerdown', event => event.stopPropagation());
    panel.addEventListener('wheel', event => event.stopPropagation(), { passive: true });
    (canvasWrap || document.body).appendChild(panel);
    window.addEventListener('resize', updatePanelBounds);
    return panel;
  }

  function updateSetting(mutator) {
    const data = generateRoadExportData();
    const next = settings(data);
    mutator(next);
    state.roadExportReviewSettings = normalizeRoadExportReviewSettings(next, data);
    render(data);
  }

  function render(data = generateRoadExportData()) {
    const el = ensurePanel();
    updatePanelBounds();
    const current = settings(data);
    const media = resolveRoadExportMedia(current);
    const included = new Set(current.includedRoadIds || []);
    const filteredData = filterRoadExportDataByRoadIds(data, current.includedRoadIds);
    const bounds = roadExportContentBounds(filteredData, (state.roadFeatures || []).filter(feature => !feature.roadId || included.has(feature.roadId)));
    const overall = roadExportTransformForMedia({ bounds, media, pxPerMm: state.pxPerMm });
    const mediaOptions = MEDIA_PRESETS.map(preset => `<option value="${preset.key}" ${preset.key === current.mediaPreset ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('');
    const cards = (data.roads || []).map((road, index) => {
      const roadBounds = roadExportSectionBounds(road);
      const { widthPx, heightPx } = sizeFromBounds(roadBounds);
      const widthMm = state.pxPerMm ? widthPx / state.pxPerMm : widthPx;
      const heightMm = state.pxPerMm ? heightPx / state.pxPerMm : heightPx;
      const fit = sectionFitMessage(roadBounds, media, state.pxPerMm);
      const checked = included.has(road.id) ? 'checked' : '';
      return `<article class="roadExportCard">
        <label class="roadExportCardToggle">
          <input type="checkbox" data-road-export-include="${escapeHtml(road.id)}" ${checked}>
          <span>Include</span>
        </label>
        <div class="roadExportThumb" aria-hidden="true">${index + 1}</div>
        <div class="roadExportCardBody">
          <h4>${escapeHtml(road.name || `Road ${index + 1}`)}</h4>
          <div class="roadExportMeta">${escapeHtml(road.mode || 'road')} · ${Math.max(1, (road.seams || []).length + 1)} piece${(road.seams || []).length ? 's' : ''}</div>
          <div class="roadExportMeta">${fmtMm(widthMm)} x ${fmtMm(heightMm)} ${state.pxPerMm ? 'mm' : 'px'} · ${escapeHtml(layerSummary(road).join(', '))}</div>
          <div class="roadExportFit ${fit.status === 'ok' ? 'ok' : 'warning'}">${escapeHtml(fit.text)}</div>
        </div>
      </article>`;
    }).join('') || '<div class="roadExportEmpty">No visible roads are available to export.</div>';
    const overallWarning = !overall.calibrated
      ? '<div class="roadExportWarning">Calibrate the reference image to export at true physical scale. Until then, the reviewed SVG will be fit to the selected media.</div>'
      : (!overall.fits ? `<div class="roadExportWarning">Selected content exceeds ${escapeHtml(media.label)} ${media.orientation}: ${fmtMm(overall.contentWidthMm)} x ${fmtMm(overall.contentHeightMm)} mm plus margins.</div>` : '');

    el.innerHTML = `<div class="roadExportReviewBackdrop"></div>
      <div class="roadExportReviewContent">
        <header class="roadExportReviewHeader">
          <div>
            <h3>Road Export Review</h3>
            <p>Review road deck, sidewalk, seam, marking, hatch, stencil, and rail-crossing output before generating files.</p>
          </div>
          <button type="button" class="roadExportClose" aria-label="Close road export review">×</button>
        </header>
        <div class="roadExportMediaControls">
          <label>Media
            <select id="roadExportMediaPreset">${mediaOptions}</select>
          </label>
          <label>Orientation
            <select id="roadExportOrientation">
              <option value="landscape" ${current.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
              <option value="portrait" ${current.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
            </select>
          </label>
          <label class="${current.mediaPreset === 'custom' ? '' : 'mutedControl'}">Width mm
            <input id="roadExportCustomWidth" type="number" min="20" step="0.1" value="${current.customWidthMm}" ${current.mediaPreset === 'custom' ? '' : 'disabled'}>
          </label>
          <label class="${current.mediaPreset === 'custom' ? '' : 'mutedControl'}">Height mm
            <input id="roadExportCustomHeight" type="number" min="20" step="0.1" value="${current.customHeightMm}" ${current.mediaPreset === 'custom' ? '' : 'disabled'}>
          </label>
        </div>
        <div class="roadExportReviewSummary">
          <b>${(current.includedRoadIds || []).length} of ${(data.roads || []).length} sections selected</b>
          <span>${escapeHtml(media.label)} ${media.orientation} · ${fmtMm(media.widthMm)} x ${fmtMm(media.heightMm)} mm · ${state.pxPerMm ? `1 px = ${fmtMm(1 / state.pxPerMm)} mm` : 'uncalibrated'}</span>
        </div>
        ${overallWarning}
        <div class="roadExportCardGrid">${cards}</div>
        <footer class="roadExportReviewFooter">
          <button type="button" class="roadExportSecondary">Close</button>
          <button type="button" class="roadExportPrimary" ${(current.includedRoadIds || []).length ? '' : 'disabled'}>Export</button>
        </footer>
      </div>`;

    el.querySelector('.roadExportClose')?.addEventListener('click', close);
    el.querySelector('.roadExportSecondary')?.addEventListener('click', close);
    el.querySelector('#roadExportMediaPreset')?.addEventListener('change', event => updateSetting(next => { next.mediaPreset = event.target.value; }));
    el.querySelector('#roadExportOrientation')?.addEventListener('change', event => updateSetting(next => { next.orientation = event.target.value; }));
    el.querySelector('#roadExportCustomWidth')?.addEventListener('input', event => updateSetting(next => { next.customWidthMm = Number(event.target.value) || next.customWidthMm; }));
    el.querySelector('#roadExportCustomHeight')?.addEventListener('input', event => updateSetting(next => { next.customHeightMm = Number(event.target.value) || next.customHeightMm; }));
    el.querySelectorAll('[data-road-export-include]').forEach(input => {
      input.addEventListener('change', () => updateSetting(next => {
        const selected = new Set(next.includedRoadIds || []);
        if (input.checked) selected.add(input.dataset.roadExportInclude);
        else selected.delete(input.dataset.roadExportInclude);
        next.includedRoadIds = Array.from(selected);
      }));
    });
    el.querySelector('.roadExportPrimary')?.addEventListener('click', () => {
      const exportData = generateRoadExportData();
      const exportSettings = settings(exportData);
      const exportMedia = resolveRoadExportMedia(exportSettings);
      onExport({ settings: exportSettings, media: exportMedia });
      close();
    });
  }

  function open() {
    state.roadExportReviewOpen = true;
    render(generateRoadExportData());
    updatePanelBounds();
    ensurePanel().classList.add('open');
    setStatusHint('Review road export sections, media size, and fit warnings before exporting.');
  }

  return {
    close,
    open,
    render,
  };
}
