export function createContextMenuController(deps) {
  const {
    state,
    getElement,
    wrap,
    clamp,
    clearBuildingSelection,
    renderList,
    renderStreetlights,
    renderSelected,
    updateHandoff,
    draw,
    syncAll,
    markDirty,
    hitAnnotation,
    selectedStreetlight,
    hitStreetlight,
    selectedStlObject,
    hitStlObject,
    selected,
    hitTest,
    handleAt,
    duplicateStreetlight,
    transformedRect,
    syncBuildingMetrics,
  } = deps;

  function clearLongPress() {
    if (state.longPress?.timer) clearTimeout(state.longPress.timer);
    state.longPress = null;
  }

  function hideContextMenu() {
    const menu = getElement('contextMenu');
    if (menu) menu.style.display = 'none';
    state.contextTarget = null;
  }

  function positionMenu(menu, screenX, screenY, fallbackWidth, fallbackHeight) {
    const wrapRect = wrap.getBoundingClientRect();
    const mw = menu.offsetWidth || fallbackWidth;
    const mh = menu.offsetHeight || fallbackHeight;
    menu.style.left = clamp(screenX - wrapRect.left, 8, wrapRect.width - mw - 8) + 'px';
    menu.style.top = clamp(screenY - wrapRect.top, 8, wrapRect.height - mh - 8) + 'px';
  }

  function bindActions(menu) {
    menu.querySelectorAll('button').forEach(btn => { btn.onclick = () => handleContextAction(btn.dataset.action); });
  }

  function showContextMenu(screenX, screenY, target) {
    const menu = getElement('contextMenu');
    if (!menu) return;
    state.contextTarget = target;
    if (target?.streetlight) {
      state.selectedStreetlightId = target.streetlight.id;
      clearBuildingSelection();
      state.selectedAnnotationId = null;
      menu.innerHTML = `<button data-action="duplicateStreetlight">Duplicate Streetlight</button><button data-action="lockStreetlight">${target.streetlight.locked ? 'Unlock' : 'Lock'} Streetlight</button><button data-action="deleteStreetlight" class="dangerItem">Delete Streetlight</button>`;
      bindActions(menu);
      menu.style.display = 'block';
      positionMenu(menu, screenX, screenY, 210, 120);
      renderList();
      renderStreetlights();
      renderSelected();
      draw();
      return;
    }
    if (target?.annotation) {
      menu.innerHTML = `<button data-action="deleteAnnotation" class="dangerItem">Delete Annotation</button>`;
      bindActions(menu);
      menu.style.display = 'block';
      positionMenu(menu, screenX, screenY, 190, 80);
      return;
    }
    if (target?.stlObject) {
      clearBuildingSelection();
      state.selectedRoadId = null;
      state.selectedRoadFeatureId = null;
      state.selectedTrackId = null;
      state.selectedBenchworkId = null;
      state.selectedStreetlightId = null;
      state.selectedFabricId = null;
      state.selectedAnnotationId = null;
      state.selectedStlObjectId = target.stlObject.id;
      menu.innerHTML = `<button data-action="lockStlObject">${target.stlObject.locked ? 'Unlock' : 'Lock'} Site Object</button><button data-action="deleteStlObject" class="dangerItem">Delete Site Object</button>`;
      bindActions(menu);
      menu.style.display = 'block';
      positionMenu(menu, screenX, screenY, 210, 100);
      renderList();
      renderSelected();
      draw();
      return;
    }
    const b = target?.building;
    const hasPolyPoint = target?.handle?.type === 'polyPoint';
    menu.innerHTML = `
      <button data-action="lock">${b?.locked ? 'Unlock Pad' : 'Lock Pad'}</button>
      <button data-action="convert" ${b?.padType === 'rect' ? '' : 'disabled'}>Convert Rect to Polygon</button>
      <button data-action="deletePoint" ${hasPolyPoint ? '' : 'disabled'}>Delete Point</button>
      <button data-action="deletePad" class="dangerItem">Delete Pad</button>
    `;
    bindActions(menu);
    menu.style.display = 'block';
    positionMenu(menu, screenX, screenY, 190, 150);
  }

  function contextTargetAt(worldPoint, pointerType = 'pen') {
    const note = hitAnnotation(worldPoint, pointerType);
    if (note) return { annotation: note, point: worldPoint };
    const streetlight = selectedStreetlight() || hitStreetlight(worldPoint, pointerType);
    if (streetlight) return { streetlight, point: worldPoint };
    const stlObject = selectedStlObject() || hitStlObject(worldPoint, pointerType);
    if (stlObject) return { stlObject, point: worldPoint };
    const building = selected() || hitTest(worldPoint);
    if (!building) return null;
    const handle = handleAt(worldPoint, building, pointerType);
    return { building, handle, point: worldPoint };
  }

  function convertRectToPoly(b) {
    const pts = transformedRect(b);
    b.padType = 'polygon';
    b.pointsPx = pts;
    b.rotationDeg = 0;
    delete b.widthPx;
    delete b.depthPx;
    delete b.widthMm;
    delete b.depthMm;
    syncBuildingMetrics(b);
  }

  function handleContextAction(action) {
    const target = state.contextTarget;
    const building = target?.building;
    if (action === 'deleteStreetlight' && target?.streetlight) {
      state.streetlights = state.streetlights.filter(l => l.id !== target.streetlight.id);
      if (state.selectedStreetlightId === target.streetlight.id) state.selectedStreetlightId = null;
      hideContextMenu();
      syncAll();
      return;
    }
    if (action === 'lockStreetlight' && target?.streetlight) {
      target.streetlight.locked = !target.streetlight.locked;
      hideContextMenu();
      syncAll();
      return;
    }
    if (action === 'duplicateStreetlight' && target?.streetlight) {
      duplicateStreetlight(target.streetlight);
      hideContextMenu();
      syncAll();
      return;
    }
    if (action === 'deleteAnnotation' && target?.annotation) {
      state.annotations = state.annotations.filter(st => st.id !== target.annotation.id);
      if (state.selectedAnnotationId === target.annotation.id) state.selectedAnnotationId = null;
      hideContextMenu();
      renderSelected();
      draw();
      markDirty('annotation deleted');
      return;
    }
    if (action === 'lockStlObject' && target?.stlObject) {
      target.stlObject.locked = !target.stlObject.locked;
      hideContextMenu();
      syncAll();
      return;
    }
    if (action === 'deleteStlObject' && target?.stlObject) {
      state.stlObjects = (state.stlObjects || []).filter(obj => obj.id !== target.stlObject.id);
      if (state.selectedStlObjectId === target.stlObject.id) state.selectedStlObjectId = null;
      hideContextMenu();
      syncAll();
      return;
    }
    if (!building) return hideContextMenu();
    if (action === 'lock') building.locked = !building.locked;
    if (action === 'convert' && building.padType === 'rect') convertRectToPoly(building);
    if (action === 'deletePoint' && building.padType === 'polygon' && target.handle?.type === 'polyPoint' && building.pointsPx.length > 3) {
      building.pointsPx.splice(target.handle.index, 1);
      syncBuildingMetrics(building);
    }
    if (action === 'deletePad') {
      state.buildings = state.buildings.filter(x => x.id !== building.id);
      if (state.selectedId === building.id) state.selectedId = null;
    }
    hideContextMenu();
    syncAll();
  }

  function beginLongPress(e, worldPoint) {
    clearLongPress();
    if (e.pointerType === 'mouse') return;
    const target = contextTargetAt(worldPoint, e.pointerType);
    if (!target) return;
    state.longPress = {
      pointerId: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      world: worldPoint,
      timer: setTimeout(() => {
        if (!state.drag || state.drag.pointerId === e.pointerId) {
          state.drag = null;
          if (target.stlObject) state.selectedStlObjectId = target.stlObject.id;
          else if (target.building) state.selectedId = target.building.id;
          else if (target.annotation) state.selectedAnnotationId = target.annotation.id;
          else if (target.streetlight) state.selectedStreetlightId = target.streetlight.id;
          renderList();
          renderSelected();
          updateHandoff();
          showContextMenu(e.clientX, e.clientY, target);
          draw();
        }
      }, 620),
    };
  }

  function moveCancelsLongPress(e) {
    if (!state.longPress || state.longPress.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - state.longPress.start.x, e.clientY - state.longPress.start.y) > 8) clearLongPress();
  }

  function showContextMenuForPointerEvent(e, worldPoint) {
    const target = contextTargetAt(worldPoint, 'mouse');
    if (target?.streetlight || target?.stlObject) {
      showContextMenu(e.clientX, e.clientY, target);
      return true;
    }
    if (target?.annotation) {
      state.selectedAnnotationId = target.annotation.id;
      state.selectedId = null;
      state.selectedStlObjectId = null;
      state.selectedFabricId = null;
      renderList();
      renderSelected();
      updateHandoff();
      showContextMenu(e.clientX, e.clientY, target);
      draw();
      return true;
    }
    if (target?.building) {
      state.selectedId = target.building.id;
      state.selectedStlObjectId = null;
      state.selectedFabricId = null;
      state.selectedAnnotationId = null;
      renderList();
      renderSelected();
      updateHandoff();
      showContextMenu(e.clientX, e.clientY, target);
      draw();
      return true;
    }
    return false;
  }

  return {
    clearLongPress,
    hideContextMenu,
    showContextMenu,
    contextTargetAt,
    handleContextAction,
    beginLongPress,
    moveCancelsLongPress,
    showContextMenuForPointerEvent,
  };
}
