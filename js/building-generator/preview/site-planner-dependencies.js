import * as data from '../data/index.js';
import { coreModules } from '../core/index.js';
import * as materialRegistry from '../core/material-registry.js';
import * as stlExportConfig from '../core/stl-export-config.js';
import { wingModules } from '../wing/index.js';

function publishModule(moduleNamespace) {
  for (const [name, value] of Object.entries(moduleNamespace || {})) {
    if (value !== undefined && globalThis[name] === undefined) {
      globalThis[name] = value;
    }
  }
}

publishModule(data);
for (const moduleNamespace of Object.values(coreModules)) publishModule(moduleNamespace);
publishModule(materialRegistry);
publishModule(stlExportConfig);
for (const moduleNamespace of Object.values(wingModules)) publishModule(moduleNamespace);

document.documentElement.dataset.hakomachiPreview3dDependencies = 'ready';
