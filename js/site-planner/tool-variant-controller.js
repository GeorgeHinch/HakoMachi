export function roadModeLabel(mode) {
  return mode === 'outline'
    ? 'Road Outline'
    : mode === 'manhole'
      ? 'Manhole / Hatch'
      : mode === 'marking'
        ? 'Road Marking'
        : 'Road Centerline';
}

export function createToolVariantController({
  state,
  getElement,
  doc = document,
  win = window,
  setIcon,
  hydrateIcons,
  toggleToolFlyout,
  hideToolFlyouts,
  setActiveTool,
  beginTrackAccessoryPlacement,
  beginCatenaryAutoSection,
  isCatenaryAutoSectionAction,
  updateWorkspaceModeUi,
}) {
  const $ = getElement;

  function updateRoadToolButton() {
    const btn = $('roadToolBtn');
    const icon = $('roadToolIcon');
    const label = $('roadToolLabel');
    const title = roadModeLabel(state.roadMode);
    if (label) label.textContent = title;
    if (btn) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    }
    if (icon) {
      icon.dataset.icon = state.roadMode === 'manhole'
        ? 'manhole'
        : state.roadMode === 'marking'
          ? 'roadMarking'
          : 'road';
      setIcon(icon, icon.dataset.icon);
    }
    doc.querySelectorAll('#roadToolMenu button').forEach(button => {
      button.classList.toggle('active', button.dataset.roadMode === state.roadMode);
    });
    updateWorkspaceModeUi();
  }

  function showRoadToolMenu(anchor = $('roadToolGroup') || $('roadToolBtn')) {
    toggleToolFlyout('roadToolMenu', anchor);
    updateRoadToolButton();
  }

  function updateStreetlightToolButton() {
    const icon = $('streetlightToolIcon');
    const label = $('streetlightToolLabel');
    const btn = $('streetlightToolBtn');
    const anchored = state.streetlightMode === 'anchored';
    const title = anchored ? 'Anchored Streetlight' : 'Streetlight';
    if (icon) {
      icon.dataset.icon = anchored ? 'lampAnchored' : 'lamp';
      setIcon(icon, icon.dataset.icon);
    }
    if (label) label.textContent = title;
    if (btn) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    }
    doc.querySelectorAll('#streetlightToolMenu button').forEach(button => {
      button.classList.toggle('active', button.dataset.streetlightMode === state.streetlightMode);
    });
  }

  function showStreetlightToolMenu(anchor = $('streetlightToolGroup') || $('streetlightToolBtn')) {
    toggleToolFlyout('streetlightToolMenu', anchor);
    updateStreetlightToolButton();
  }

  function trackSwitchToolTask() {
    return [
      'trackSwitchLeft',
      'trackSwitchRight',
      'trackSwitchTomix1279Left',
      'trackSwitchTomix1278Right',
    ].includes(state.trackTask) ? state.trackTask : 'trackSwitchLeft';
  }

  function updateTrackSwitchToolButton() {
    const task = trackSwitchToolTask();
    const options = {
      trackSwitchLeft: { icon: 'trackSwitchLeft', label: 'Left Switch', title: 'Left-hand track switch' },
      trackSwitchRight: { icon: 'trackSwitchRight', label: 'Right Switch', title: 'Right-hand track switch' },
      trackSwitchTomix1279Left: { icon: 'trackSwitchLeft', label: '1279 Curve', title: 'Tomix 1279 left curved switch' },
      trackSwitchTomix1278Right: { icon: 'trackSwitchRight', label: '1278 Curve', title: 'Tomix 1278 right curved switch' },
    };
    const option = options[task] || options.trackSwitchLeft;
    const icon = $('trackSwitchToolIcon');
    const label = $('trackSwitchToolLabel');
    const btn = $('trackSwitchToolBtn');
    if (icon) {
      icon.dataset.icon = option.icon;
      setIcon(icon, icon.dataset.icon);
    }
    if (label) label.textContent = option.label;
    if (btn) {
      btn.dataset.trackAction = task;
      btn.title = option.title;
      btn.setAttribute('aria-label', option.title);
      btn.classList.toggle('active', state.workspaceMode === 'track' && state.trackTask === task);
    }
    doc.querySelectorAll('#trackSwitchToolMenu button').forEach(button => {
      button.classList.toggle('active', button.dataset.trackSwitchKind === task);
    });
  }

  function showTrackSwitchToolMenu(anchor = $('trackSwitchToolGroup') || $('trackSwitchToolBtn')) {
    toggleToolFlyout('trackSwitchToolMenu', anchor);
    updateTrackSwitchToolButton();
  }

  function trackBufferToolTask() {
    return state.trackTask === 'trackBufferTomix1428Catenary'
      ? 'trackBufferTomix1428Catenary'
      : 'trackBufferTomix1428';
  }

  function updateTrackBufferToolButton() {
    const task = trackBufferToolTask();
    const terminal = task === 'trackBufferTomix1428Catenary';
    const icon = $('trackBufferToolIcon');
    const label = $('trackBufferToolLabel');
    const btn = $('trackBufferToolBtn');
    const title = terminal ? 'Tomix 1428 buffer with catenary terminal' : 'Tomix 1428 buffer stop';
    if (icon) {
      icon.dataset.icon = terminal ? 'trackBufferCatenary' : 'trackBuffer';
      setIcon(icon, icon.dataset.icon);
    }
    if (label) label.textContent = terminal ? 'Buffer + Terminal' : 'Buffer Stop';
    if (btn) {
      btn.dataset.trackAction = task;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.classList.toggle('active', state.workspaceMode === 'track' && state.trackTask === task);
    }
    doc.querySelectorAll('#trackBufferToolMenu button').forEach(button => {
      button.classList.toggle('active', button.dataset.trackBufferKind === task);
    });
  }

  function showTrackBufferToolMenu(anchor = $('trackBufferToolGroup') || $('trackBufferToolBtn')) {
    toggleToolFlyout('trackBufferToolMenu', anchor);
    updateTrackBufferToolButton();
  }

  function catenaryToolTask() {
    return state.trackTask === 'catenaryAutoSection'
      ? 'catenaryAutoSection'
      : state.trackTask === 'catenaryDoublePortal'
        ? 'catenaryDoublePortal'
        : 'catenarySingleSide';
  }

  function updateCatenaryToolButton() {
    const task = catenaryToolTask();
    const icon = $('catenaryToolIcon');
    const label = $('catenaryToolLabel');
    const btn = $('catenaryToolBtn');
    const portal = task === 'catenaryDoublePortal';
    const auto = task === 'catenaryAutoSection';
    const title = auto ? 'Auto catenary section' : portal ? 'Double-track catenary portal' : 'Single-side catenary pole';
    if (icon) {
      icon.dataset.icon = auto || portal ? 'catenaryPortal' : 'catenarySingle';
      setIcon(icon, icon.dataset.icon);
    }
    if (label) label.textContent = auto ? 'Auto Catenary' : portal ? 'Catenary Portal' : 'Catenary Pole';
    if (btn) {
      btn.dataset.trackAction = task;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.classList.toggle('active', state.workspaceMode === 'track' && state.trackTask === task);
    }
    doc.querySelectorAll('#catenaryToolMenu button').forEach(button => {
      button.classList.toggle('active', button.dataset.catenaryKind === task);
    });
  }

  function showCatenaryToolMenu(anchor = $('catenaryToolGroup') || $('catenaryToolBtn')) {
    toggleToolFlyout('catenaryToolMenu', anchor);
    updateCatenaryToolButton();
  }

  function installLongPressMenu(button, showMenu, anchor) {
    let pressTimer = null;
    button?.addEventListener('pointerdown', () => {
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => showMenu(anchor()), 420);
    });
    button?.addEventListener('pointerup', () => clearTimeout(pressTimer));
    button?.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    button?.addEventListener('pointercancel', () => clearTimeout(pressTimer));
    button?.addEventListener('contextmenu', event => {
      event.preventDefault();
      showMenu(anchor());
    });
  }

  function installToolVariantControls() {
    $('roadVariantBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showRoadToolMenu($('roadToolGroup') || $('roadVariantBtn'));
    });
    installLongPressMenu($('roadToolBtn'), showRoadToolMenu, () => $('roadToolGroup') || $('roadToolBtn'));
    doc.querySelectorAll('#roadToolMenu button').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        state.roadMode = button.dataset.roadMode || 'centerline';
        updateRoadToolButton();
        setActiveTool('road');
      };
    });

    $('streetlightVariantBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showStreetlightToolMenu($('streetlightToolGroup') || $('streetlightVariantBtn'));
    });
    installLongPressMenu($('streetlightToolBtn'), showStreetlightToolMenu, () => $('streetlightToolGroup') || $('streetlightToolBtn'));
    doc.querySelectorAll('#streetlightToolMenu button').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        state.streetlightMode = button.dataset.streetlightMode || 'free';
        updateStreetlightToolButton();
        setActiveTool('streetlight');
      };
    });

    $('trackSwitchVariantBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showTrackSwitchToolMenu($('trackSwitchToolGroup') || $('trackSwitchVariantBtn'));
    });
    installLongPressMenu($('trackSwitchToolBtn'), showTrackSwitchToolMenu, () => $('trackSwitchToolGroup') || $('trackSwitchToolBtn'));
    doc.querySelectorAll('#trackSwitchToolMenu button').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        beginTrackAccessoryPlacement(button.dataset.trackSwitchKind || 'trackSwitchLeft');
        hideToolFlyouts();
      };
    });

    $('trackBufferVariantBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showTrackBufferToolMenu($('trackBufferToolGroup') || $('trackBufferVariantBtn'));
    });
    installLongPressMenu($('trackBufferToolBtn'), showTrackBufferToolMenu, () => $('trackBufferToolGroup') || $('trackBufferToolBtn'));
    doc.querySelectorAll('#trackBufferToolMenu button').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        beginTrackAccessoryPlacement(button.dataset.trackBufferKind || 'trackBufferTomix1428');
        hideToolFlyouts();
      };
    });

    $('catenaryVariantBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showCatenaryToolMenu($('catenaryToolGroup') || $('catenaryVariantBtn'));
    });
    installLongPressMenu($('catenaryToolBtn'), showCatenaryToolMenu, () => $('catenaryToolGroup') || $('catenaryToolBtn'));
    doc.querySelectorAll('#catenaryToolMenu button').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        const action = button.dataset.catenaryKind || 'catenarySingleSide';
        if (isCatenaryAutoSectionAction(action)) beginCatenaryAutoSection();
        else beginTrackAccessoryPlacement(action);
        hideToolFlyouts();
      };
    });

    hydrateIcons();
    updateRoadToolButton();
    updateStreetlightToolButton();
    updateTrackSwitchToolButton();
    updateTrackBufferToolButton();
    updateCatenaryToolButton();
    doc.addEventListener('pointerdown', event => {
      if (!event.target.closest('.toolGroup') && !event.target.closest('.toolFlyout')) hideToolFlyouts();
    });
    win.addEventListener('resize', hideToolFlyouts);
    win.addEventListener('scroll', hideToolFlyouts, true);
  }

  return {
    installToolVariantControls,
    roadModeLabel,
    updateCatenaryToolButton,
    updateRoadToolButton,
    updateStreetlightToolButton,
    updateTrackBufferToolButton,
    updateTrackSwitchToolButton,
  };
}
