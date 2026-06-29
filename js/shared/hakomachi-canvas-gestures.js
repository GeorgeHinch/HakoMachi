'use strict';

function eventClientPoint(e, fallbackEl) {
  if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) return { x: e.clientX, y: e.clientY };
  const r = fallbackEl.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pointInElement(el, p) {
  const r = el.getBoundingClientRect();
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

function preventBrowserViewportZoom(e, stopPropagation) {
  if (e.cancelable !== false) e.preventDefault();
  if (stopPropagation) e.stopPropagation();
}

function prepareCanvasSurface(surface, canvas) {
  if (surface) {
    surface.style.overscrollBehavior = 'contain';
    surface.style.touchAction = 'none';
  }
  if (canvas) canvas.style.touchAction = 'none';
}

export function installCanvasGestureBoundary(options) {
  const surface = options && (options.surface || options.canvas);
  if (!surface) return null;
  const canvas = options.canvas || surface;
  prepareCanvasSurface(surface, canvas);

  let gestureState = null;

  const shouldHandle = (e, p) => {
    if (!pointInElement(surface, p)) return false;
    return !options.shouldHandle || options.shouldHandle(e, p) !== false;
  };

  const onWheel = e => {
    if (!e.ctrlKey) return;
    const p = eventClientPoint(e, surface);
    if (!shouldHandle(e, p)) return;
    const handled = options.onPinchWheel ? options.onPinchWheel(e, p) !== false : false;
    preventBrowserViewportZoom(e, handled);
  };

  const onGestureStart = e => {
    const p = eventClientPoint(e, surface);
    if (!shouldHandle(e, p)) return;
    gestureState = options.onGestureStart ? options.onGestureStart(e, p) : true;
    preventBrowserViewportZoom(e, !!options.stopGesturePropagation);
  };

  const onGestureChange = e => {
    const p = eventClientPoint(e, surface);
    if (!gestureState || !shouldHandle(e, p)) return;
    if (options.onGestureChange) options.onGestureChange(e, p, gestureState);
    preventBrowserViewportZoom(e, !!options.stopGesturePropagation);
  };

  const onGestureEnd = e => {
    if (!gestureState) return;
    const endedState = gestureState;
    gestureState = null;
    if (options.onGestureEnd) options.onGestureEnd(e, endedState);
    preventBrowserViewportZoom(e, !!options.stopGesturePropagation);
  };

  surface.addEventListener('wheel', onWheel, { passive: false, capture: true });
  surface.addEventListener('gesturestart', onGestureStart, { passive: false, capture: true });
  surface.addEventListener('gesturechange', onGestureChange, { passive: false, capture: true });
  surface.addEventListener('gestureend', onGestureEnd, { passive: false, capture: true });

  return {
    destroy() {
      surface.removeEventListener('wheel', onWheel, { capture: true });
      surface.removeEventListener('gesturestart', onGestureStart, { capture: true });
      surface.removeEventListener('gesturechange', onGestureChange, { capture: true });
      surface.removeEventListener('gestureend', onGestureEnd, { capture: true });
    }
  };
}

export function installThreeRenderCanvas(surface, canvas) {
  return installCanvasGestureBoundary({ surface, canvas });
}
