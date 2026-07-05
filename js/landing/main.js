'use strict';

import {
  initialHakoMachiLanguage,
  saveHakoMachiLanguage,
} from '../shared/hakomachi-language.js';
import { initHakoMachiLogo } from '../shared/hakomachi-logo.js';
import { landingTools } from '../shared/hakomachi-tool-registry.js';
import { LANDING_TRANSLATIONS } from '../i18n/landing.js';

const languageSelect = document.getElementById('languageSelect');
const toolsNav = document.querySelector('.landing-tools');
const utilityGrid = document.querySelector('.landing-utility-grid');

const TITLE_I18N_KEYS = Object.freeze({
  sitePlanner: 'sitePlannerTitle',
  buildingGenerator: 'buildingGeneratorTitle',
  industrialShelfGenerator: 'industrialShelfTitle',
  materialManager: 'materialManagerTitle',
  safetyRailingGenerator: 'safetyRailingTitle',
  woodenCrateGenerator: 'woodenCrateTitle',
});

const DESCRIPTION_I18N_KEYS = Object.freeze({
  sitePlanner: 'sitePlannerDescription',
  buildingGenerator: 'buildingGeneratorDescription',
  industrialShelfGenerator: 'industrialShelfDescription',
  materialManager: 'materialManagerDescription',
  safetyRailingGenerator: 'safetyRailingDescription',
  woodenCrateGenerator: 'woodenCrateDescription',
});

function cardForTool(tool, headingLevel = 2) {
  const link = document.createElement('a');
  link.className = tool.group === 'utility'
    ? 'hako-card landing-tool-card landing-utility-card'
    : 'hako-card landing-tool-card';
  link.href = tool.path;
  link.dataset.toolKey = tool.key;

  const heading = document.createElement(`h${headingLevel}`);
  heading.className = 'landing-tool-title';
  const titleKey = TITLE_I18N_KEYS[tool.key];
  if (titleKey) heading.dataset.i18n = titleKey;
  heading.textContent = tool.label;

  const description = document.createElement('p');
  description.className = 'small';
  const descriptionKey = DESCRIPTION_I18N_KEYS[tool.key];
  if (descriptionKey) description.dataset.i18n = descriptionKey;
  description.textContent = tool.description;

  link.append(heading, description);
  return link;
}

function renderLandingTools() {
  if (toolsNav) {
    toolsNav.replaceChildren(...landingTools('primary').map(tool => cardForTool(tool, 2)));
  }
  if (utilityGrid) {
    utilityGrid.replaceChildren(...landingTools('utility').map(tool => cardForTool(tool, 3)));
  }
}

function applyLandingLanguage(lang) {
  const dict = LANDING_TRANSLATIONS[lang] || LANDING_TRANSLATIONS.en;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (dict[key]) node.textContent = dict[key];
  });
  if (languageSelect) languageSelect.setAttribute('aria-label', dict.languageLabel);
  if (toolsNav) toolsNav.setAttribute('aria-label', dict.toolsLabel);
}

function initLandingLanguage() {
  if (!languageSelect) return;
  const lang = initialHakoMachiLanguage();
  languageSelect.value = lang;
  renderLandingTools();
  applyLandingLanguage(lang);
  languageSelect.addEventListener('change', () => {
    saveHakoMachiLanguage(languageSelect.value);
    applyLandingLanguage(languageSelect.value);
  });
}

initHakoMachiLogo();
initLandingLanguage();
