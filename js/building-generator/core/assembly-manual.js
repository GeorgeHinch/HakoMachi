export const ASSEMBLY_MANUAL_SCHEMA = 'hakomachi.assembly-manual-html';
export const ASSEMBLY_MANUAL_SCHEMA_VERSION = 1;

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCase(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function byId(items, key = 'id') {
  return new Map((Array.isArray(items) ? items : []).map(item => [item[key], item]));
}

function groupPartsByMaterial(parts) {
  const groups = new Map();
  for (const part of Array.isArray(parts) ? parts : []) {
    const material = part.material || part.exportRef?.material || 'misc';
    if (!groups.has(material)) groups.set(material, []);
    groups.get(material).push(part);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function warningList(plan, sequence, illustrations) {
  return []
    .concat(Array.isArray(plan?.warnings) ? plan.warnings : [])
    .concat(Array.isArray(sequence?.warnings) ? sequence.warnings : [])
    .concat(Array.isArray(illustrations?.warnings) ? illustrations.warnings : []);
}

function css() {
  return `
    @page { size: auto; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #202020; background: #fff; font: 12px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 980px; margin: 0 auto; padding: 22px; }
    h1, h2, h3 { margin: 0; line-height: 1.18; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; margin-bottom: 10px; }
    h3 { font-size: 15px; margin-bottom: 6px; }
    p { margin: 0 0 8px; }
    .title-page, .section, .step { page-break-inside: avoid; break-inside: avoid; margin-bottom: 22px; }
    .title-page { min-height: 72vh; display: flex; flex-direction: column; justify-content: center; border-bottom: 2px solid #222; }
    .meta { color: #666; margin-top: 10px; }
    .small { color: #666; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
    th, td { border-bottom: 1px solid #ddd; padding: 4px 5px; text-align: left; vertical-align: top; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #555; }
    .warning { border: 1px solid #d8c37a; background: #fff8da; padding: 8px; margin: 6px 0; }
    .step { page-break-before: auto; border-top: 1px solid #222; padding-top: 12px; }
    .step-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
    .step-num { font-size: 24px; font-weight: 800; min-width: 44px; }
    .illustration { border: 1px solid #ddd; margin: 8px 0 10px; }
    .illustration svg { display: block; width: 100%; height: auto; }
    .parts { columns: 2; column-gap: 18px; margin: 0; padding-left: 16px; }
    .parts li { break-inside: avoid; margin-bottom: 3px; }
    @media print {
      main { max-width: none; padding: 0; }
      .screen-actions { display: none; }
      .step { page-break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
    }
    @media (max-width: 720px) {
      main { padding: 14px; }
      .grid { grid-template-columns: 1fr; }
      .parts { columns: 1; }
    }
  `;
}

function partsTable(parts) {
  return groupPartsByMaterial(parts).map(([material, rows]) => `
    <h3>${esc(titleCase(material))}</h3>
    <table>
      <thead><tr><th>Part</th><th>Role</th><th>Export file</th></tr></thead>
      <tbody>
        ${rows.map(part => `<tr><td><strong>${esc(part.name || part.id)}</strong><br><span class="small">${esc(part.id)}</span></td><td>${esc(titleCase(part.role || 'part'))}</td><td>${esc(part.exportRef?.path || part.exportRef?.fileName || '')}</td></tr>`).join('')}
      </tbody>
    </table>
  `).join('');
}

function materialNotes(plan) {
  return (Array.isArray(plan?.materialLayers) ? plan.materialLayers : []).map(layer => `<li><strong>${esc(titleCase(layer.id))}</strong>: ${esc((layer.partIds || []).length)} part${(layer.partIds || []).length === 1 ? '' : 's'}</li>`).join('');
}

function stepHtml(step, index, partMap, illustrationByStep) {
  const illustration = illustrationByStep.get(step.id);
  const parts = (Array.isArray(step.parts) ? step.parts : []).map(ref => {
    const part = partMap.get(ref.partId) || {};
    const path = ref.exportRef?.path || part.exportRef?.path || ref.exportRef?.fileName || part.exportRef?.fileName || '';
    return `<li><strong>${esc(ref.name || part.name || ref.partId)}</strong> <span class="small">${esc(ref.partId || part.id || '')}${path ? ` · ${esc(path)}` : ''}</span></li>`;
  }).join('');
  return `
    <section class="step">
      <div class="step-head">
        <div class="step-num">${index + 1}</div>
        <div>
          <h2>${esc(step.title || `Step ${index + 1}`)}</h2>
          <p>${esc(step.summary || '')}</p>
          <p class="small">${esc(titleCase(step.phase || 'assembly'))}</p>
        </div>
      </div>
      ${illustration?.svg ? `<div class="illustration">${illustration.svg}</div>` : ''}
      <h3>Parts</h3>
      <ul class="parts">${parts || '<li>No parts listed for this step.</li>'}</ul>
    </section>
  `;
}

export function createAssemblyManualHtml(plan = {}, sequence = plan.sequence || {}, illustrations = {}, opts = {}) {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : [];
  const parts = Array.isArray(plan?.parts) ? plan.parts : [];
  const partMap = byId(parts);
  const illustrationByStep = byId(illustrations?.steps || [], 'stepId');
  const warnings = warningList(plan, sequence, illustrations);
  const source = plan.source || {};
  const title = opts.title || source.buildingName || source.buildingType || 'HakoMachi Building';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} Assembly Manual</title>
  <meta name="hakomachi-manual-schema" content="${ASSEMBLY_MANUAL_SCHEMA}">
  <meta name="hakomachi-manual-schema-version" content="${ASSEMBLY_MANUAL_SCHEMA_VERSION}">
  <style>${css()}</style>
</head>
<body>
  <main>
    <div class="screen-actions"><button onclick="window.print()">Print</button></div>
    <section class="title-page">
      <h1>${esc(title)}</h1>
      <p class="meta">Assembly manual generated from the HakoMachi assembly plan.</p>
      <p class="meta">${steps.length} steps · ${parts.length} parts${source.dimensionsMm ? ` · ${esc(source.dimensionsMm.width || '?')} × ${esc(source.dimensionsMm.depth || '?')} × ${esc(source.dimensionsMm.height || '?')} mm` : ''}</p>
    </section>
    <section class="section grid">
      <div>
        <h2>Tools and Notes</h2>
        <p>Dry fit tabs and slots before applying adhesive. Keep engraved labels facing the intended visible or reference side for each part.</p>
        <p>Use the SVG export paths in this manual to match each physical piece back to its material sheet.</p>
      </div>
      <div>
        <h2>Material Groups</h2>
        <ul>${materialNotes(plan) || '<li>No material groups were listed.</li>'}</ul>
      </div>
    </section>
    ${warnings.length ? `<section class="section"><h2>Generator Warnings</h2>${warnings.map(w => `<div class="warning">${esc(w.message || w.code || 'Assembly warning')}</div>`).join('')}</section>` : ''}
    <section class="section">
      <h2>Parts Inventory</h2>
      ${partsTable(parts) || '<p>No parts were listed.</p>'}
    </section>
    <section class="section">
      <h2>Assembly Steps</h2>
      ${steps.map((step, index) => stepHtml(step, index, partMap, illustrationByStep)).join('') || '<p>No assembly steps were generated.</p>'}
    </section>
  </main>
</body>
</html>`;
}
