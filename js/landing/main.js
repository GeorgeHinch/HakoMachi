'use strict';

import { installHakoMachiFavicon } from '../shared/favicon.js';
import { installHakoMachiSeo } from '../shared/seo.js';
import {
  initialHakoMachiLanguage,
  saveHakoMachiLanguage,
} from '../shared/hakomachi-language.js';
import { LANDING_TRANSLATIONS } from '../i18n/landing.js';

installHakoMachiFavicon();
installHakoMachiSeo({
  title: 'HakoMachi - Japanese N-Scale Model Railway Building Tools',
  description: 'Plan Japanese N-scale streetscapes and generate laser-cut 1:150 model railway buildings, utility parts, railings, crates, and scenic details in the browser.',
  path: '',
  keywords: ['HakoMachi', 'N scale buildings', 'Japanese model railway', 'laser cut buildings', '1:150 scale', 'model railroad scenery'],
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HakoMachi',
    url: 'https://georgehinch.github.io/HakoMachi/',
    description: 'Browser-based planning and laser-cut design tools for Japanese N-scale model railway layouts.',
  },
});

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
