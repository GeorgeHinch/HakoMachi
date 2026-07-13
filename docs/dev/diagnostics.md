# HakoMachi Diagnostics

Use `createHakoMachiLogger(scope)` from `js/shared/hakomachi-diagnostics.js`
instead of direct `console.warn` / `console.error` calls in app code.

Warnings and errors are visible by default. To silence routine diagnostics while
testing, run:

```js
localStorage.setItem('hakomachiDiagnostics', 'silent')
```

To enable debug/info diagnostics, run:

```js
localStorage.setItem('hakomachiDiagnostics', 'debug')
```

You can also add `?hmDiagnostics=debug` or `?hmDiagnostics=silent` to the page
URL for one browser session. Persistence save/load timing has a separate opt-in
flag documented in `docs/github-datastore.md`.
