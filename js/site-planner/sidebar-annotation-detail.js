export function renderAnnotationDetail({ annotation, panel, getElement, deleteSelectedAnnotation }) {
  const points = annotation.points || [];
  panel.innerHTML = `<b>Annotation selected</b><br><span class="small muted">${points.length} points</span><div class="buttons" style="margin-top:8px"><button id="delNoteB" class="danger">Delete Annotation</button></div>`;
  const deleteButton = getElement('delNoteB');
  if (deleteButton) deleteButton.onclick = deleteSelectedAnnotation;
}
