# HakoMachi i18n Checks

Use one shared checker for page translation coverage:

```bash
node tools/i18n/check.js
node tools/i18n/check.js --page=landing
```

Runtime translation dictionaries live under `js/i18n/` and use page names:

```text
js/i18n/landing.js
```

Checker configuration lives in `tools/i18n/config.json`. Add a page entry there
instead of creating a new page-specific audit script.

The checker verifies:

- every `data-i18n` key used by a page exists in each configured language
- all configured languages expose the same translation keys
- common visible text tags are marked with `data-i18n` or `data-i18n-ignore`
- JavaScript i18n function calls use keys that exist in each language
