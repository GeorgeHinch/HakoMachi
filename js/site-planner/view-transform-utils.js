export function createViewTransformController({canvas, state, clamp, draw}){
  function screenToWorld(eventLike){
    const rect=canvas.getBoundingClientRect();
    return {
      x:(eventLike.clientX-rect.left-state.view.x)/state.view.scale,
      y:(eventLike.clientY-rect.top-state.view.y)/state.view.scale,
    };
  }

  function worldToScreen(point){
    return {
      x:point.x*state.view.scale+state.view.x,
      y:point.y*state.view.scale+state.view.y,
    };
  }

  function setCanvasZoomAtClientPoint(clientX,clientY,nextScale){
    const rect=canvas.getBoundingClientRect();
    const before={
      x:(clientX-rect.left-state.view.x)/state.view.scale,
      y:(clientY-rect.top-state.view.y)/state.view.scale,
    };
    const mouse={x:clientX-rect.left,y:clientY-rect.top};
    state.view.scale=clamp(nextScale,.05,20);
    state.view.x=mouse.x-before.x*state.view.scale;
    state.view.y=mouse.y-before.y*state.view.scale;
    draw();
  }

  function zoomCanvasAtClientPoint(clientX,clientY,deltaY){
    const factor=deltaY<0?1.1:.9;
    setCanvasZoomAtClientPoint(clientX,clientY,state.view.scale*factor);
  }

  return {
    screenToWorld,
    worldToScreen,
    setCanvasZoomAtClientPoint,
    zoomCanvasAtClientPoint,
  };
}
