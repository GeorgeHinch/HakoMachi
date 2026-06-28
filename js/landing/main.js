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
  title: 'HakoMachi 箱街 - Japanese N Gauge Laser-Cut Building Generator',
  description: 'Generate laser-cut buildings for Japanese N gauge model railways. HakoMachi creates 1:150 buildings in styles suited for streets, shops, homes, stations, and industrial scenes. 日本型Nゲージ鉄道模型向けに、街並み、商店、住宅、駅前建物、工場などに使える1:150のレーザーカット建物を作成できます。',
  path: '',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HakoMachi 箱街',
    url: 'https://georgehinch.github.io/HakoMachi/',
    inLanguage: ['en', 'ja'],
    description: 'Generate laser-cut buildings for Japanese N gauge model railways. 日本型Nゲージ鉄道模型向けに1:150のレーザーカット建物を作成できます。',
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
