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
            assemblyNote: 'Surface-fit insert: etched face points outward, align it with the front core wall, then glue after the tabs and slots dry fit.',
          },
        ],
        relationships: [
          {
            id: 'rel_cladding_front',
            type: 'cladding-to-core',
            fromPartId: 'cladding_front',
            toPartId: 'core_front',
            notes: 'Cladding role and wall area map this surface-fit panel back to a core wall.',
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
    expect(result.callouts[0].detailLines.join('\n')).toContain('Surface-fit insert');
    expect(result.attachmentMarkers).toHaveLength(1);
    expect(result.attachmentMarkers[0]).toMatchObject({
      relationshipId: 'rel_cladding_front',
      currentPartId: 'cladding_front',
      targetPartId: 'core_front',
      label: 'Attach to Front core wall',
      joineryCues: ['Tabs/slots', 'Glue', 'Surface-fit'],
    });
    expect(result.svg).toContain('Front face');
    expect(result.svg).toContain('Sheet: tile');
    expect(result.svg).toContain('Attach to Front core wall');
    expect(result.svg).toContain('Tabs/slots');
    expect(result.svg).toContain('Glue');
    expect(result.svg).toContain('Surface-fit');
  });

  test('complex winged fixtures keep stable cameras and render relationship cues', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.createAssemblyStepIllustrations === 'function');

    const result = await page.evaluate(() => {
      const part = (id, name, role, area, scope = 'main', wingIndex = null, assemblyNote = '') => ({
        id,
        name,
        role,
        area,
        scope,
        wingIndex,
        material: role.includes('cladding') ? 'tile' : 'core',
        dimensionsMm: { width: 86, height: role.includes('floor') || role.includes('roof') ? 54 : 42 },
        exportRef: { material: role.includes('cladding') ? 'tile' : 'core', path: `${role.includes('cladding') ? 'tile' : 'core'}/${id}.svg` },
        assemblyNote,
      });
      const plan = {
        source: { buildingName: 'Winged assembly fixture' },
        parts: [
          part('main_floor', 'Main floor plate', 'floor_panel', 'floor', 'main', null, 'Floor tabs locate the exterior wall slots.'),
          part('main_front_wall', 'Main front wall', 'core_wall', 'front'),
          part('wing_floor', 'Wing floor plate', 'floor_panel', 'floor', 'wing', 0),
          part('main_roof', 'Main roof panel', 'roof_panel', 'roof'),
          part('wing_front_cladding', 'Wing front cladding', 'exterior_cladding', 'front', 'wing', 0, 'Etch alignment faces outward before glue.'),
        ],
        relationships: [
          { id: 'rel_floor_wall', type: 'floor-to-wall', fromPartId: 'main_floor', toPartId: 'main_front_wall', notes: 'Floor/inter-floor tabs or slots relate this panel to the block core walls.' },
          { id: 'rel_wing_main', type: 'wing-to-main', fromPartId: 'wing_floor', toPartId: 'main_floor', notes: 'Wing 1 attaches to the main block.' },
          { id: 'rel_wall_roof', type: 'wall-to-roof', fromPartId: 'main_front_wall', toPartId: 'main_roof', notes: 'Roof panel sits on the same block core wall.' },
          { id: 'rel_wing_cladding', type: 'cladding-to-core', fromPartId: 'wing_front_cladding', toPartId: 'main_front_wall', notes: 'Surface-fit cladding glues to the related wall after alignment.' },
        ],
      };
      const sequence = {
        steps: [
          { id: 'step_floor', order: 1, phase: 'base-floors', title: 'Base floor', partIds: ['main_floor'] },
          { id: 'step_wall', order: 2, phase: 'exterior-core', title: 'Front wall', partIds: ['main_front_wall'], relationshipIds: ['rel_floor_wall'] },
          { id: 'step_wing', order: 3, phase: 'wing-connections', title: 'Wing floor', partIds: ['wing_floor'], relationshipIds: ['rel_wing_main'] },
          { id: 'step_roof', order: 4, phase: 'roof-trusses', title: 'Roof panel', partIds: ['main_roof'], relationshipIds: ['rel_wall_roof'] },
          { id: 'step_cladding', order: 5, phase: 'cladding', title: 'Wing cladding', partIds: ['wing_front_cladding'], relationshipIds: ['rel_wing_cladding'] },
        ],
      };
      return window.createAssemblyStepIllustrations(plan, sequence);
    });

    expect(result.steps).toHaveLength(5);
    expect(new Set(result.steps.map(step => step.camera.viewBox))).toEqual(new Set(['0 0 720 420']));
    expect(new Set(result.steps.map(step => step.camera.orientation))).toEqual(new Set(['front-top-stable']));

    const wingStep = result.steps.find(step => step.stepId === 'step_wing');
    expect(wingStep.attachmentMarkers[0]).toMatchObject({
      relationshipId: 'rel_wing_main',
      joineryCues: ['Tabs/slots', 'Wing join'],
    });
    expect(wingStep.svg).toContain('Wing join');

    const roofStep = result.steps.find(step => step.stepId === 'step_roof');
    expect(roofStep.attachmentMarkers[0]).toMatchObject({
      relationshipId: 'rel_wall_roof',
      joineryCues: ['Roof seating'],
    });
    expect(roofStep.svg).toContain('Roof seating');

    const claddingStep = result.steps.find(step => step.stepId === 'step_cladding');
    expect(claddingStep.callouts[0].detailLines).toEqual(expect.arrayContaining([
      'Front face · Wing 1',
      'Sheet: tile',
    ]));
    expect(claddingStep.attachmentMarkers[0].joineryCues).toEqual(['Glue', 'Surface-fit', 'Etch alignment']);
    expect(claddingStep.svg).toContain('Surface-fit');
  });
});
