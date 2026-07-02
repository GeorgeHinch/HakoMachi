const { expect, test } = require('@playwright/test');

test.describe('assembly illustration regressions', () => {
  test('current part callouts include placement, sheet, relationship, and note metadata', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.createAssemblyStepIllustrations === 'function');

    const result = await page.evaluate(() => {
      const plan = {
        source: { buildingName: 'Callout fixture' },
        parts: [
          {
            id: 'core_front',
            name: 'Front core wall',
            role: 'core_wall',
            area: 'front',
            scope: 'main',
            material: 'core',
            dimensionsMm: { width: 80, height: 42 },
            exportRef: { material: 'core', path: 'core/front.svg' },
          },
          {
            id: 'cladding_front',
            name: 'Front tile cladding',
            role: 'exterior_cladding',
            area: 'front',
            scope: 'main',
            material: 'tile',
            dimensionsMm: { width: 82, height: 44 },
            exportRef: { material: 'tile', path: 'tile/front-cladding.svg' },
            assemblyNote: 'Etched face points outward and aligns with the front core wall.',
          },
        ],
        relationships: [
          {
            id: 'rel_cladding_front',
            type: 'cladding-to-core',
            fromPartId: 'cladding_front',
            toPartId: 'core_front',
            notes: 'Cladding role and wall area map this panel back to a core wall.',
          },
        ],
      };
      const sequence = {
        steps: [
          {
            id: 'step_core',
            order: 1,
            phase: 'exterior-core',
            title: 'Core wall',
            partIds: ['core_front'],
          },
          {
            id: 'step_cladding',
            order: 2,
            phase: 'cladding',
            title: 'Add front cladding',
            partIds: ['cladding_front'],
            relationshipIds: ['rel_cladding_front'],
          },
        ],
      };
      return window.createAssemblyStepIllustrations(plan, sequence).steps[1];
    });

    expect(result.callouts).toHaveLength(1);
    expect(result.callouts[0].detailLines).toEqual(expect.arrayContaining([
      'Front face',
      'Sheet: tile',
    ]));
    expect(result.callouts[0].detailLines.join('\n')).toContain('Cladding To Core');
    expect(result.callouts[0].detailLines.join('\n')).toContain('Etched face points outward');
    expect(result.attachmentMarkers).toHaveLength(1);
    expect(result.attachmentMarkers[0]).toMatchObject({
      relationshipId: 'rel_cladding_front',
      currentPartId: 'cladding_front',
      targetPartId: 'core_front',
      label: 'Attach to Front core wall',
    });
    expect(result.svg).toContain('Front face');
    expect(result.svg).toContain('Sheet: tile');
    expect(result.svg).toContain('Attach to Front core wall');
  });
});
