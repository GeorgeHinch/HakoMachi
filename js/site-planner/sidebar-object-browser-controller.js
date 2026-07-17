import {
  sidebarObjectSelected,
  sidebarObjectTypeMetaForState,
  sidebarObjectTypesForState,
  sidebarObjectsForType as modelSidebarObjectsForType,
} from './sidebar-object-model.js';

export function createSidebarObjectBrowserController({
  state,
  doc = document,
  getElement,
  escapeHtml,
  escapeAttr,
  fmt,
  hydrateIcons,
  installHakoImportDropzone,
  normalizeBuilding,
  normalizeRoad,
  normalizeTrack,
  normalizeTrackAccessory,
  normalizeRoadFeature,
  normalizeBenchworkOutline,
  normalizeStreetlight,
  normalizeFabricRegion,
  normalizeStlObject,
  buildingStateLabel,
  trackAccessoryPreset,
  trackAccessoryLabel,
  trackAccessoryFilterCounts,
  trackAccessoryMatchesObjectFilter,
  isBuildingSelected,
  setSingleSiteObjectSelection,
  toggleSiteObjectSelection,
  updateSite3DHoverIndicator,
  renderSelected,
  updateHandoff,
  draw,
  fabricPresets = {},
}) {
  let activeObjectType = null;
  let trackAccessoryFilter = 'all';

  const $ = id => getElement(id);

  function setActiveType(type) {
    activeObjectType = type || null;
  }

  function sidebarObjectTypes() {
    return sidebarObjectTypesForState(state);
  }

  function sidebarObjectTypeMeta(type) {
    return sidebarObjectTypes().find(t => t.key === type) || sidebarObjectTypeMetaForState(state, type);
  }

  function objectRowSelected(type, id) {
    return sidebarObjectSelected(state, type, id, isBuildingSelected);
  }

  function selectSidebarObject(type, id, ev = null) {
    activeObjectType = type;
    const siteTypeBySidebarType = {
      roads: 'road',
      tracks: 'track',
      trackAccessories: 'trackAccessory',
      roadFeatures: 'roadFeature',
      benchwork: 'benchwork',
      streetlights: 'streetlight',
      fabric: 'fabric',
      annotations: 'annotation',
      siteObjects: 'stlObject',
    };
    if (type === 'buildings') {
      if (ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey)) toggleSiteObjectSelection('building', id);
      else setSingleSiteObjectSelection('building', id);
    } else {
      const siteType = siteTypeBySidebarType[type];
      if (siteType) {
        if (ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey)) toggleSiteObjectSelection(siteType, id);
        else setSingleSiteObjectSelection(siteType, id);
      }
    }
    renderObjectBrowser();
    renderSelected();
    updateHandoff();
    draw();
  }

  function makeObjectListRow(type, raw) {
    const el = doc.createElement('div');
    const selectedClass = objectRowSelected(type, raw.id) ? 'selected' : '';
    el.className = 'buildingItem ' + selectedClass;
    el.tabIndex = 0;
    if (type === 'buildings') {
      const b = normalizeBuilding(raw);
      const hakoBadge = b.hakoFile ? '<span class="pill buildingFileBadge">.hako</span>' : '';
      const metric = b.padType === 'rect' ? `${fmt(b.widthMm)}&times;${fmt(b.depthMm)}` : fmt(b.derived?.areaMm2 || 0) + ' mm&sup2;';
      el.innerHTML = `<span class="swatch" style="background:${b.color}"></span><div class="buildingInfo"><span class="buildingName" title="${escapeAttr(b.name || 'Building')}">${escapeHtml(b.name || 'Building')}</span><span class="small muted buildingMeta">${buildingStateLabel(b.state)} &middot; ${b.padType}${b.hidden ? ' &middot; hidden' : ''}${b.locked ? ' &middot; locked' : ''}</span></div><span class="pill buildingMetric" title="${escapeAttr(metric)}">${metric}</span>${hakoBadge}`;
      const setCardHover = on => {
        state.hoverBuildingId = on ? b.id : (state.hoverBuildingId === b.id ? null : state.hoverBuildingId);
        el.classList.toggle('sidebarHover', on);
        draw();
        updateSite3DHoverIndicator();
      };
      el.onmouseenter = () => setCardHover(true);
      el.onmouseleave = () => setCardHover(false);
      el.onfocus = () => setCardHover(true);
      el.onblur = () => setCardHover(false);
      el.onclick = ev => selectSidebarObject('buildings', b.id, ev);
      el.onkeydown = ev => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectSidebarObject('buildings', b.id, ev);
        }
      };
      return el;
    }
    if (type === 'roads') {
      const r = normalizeRoad(raw);
      el.innerHTML = `<span class="swatch" style="background:${r.color || '#6f6a5e'}"></span><div><b>${escapeHtml(r.name || 'Road')}</b><br><span class="small muted">${r.mode === 'outline' ? 'outline' : 'centerline'}${r.sidewalkSide && r.sidewalkSide !== 'none' ? ' &middot; sidewalk ' + r.sidewalkSide : ''}${r.locked ? ' &middot; locked' : ''}</span></div><span class="pill">${r.mode === 'centerline' ? fmt(r.widthMm || 0) + 'mm' : 'poly'}</span>`;
    } else if (type === 'tracks') {
      const t = normalizeTrack(raw);
      el.innerHTML = `<span class="swatch" style="background:${t.color || '#4b4438'}"></span><div><b>${escapeHtml(t.name || 'Track')}</b><br><span class="small muted">${(t.pointsPx || []).length} points${t.locked ? ' &middot; locked' : ''}</span></div><span class="pill">${fmt(t.gaugeMm || 9)}mm</span>`;
    } else if (type === 'trackAccessories') {
      const item = normalizeTrackAccessory(raw);
      el.innerHTML = `<span class="swatch" style="background:${item.color || trackAccessoryPreset(item.kind).color}"></span><div><b>${escapeHtml(item.name || trackAccessoryLabel(item.kind))}</b><br><span class="small muted">${escapeHtml(trackAccessoryLabel(item.kind))}${item.trackId ? ' &middot; track attached' : ''}${item.autoOrientToTrack ? ' &middot; auto-oriented' : ''}${item.locked ? ' &middot; locked' : ''}</span></div><span class="pill">marker</span>`;
    } else if (type === 'roadFeatures') {
      const f = normalizeRoadFeature(raw);
      const title = f.name || (f.kind === 'manhole' ? 'Manhole / Hatch' : 'Road marking');
      const metric = f.kind === 'manhole' ? (f.hatchShape === 'circle' ? fmt(f.diameterMm || 0) + 'mm' : `${fmt(f.widthMm || 0)}&times;${fmt(f.depthMm || 0)}`) : `${fmt(f.widthMm || 0)}&times;${fmt(f.depthMm || 0)}`;
      el.innerHTML = `<span class="swatch" style="background:${f.color || '#3a2b1e'}"></span><div><b>${escapeHtml(title)}</b><br><span class="small muted">${f.kind === 'manhole' ? 'hatch' : 'marking'}${f.locked ? ' &middot; locked' : ''}</span></div><span class="pill">${metric}</span>`;
    } else if (type === 'benchwork') {
      const bw = normalizeBenchworkOutline(raw);
      el.innerHTML = `<span class="swatch" style="background:${bw.color || '#2f6f4e'}"></span><div><b>${escapeHtml(bw.name || 'Benchwork Outline')}</b><br><span class="small muted">${(bw.pointsPx || []).length} points${bw.locked ? ' &middot; locked' : ''}</span></div><span class="pill">outline</span>`;
    } else if (type === 'streetlights') {
      const l = normalizeStreetlight(raw);
      el.innerHTML = `<span class="streetlight-swatch" style="background:${l.color || '#c84a3a'}"></span><div><b>${escapeHtml(l.name || 'Streetlight')}</b><br><span class="small muted">${l.mode === 'anchored' ? 'anchored &middot; ' : ''}${l.type || 'singleArm'}${l.locked ? ' &middot; locked' : ''}</span></div><span class="pill">${fmt(l.heightMm || 0)}mm</span>`;
    } else if (type === 'fabric') {
      const f = normalizeFabricRegion(raw);
      const generated = state.buildings.filter(b => b.fabricRegionId === f.id).length;
      el.innerHTML = `<span class="swatch" style="background:${f.color || '#7c5f3f'}"></span><div><b>${escapeHtml(f.name || 'Fabric Region')}</b><br><span class="small muted">${escapeHtml(fabricPresets[f.fabricType]?.label || f.fabricType || 'fabric')} &middot; ${generated} pad${generated === 1 ? '' : 's'}</span></div><span class="pill">${(f.polygon || []).length} pts</span>`;
    } else if (type === 'annotations') {
      const note = raw;
      el.innerHTML = `<span class="swatch" style="background:${note.color || '#6f4326'}"></span><div><b>${escapeHtml(note.name || 'Annotation')}</b><br><span class="small muted">${(note.points || []).length} points</span></div><span class="pill">note</span>`;
    } else if (type === 'siteObjects') {
      const obj = normalizeStlObject(raw);
      el.innerHTML = `<span class="swatch" style="background:${obj.color || '#496a78'}"></span><div><b>${escapeHtml(obj.name || 'STL Object')}</b><br><span class="small muted">${escapeHtml(obj.asset?.fileName || 'STL asset')}${obj.locked ? ' &middot; locked' : ''}${obj.hidden ? ' &middot; hidden' : ''}</span></div><span class="pill">${fmt(obj.widthMm * obj.scale)}&times;${fmt(obj.depthMm * obj.scale)}mm</span>`;
    }
    el.onclick = ev => selectSidebarObject(type, raw.id, ev);
    el.onkeydown = ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectSidebarObject(type, raw.id, ev);
      }
    };
    return el;
  }

  function sidebarObjectsForType(type) {
    const objects = modelSidebarObjectsForType(state, type);
    if (type === 'trackAccessories') {
      return objects.map(normalizeTrackAccessory).filter(item => trackAccessoryMatchesObjectFilter(item, trackAccessoryFilter));
    }
    return objects;
  }

  function trackAccessoryObjectFilterSummary(total, visible) {
    if (trackAccessoryFilter === 'all') return `${total} item${total === 1 ? '' : 's'}`;
    return `${visible} of ${total} item${total === 1 ? '' : 's'}`;
  }

  function closeTrackAccessoryFilterMenu() {
    const menu = $('trackItemFilterMenu');
    const wrap = $('trackItemFilterWrap');
    const btn = $('trackItemFilterBtn');
    menu?.classList.remove('open');
    wrap?.classList.remove('menuOpen');
    btn?.setAttribute('aria-expanded', 'false');
  }

  function bindTrackAccessoryFilterMenu() {
    const btn = $('trackItemFilterBtn');
    const menu = $('trackItemFilterMenu');
    const wrap = $('trackItemFilterWrap');
    if (!btn || !menu || !wrap) return;
    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      const open = !menu.classList.contains('open');
      closeTrackAccessoryFilterMenu();
      menu.classList.toggle('open', open);
      wrap.classList.toggle('menuOpen', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    menu.onclick = e => e.stopPropagation();
    menu.querySelectorAll('[data-track-item-filter]').forEach(option => {
      option.onclick = () => {
        trackAccessoryFilter = option.dataset.trackItemFilter || 'all';
        closeTrackAccessoryFilterMenu();
        renderObjectBrowser();
      };
    });
  }

  function renderObjectBrowser() {
    const box = $('objectBrowser');
    if (!box) return;
    const title = $('objectBrowserTitle');
    box.innerHTML = '';
    const activeTypes = sidebarObjectTypes();
    if (activeObjectType && !sidebarObjectTypeMeta(activeObjectType)?.count) activeObjectType = null;
    if (!activeObjectType) {
      if (title) title.textContent = 'Plan Objects';
      if (!activeTypes.length) {
        const empty = doc.createElement('div');
        empty.className = 'objectBrowserEmpty small muted';
        empty.textContent = 'No plan objects yet.';
        box.appendChild(empty);
        installHakoImportDropzone(box);
        return;
      }
      const grid = doc.createElement('div');
      grid.className = 'objectTypeGrid';
      activeTypes.forEach(type => {
        const card = doc.createElement('button');
        card.type = 'button';
        card.className = 'objectTypeCard';
        card.innerHTML = `<span class="objectTypeSwatch" style="background:${type.color}"></span><span class="objectTypeText"><b>${escapeHtml(type.label)}</b><span>${escapeHtml(type.hint)}</span></span><span class="pill">${type.count}</span>`;
        card.onclick = () => {
          activeObjectType = type.key;
          renderObjectBrowser();
        };
        grid.appendChild(card);
      });
      box.appendChild(grid);
      if (!state.buildings.length) installHakoImportDropzone(box);
      return;
    }
    const meta = sidebarObjectTypeMeta(activeObjectType);
    if (title) title.textContent = meta?.label || 'Plan Objects';
    const toolbar = doc.createElement('div');
    toolbar.className = 'objectBrowserToolbar';
    const objects = sidebarObjectsForType(activeObjectType);
    const totalCount = meta?.count || 0;
    const visibleCount = objects.length;
    const countText = activeObjectType === 'trackAccessories'
      ? trackAccessoryObjectFilterSummary(totalCount, visibleCount)
      : `${totalCount} item${totalCount === 1 ? '' : 's'}`;
    const filterControls = activeObjectType === 'trackAccessories' ? `
      <div id="trackItemFilterWrap" class="objectBrowserFilterWrap">
        <button id="trackItemFilterBtn" type="button" class="sidebarOverflowBtn objectBrowserFilterBtn ${trackAccessoryFilter === 'all' ? '' : 'active'}" aria-label="Filter track items" title="Filter track items" aria-haspopup="true" aria-expanded="false"><span data-icon="filter"></span></button>
        <div id="trackItemFilterMenu" class="dropdownMenu right objectBrowserFilterMenu" role="menu">
          ${trackAccessoryFilterCounts().map(filter => `<button type="button" role="menuitemradio" aria-checked="${filter.key === trackAccessoryFilter ? 'true' : 'false'}" class="${filter.key === trackAccessoryFilter ? 'active' : ''}" data-track-item-filter="${filter.key}"><span>${escapeHtml(filter.label)}</span><span class="pill">${filter.count}</span></button>`).join('')}
        </div>
      </div>` : '';
    toolbar.innerHTML = `<button id="objectBrowserBackBtn" type="button" class="sidebarBackBtn"><span data-icon="arrowLeft"></span><span>Back</span></button><div class="objectBrowserToolbarRight"><span class="small muted">${countText}</span>${filterControls}</div>`;
    box.appendChild(toolbar);
    const back = $('objectBrowserBackBtn');
    if (back) back.onclick = () => {
      closeTrackAccessoryFilterMenu();
      activeObjectType = null;
      renderObjectBrowser();
    };
    bindTrackAccessoryFilterMenu();
    if (!objects.length) {
      const empty = doc.createElement('div');
      empty.className = 'objectBrowserEmpty small muted';
      empty.textContent = activeObjectType === 'trackAccessories' && trackAccessoryFilter !== 'all' ? 'No track items match this filter.' : 'No items in this group.';
      box.appendChild(empty);
    } else {
      objects.forEach(obj => box.appendChild(makeObjectListRow(activeObjectType, obj)));
    }
    if (activeObjectType === 'buildings') installHakoImportDropzone(box);
    hydrateIcons(box);
  }

  function renderStreetlights() {
    renderObjectBrowser();
    const box = $('streetlightList');
    if (!box) return;
    if (!state.streetlights.length) {
      box.innerHTML = '<div class="small muted">No streetlights yet.</div>';
      return;
    }
    box.innerHTML = '';
    state.streetlights.forEach(raw => box.appendChild(makeObjectListRow('streetlights', raw)));
  }

  function renderList() {
    renderObjectBrowser();
    const box = $('buildingList');
    if (!box) return;
    box.innerHTML = '';
    if (!state.buildings.length) {
      const empty = doc.createElement('div');
      empty.className = 'small muted';
      empty.textContent = 'No building pads yet.';
      box.appendChild(empty);
    } else {
      state.buildings.forEach(raw => box.appendChild(makeObjectListRow('buildings', raw)));
    }
    installHakoImportDropzone(box);
  }

  return {
    renderObjectBrowser,
    renderList,
    renderStreetlights,
    setActiveType,
    selectSidebarObject,
  };
}
