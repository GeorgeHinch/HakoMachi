import { installHakoMachiFavicon } from '../shared/favicon.js';
import { installHakoMachiSeo } from '../shared/seo.js';
import * as data from './data/index.js';
import { coreModules } from './core/index.js';
import { uiModules } from './ui/index.js';
import { wingModules } from './wing/index.js';
import { previewModules } from './preview/index.js';

document.title = 'HakoMachi - Building Generator';
installHakoMachiFavicon();
installHakoMachiSeo({
  title: 'HakoMachi - Building Generator',
  description: 'Design Japanese-style laser-cut buildings for N gauge model railway layouts, with 1:150 parts ready for cutting and assembly. 日本型Nゲージレイアウト向けのレーザーカット建物を設計し、1:150スケールで組み立てられるパーツを作成できます。',
  path: 'building-generator.html',
});

window.HakoMachiBuildingGenerator = Object.freeze({
  ...(window.HakoMachiBuildingGenerator || {}),
  data,
  core: coreModules,
  ui: uiModules,
  wing: wingModules,
  preview: previewModules,
});

document.documentElement.dataset.buildingGeneratorModule = 'ready';
document.documentElement.dataset.buildingGeneratorDataKeys = String(Object.keys(data).length);
document.documentElement.dataset.buildingGeneratorCoreModules = String(Object.keys(coreModules).length);
document.documentElement.dataset.buildingGeneratorUiModules = String(Object.keys(uiModules).length);
document.documentElement.dataset.buildingGeneratorWingModules = String(Object.keys(wingModules).length);
document.documentElement.dataset.buildingGeneratorPreviewModules = String(Object.keys(previewModules).length);

window.dispatchEvent(new CustomEvent('hakomachi:building-generator-module-ready', {
  detail: window.HakoMachiBuildingGenerator,
}));
