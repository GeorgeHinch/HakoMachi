export function renderRailCrossingDetail({
  railCrossing,
  panel,
  state,
  getElement,
  fmt,
  escapeHtml,
  syncAll,
  installAdaptiveDegreeStepping,
  railCrossingOverrideKey,
  normalizeRailCrossingOverride,
  centerClearanceMm,
}) {
  const overrideKey = railCrossingOverrideKey(railCrossing);
  const override = normalizeRailCrossingOverride((state.railCrossingOverrides || {})[overrideKey]);
  panel.innerHTML = `
    <b>Rail crossing selected</b>
    <div class="small muted" style="margin:4px 0 8px">${escapeHtml(railCrossing.roadName)} crossing ${escapeHtml(railCrossing.trackName)}</div>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingEnabled" type="checkbox" ${override.enabled ? 'checked' : ''}> <span>Generate crossing cut pieces</span></label>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingSurveyTemplate" type="checkbox" ${override.surveyTemplateEnabled ? 'checked' : ''}> <span>Generate survey / test-fit template</span></label>
    <div class="row"><div><label>Rail arc offset mm</label><input id="railCrossingArc" type="number" step="0.1" value="${fmt(override.railArcOffsetMm || 0)}"></div><div><label>Crossing offset mm</label><input id="railCrossingOffset" type="number" step="0.1" value="${fmt(override.crossingOffsetMm || 0)}"></div></div>
    <div class="row"><div><label>Road angle adjust °</label><input id="railCrossingRoadAngleOffset" type="number" step="0.1" value="${fmt(override.roadAngleOffsetDeg || 0)}"></div><div><label>Track angle adjust °</label><input id="railCrossingTrackAngleOffset" type="number" step="0.1" value="${fmt(override.trackAngleOffsetDeg || 0)}"></div></div>
    <div class="row"><div><label>Road width override mm</label><input id="railCrossingRoadWidth" type="number" step="0.1" placeholder="${fmt(railCrossing.roadWidthMm || 0)}" value="${override.roadWidthMm ? fmt(override.roadWidthMm) : ''}"></div><div><label>Flangeway guide mm</label><input id="railCrossingFlangeway" type="number" min="0.2" step="0.1" value="${fmt(override.flangewayMm || 1.2)}"></div></div>
    <div class="row"><div><label>Center clearance mm</label><input value="${fmt(centerClearanceMm)}" disabled></div><div><label>Crossing angle °</label><input value="${fmt(railCrossing.crossingAngleDeg || 0)}" disabled></div></div>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingTrimGuides" type="checkbox" ${override.trimGuideEnabled ? 'checked' : ''}> <span>Template trim guides ±0.5 / ±1.0 mm</span></label>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="railCrossingRegistrationMarks" type="checkbox" ${override.registrationMarksEnabled ? 'checked' : ''}> <span>Template registration marks</span></label>
    <div class="small muted" style="margin-top:8px">Survey templates export lightweight fit-check pieces with rail slots, road/track centerlines, road edges, flangeway guides, angle text, trim guides, and registration marks. The same angle, offset, road-width, flangeway, and arc values are reused by the final retained crossing inserts.</div>`;

  const updateOverride = patch => {
    state.railCrossingOverrides = state.railCrossingOverrides || {};
    state.railCrossingOverrides[overrideKey] = normalizeRailCrossingOverride({
      ...override,
      ...(state.railCrossingOverrides[overrideKey] || {}),
      ...patch,
    });
    state.selectedRailCrossingId = overrideKey;
    syncAll();
  };
  const enabled = getElement('railCrossingEnabled'); if (enabled) enabled.onchange = () => updateOverride({ enabled: !!enabled.checked });
  const survey = getElement('railCrossingSurveyTemplate'); if (survey) survey.onchange = () => updateOverride({ surveyTemplateEnabled: !!survey.checked });
  const arc = getElement('railCrossingArc'); if (arc) arc.oninput = () => updateOverride({ railArcOffsetMm: parseFloat(arc.value) || 0 });
  const offset = getElement('railCrossingOffset'); if (offset) offset.oninput = () => updateOverride({ crossingOffsetMm: parseFloat(offset.value) || 0 });
  const roadAngle = getElement('railCrossingRoadAngleOffset'); if (roadAngle) { installAdaptiveDegreeStepping(roadAngle); roadAngle.oninput = () => updateOverride({ roadAngleOffsetDeg: parseFloat(roadAngle.value) || 0 }); }
  const trackAngle = getElement('railCrossingTrackAngleOffset'); if (trackAngle) { installAdaptiveDegreeStepping(trackAngle); trackAngle.oninput = () => updateOverride({ trackAngleOffsetDeg: parseFloat(trackAngle.value) || 0 }); }
  const roadWidth = getElement('railCrossingRoadWidth'); if (roadWidth) roadWidth.oninput = () => updateOverride({ roadWidthMm: roadWidth.value === '' ? null : Math.max(1, parseFloat(roadWidth.value) || 0) });
  const flangeway = getElement('railCrossingFlangeway'); if (flangeway) flangeway.oninput = () => updateOverride({ flangewayMm: Math.max(.2, parseFloat(flangeway.value) || 1.2) });
  const trimGuides = getElement('railCrossingTrimGuides'); if (trimGuides) trimGuides.onchange = () => updateOverride({ trimGuideEnabled: !!trimGuides.checked });
  const registration = getElement('railCrossingRegistrationMarks'); if (registration) registration.onchange = () => updateOverride({ registrationMarksEnabled: !!registration.checked });
}
