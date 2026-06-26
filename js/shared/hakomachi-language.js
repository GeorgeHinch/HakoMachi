'use strict';

export const HAKOMACHI_LANG_KEY = 'hakomachi.lang';
export const HAKOMACHI_LEGACY_LANG_KEY = 'hakomachi_lang';
export const HAKOMACHI_LANGUAGES = ['en', 'ja'];

export function isHakoMachiLanguage(lang) {
  return HAKOMACHI_LANGUAGES.includes(lang);
}

export function browserHakoMachiLanguage() {
  const languages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || 'en'];
  return languages.some(lang => /^ja\b/i.test(lang)) ? 'ja' : 'en';
}

export function storedHakoMachiLanguage() {
  try {
    const shared = localStorage.getItem(HAKOMACHI_LANG_KEY);
    if (isHakoMachiLanguage(shared)) return shared;
    const legacy = localStorage.getItem(HAKOMACHI_LEGACY_LANG_KEY);
    if (isHakoMachiLanguage(legacy)) return legacy;
  } catch(e) {}
  return null;
}

export function initialHakoMachiLanguage() {
  return storedHakoMachiLanguage() || browserHakoMachiLanguage();
}

export function saveHakoMachiLanguage(lang) {
  if (!isHakoMachiLanguage(lang)) return;
  try {
    localStorage.setItem(HAKOMACHI_LANG_KEY, lang);
    localStorage.setItem(HAKOMACHI_LEGACY_LANG_KEY, lang);
  } catch(e) {}
}
