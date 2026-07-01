# HakoMachi Agent Notes

## Verification Tools

- Use Playwright for browser and visual checks. On Windows, if `playwright` is not visible on PATH, try `C:\Users\georg\AppData\Roaming\npm\playwright.cmd` before treating Playwright as unavailable.
- For GitHub issues, pull requests, Actions, and commit status checks, use the authenticated GitHub CLI (`gh`) when it covers the workflow. If `gh` is unexpectedly not visible on PATH, try `C:\Users\georg\AppData\Roaming\npm\gh.cmd` or `C:\Users\georg\AppData\Local\Microsoft\WinGet\Links\gh.exe` before treating GitHub CLI as unavailable.
- Use the installed GitHub plugin/connector when connector-native access is better for the task or when a chat needs GitHub tools that are not available through `gh`. If GitHub connector tools are not visible in the current chat, run tool discovery for GitHub before falling back.
- For local JavaScript validation, run `node --check` on changed JS files and use `node tools\runtime_check.js` for the building generator runtime when relevant.
