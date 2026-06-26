'use strict';

import {
  initialHakoMachiLanguage,
  saveHakoMachiLanguage,
} from '../shared/hakomachi-language.js';
import { LANDING_TRANSLATIONS } from './translations.js';

const languageSelect = document.getElementById('languageSelect');
const toolsNav = document.querySelector('.landing-tools');

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
  applyLandingLanguage(lang);
  languageSelect.addEventListener('change', () => {
    saveHakoMachiLanguage(languageSelect.value);
    applyLandingLanguage(languageSelect.value);
  });
}

initLandingLanguage();
