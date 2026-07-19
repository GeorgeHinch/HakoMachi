const { expect, test } = require('@playwright/test');

test.describe('Site Planner Hako import drop UI', () => {
  test('sidebar import dropzone routes files to new or selected building imports', async ({ page }) => {
    await page.goto('/index.html');

    const result = await page.evaluate(async () => {
      const { createHakoDropController } = await import('/js/site-planner/hako-drop-ui.js');
      const createDropEvent = name => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File(['{}'], name, { type: 'application/json' }));
        return new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      };
      const runCase = selectedBuilding => {
        const box = document.createElement('div');
        document.body.appendChild(box);
        const calls = { import: [], attach: [] };
        const controller = createHakoDropController({
          document,
          selected: () => selectedBuilding ? { id: 'building_1' } : null,
          currentSelectedBuildingIds: () => selectedBuilding ? ['building_1'] : [],
          importHakoAsBuilding: file => calls.import.push(file.name),
          importStlAsSiteObject: () => {},
          attachHakoFileToSelectedBuilding: (file, opts) => calls.attach.push({ name: file.name, source: opts.source }),
          failImportProgress: () => {},
        });
        controller.installHakoImportDropzone(box);
        box.querySelector('#importHakoAsBuildingDropzone').dispatchEvent(createDropEvent(selectedBuilding ? 'attached.hako' : 'new.hako'));
        box.remove();
        return calls;
      };

      return { unselected: runCase(false), selected: runCase(true) };
    });

    expect(result.unselected).toEqual({ import: ['new.hako'], attach: [] });
    expect(result.selected).toEqual({ import: [], attach: [{ name: 'attached.hako', source: 'selected-building-drop' }] });
  });
});
