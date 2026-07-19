export function createSidebarInputBinder({ getElement, afterInput }) {
  function bindInput(id, update) {
    const element = getElement(id);
    if (!element) return;
    element.oninput = () => {
      update(element.type === 'checkbox' ? element.checked : element.value);
      afterInput();
    };
  }

  return { bindInput };
}
