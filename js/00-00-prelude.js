import * as githubData from './shared/github-data.js';

/* =====================================================================
   HAKOMACHI PRIVATE GITHUB DATA SAVE
   ---------------------------------------------------------------------
   Local-first browser implementation for saving HakoMachi building configs
   into a user-owned private GitHub data repository. This keeps GitHub Pages
   static while making the saved building/footprint library available from
   any device that has the same repo/token settings.
   ===================================================================== */

(function installHakoMachiGithubDataSave() {
  const DEFAULT_LIBRARY_PATH = githubData.DEFAULT_LIBRARY_PATH;
  const DEFAULT_BUILDINGS_DIR = githubData.DEFAULT_BUILDINGS_DIR;
  const cleanRepoPath = githubData.cleanRepoPath;
  const slugify = githubData.slugify;
  const readGithubFile = githubData.readGithubFile;
  const writeGithubFile = githubData.writeGithubFile;
  const defaultLibrary = githubData.defaultLibrary;
  const loadLibrary = githubData.loadLibrary;

  const I18N = {
    en: {
      settings: '☁ GitHub data settings',
      save: '☁ Save building to GitHub',
      title: 'GitHub data repository',
      repo: 'Private data repo',
      repoHelp: 'Use owner/repo, for example GeorgeHinch/HakoMachi-data. Keep this repo private if the footprint library should be private.',
      branch: 'Branch',
      token: 'Fine-grained token',
      tokenHelp: 'Stored only in this browser. Token needs Contents: read/write on the private data repo.',
      libraryPath: 'Footprint library path',
      buildingsDir: 'Building files directory',
      saveSettings: 'Save settings',
      close: 'Close',
      savedSettings: 'GitHub data settings saved in this browser.',
      missingSettings: 'Add GitHub data settings first.',
      buildingName: 'Building name for GitHub save',
      saving: 'Saving building to GitHub…',
      saved: 'Saved building to GitHub data repo.',
    },
    ja: {
      settings: '☁ GitHubデータ設定',
      save: '☁ 建物をGitHubへ保存',
      title: 'GitHubデータリポジトリ',
      repo: '非公開データrepo',
      repoHelp: 'owner/repo形式で入力します（例: GeorgeHinch/HakoMachi-data）。ライブラリを非公開にしたい場合は、このrepoを非公開にしてください。',
      branch: 'ブランチ',
      token: 'Fine-grained token',
      tokenHelp: 'このブラウザ内にのみ保存されます。非公開データrepoの Contents: read/write 権限が必要です。',
      libraryPath: 'フットプリントライブラリのパス',
      buildingsDir: '建物ファイルのディレクトリ',
      saveSettings: '設定を保存',
      close: '閉じる',
      savedSettings: 'GitHubデータ設定をこのブラウザに保存しました。',
      missingSettings: '先にGitHubデータ設定を追加してください。',
      buildingName: 'GitHub保存用の建物名',
      saving: 'GitHubへ建物を保存中…',
      saved: 'GitHubデータrepoへ建物を保存しました。',
    },
  };

  function lang() {
    return (typeof currentLang !== 'undefined' && currentLang === 'ja') ? 'ja' : 'en';
  }

  function tr(key) {
    return (I18N[lang()] && I18N[lang()][key]) || I18N.en[key] || key;
  }

  function settings() {
    return githubData.getSettings();
  }

  function saveSettings(next) {
    githubData.saveSettings(next);
  }

  function assertSettings(s) {
    githubData.assertSettings(s, tr('missingSettings'));
  }

  function defaultBuildingName() {
    try {
      if (typeof CONFIG !== 'undefined' && CONFIG) {
        if (CONFIG.buildingName) return CONFIG.buildingName;
        const type = CONFIG.buildingType;
        const label = (typeof BUILDING_TYPES !== 'undefined' && BUILDING_TYPES[type] && BUILDING_TYPES[type].label) || type || 'building';
        const w = Number(CONFIG.width) || 0;
        const d = Number(CONFIG.depth) || 0;
        return `${label} ${w.toFixed(0)}×${d.toFixed(0)}mm`;
      }
    } catch (_) {}
    return 'HakoMachi building';
  }

  function currentConfigForSave(name, id, path) {
    if (typeof readForm === 'function') readForm();
    const cfg = (typeof serializableCurrentConfig === 'function')
      ? serializableCurrentConfig(CONFIG)
      : JSON.parse(JSON.stringify(CONFIG || {}));
    const now = new Date().toISOString();
    cfg.buildingName = name;
    cfg.hakomachiCloud = {
      schema: 'hakomachi.cloud-ref',
      schemaVersion: 1,
      kind: 'building',
      id,
      name,
      path,
      savedAt: now,
    };
    if (typeof CONFIG !== 'undefined' && CONFIG) {
      CONFIG.buildingName = name;
      CONFIG.hakomachiCloud = cfg.hakomachiCloud;
    }
    return cfg;
  }

  function footprintFromConfig(cfg) {
    const w = Math.max(0, Number(cfg && cfg.width) || 0);
    const d = Math.max(0, Number(cfg && cfg.depth) || 0);
    const h = Math.max(0, Number(cfg && cfg.height) || 0);
    const blocks = [{ id: 'main', x: 0, y: 0, widthMm: w, depthMm: d }];

    try {
      if (Array.isArray(cfg.wings) && typeof weWingBounds === 'function') {
        for (let i = 0; i < cfg.wings.length; i++) {
          const b = weWingBounds(cfg, cfg.wings[i]);
          if (!b) continue;
          blocks.push({
            id: 'wing-' + (i + 1),
            x: Number(b.x) || 0,
            y: Number(b.y) || 0,
            widthMm: Number(b.w) || 0,
            depthMm: Number(b.d) || 0,
            attachFace: cfg.wings[i] && cfg.wings[i].face,
          });
        }
      }
    } catch (_) {}

    return {
      schema: 'hakomachi.footprint',
      schemaVersion: 1,
      units: 'mm',
      scale: 150,
      widthMm: w,
      depthMm: d,
      heightMm: h,
      outline: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: d },
        { x: 0, y: d },
      ],
      blocks,
    };
  }

  function upsertBuildingRecord(library, record) {
    return githubData.upsertRecord(library, 'buildings', record);
  }

  function buildRecord(id, name, path, cfg) {
    const now = new Date().toISOString();
    return {
      kind: 'building',
      recordType: 'hakomachi-building',
      schemaVersion: 1,
      id,
      name,
      path,
      paths: { hako: path },
      app: 'hakomachi-building-generator',
      tags: [cfg.buildingType].filter(Boolean),
      footprint: footprintFromConfig(cfg),
      source: {
        format: 'hako-config',
        storageVersion: Number(cfg.storageVersion) || 2,
      },
      updatedAt: now,
      createdAt: now,
    };
  }

  async function saveCurrentBuildingToGithub() {
    const s = settings();
    try {
      assertSettings(s);
      const defaultName = (CONFIG && CONFIG.hakomachiCloud && CONFIG.hakomachiCloud.name) || defaultBuildingName();
      const name = window.prompt(tr('buildingName'), defaultName);
      if (!name) return;
      const existingId = CONFIG && CONFIG.hakomachiCloud && CONFIG.hakomachiCloud.id;
      const id = existingId || slugify(name);
      const buildingDir = cleanRepoPath(s.buildingsDir || DEFAULT_BUILDINGS_DIR);
      const path = (CONFIG && CONFIG.hakomachiCloud && CONFIG.hakomachiCloud.path)
        ? CONFIG.hakomachiCloud.path
        : `${buildingDir}/${id}.hako`;
      setStatus(tr('saving'));

      const cfg = currentConfigForSave(name, id, path);
      const hakoText = JSON.stringify(cfg, null, 2) + '\n';
      await writeGithubFile(s, path, hakoText, `Save HakoMachi building: ${name}`);

      const library = await loadLibrary(s);
      upsertBuildingRecord(library, buildRecord(id, name, path, cfg));
      await writeGithubFile(
        s,
        s.libraryPath || DEFAULT_LIBRARY_PATH,
        JSON.stringify(library, null, 2) + '\n',
        `Update HakoMachi footprint library: ${name}`,
      );

      setStatus(`${tr('saved')} ${path}`);
      alert(`${tr('saved')}\n\n${s.repoFullName}\n${path}\n${s.libraryPath || DEFAULT_LIBRARY_PATH}`);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      setStatus('GitHub save failed: ' + msg, true);
      alert('GitHub save failed:\n\n' + msg);
    }
  }

  function setStatus(text, isError = false) {
    let el = document.getElementById('githubDataSaveStatus');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? '#9a2b20' : '';
    el.style.fontWeight = isError ? '600' : '';
  }

  function openSettingsModal() {
    let modal = document.getElementById('githubDataSettingsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'githubDataSettingsModal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;padding:16px;';
      modal.innerHTML = `
        <div style="width:min(520px,100%);max-height:90vh;overflow:auto;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;box-shadow:0 16px 40px rgba(0,0,0,.25);padding:14px;">
          <h2 id="githubDataSettingsTitle" style="margin:0 0 10px;font-size:16px;"></h2>
          <div class="field"><label id="githubDataRepoLabel"></label><input id="githubDataRepo" type="text" placeholder="owner/private-data-repo"><div class="small" id="githubDataRepoHelp"></div></div>
          <div class="field"><label id="githubDataBranchLabel"></label><input id="githubDataBranch" type="text" placeholder="main"></div>
          <div class="field"><label id="githubDataTokenLabel"></label><input id="githubDataToken" type="password" autocomplete="off"><div class="small" id="githubDataTokenHelp"></div></div>
          <div class="field"><label id="githubDataLibraryPathLabel"></label><input id="githubDataLibraryPath" type="text" placeholder="${DEFAULT_LIBRARY_PATH}"></div>
          <div class="field"><label id="githubDataBuildingsDirLabel"></label><input id="githubDataBuildingsDir" type="text" placeholder="${DEFAULT_BUILDINGS_DIR}"></div>
          <div id="githubDataSaveStatus" class="small" style="min-height:18px;margin:6px 0;"></div>
          <div class="actions" style="justify-content:flex-end;margin-top:10px;"><button id="githubDataSettingsSave" class="primary"></button><button id="githubDataSettingsClose"></button></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) closeSettingsModal(); });
      modal.querySelector('#githubDataSettingsClose').addEventListener('click', closeSettingsModal);
      modal.querySelector('#githubDataSettingsSave').addEventListener('click', () => {
        saveSettings({
          repoFullName: modal.querySelector('#githubDataRepo').value,
          branch: modal.querySelector('#githubDataBranch').value,
          token: modal.querySelector('#githubDataToken').value,
          libraryPath: modal.querySelector('#githubDataLibraryPath').value,
          buildingsDir: modal.querySelector('#githubDataBuildingsDir').value,
        });
        setStatus(tr('savedSettings'));
      });
    }

    const s = settings();
    modal.querySelector('#githubDataSettingsTitle').textContent = tr('title');
    modal.querySelector('#githubDataRepoLabel').textContent = tr('repo');
    modal.querySelector('#githubDataRepoHelp').textContent = tr('repoHelp');
    modal.querySelector('#githubDataBranchLabel').textContent = tr('branch');
    modal.querySelector('#githubDataTokenLabel').textContent = tr('token');
    modal.querySelector('#githubDataTokenHelp').textContent = tr('tokenHelp');
    modal.querySelector('#githubDataLibraryPathLabel').textContent = tr('libraryPath');
    modal.querySelector('#githubDataBuildingsDirLabel').textContent = tr('buildingsDir');
    modal.querySelector('#githubDataSettingsSave').textContent = tr('saveSettings');
    modal.querySelector('#githubDataSettingsClose').textContent = tr('close');
    modal.querySelector('#githubDataRepo').value = s.repoFullName || '';
    modal.querySelector('#githubDataBranch').value = s.branch || 'main';
    modal.querySelector('#githubDataToken').value = s.token || '';
    modal.querySelector('#githubDataLibraryPath').value = s.libraryPath || DEFAULT_LIBRARY_PATH;
    modal.querySelector('#githubDataBuildingsDir').value = s.buildingsDir || DEFAULT_BUILDINGS_DIR;
    setStatus('');
    modal.style.display = 'flex';
  }

  function closeSettingsModal() {
    const modal = document.getElementById('githubDataSettingsModal');
    if (modal) modal.style.display = 'none';
  }

  function injectMenuItems() {
    const menu = document.getElementById('overflowDropdown');
    if (!menu || document.getElementById('githubDataSettingsBtn')) return;
    const sep = document.createElement('div');
    sep.className = 'overflow-sep';
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'githubDataSettingsBtn';
    settingsBtn.type = 'button';
    settingsBtn.textContent = tr('settings');
    settingsBtn.addEventListener('click', openSettingsModal);
    const saveBtn = document.createElement('button');
    saveBtn.id = 'githubSaveBuildingBtn';
    saveBtn.type = 'button';
    saveBtn.textContent = tr('save');
    saveBtn.addEventListener('click', saveCurrentBuildingToGithub);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn && resetBtn.parentNode === menu) {
      menu.insertBefore(sep, resetBtn);
      menu.insertBefore(settingsBtn, resetBtn);
      menu.insertBefore(saveBtn, resetBtn);
    } else {
      menu.appendChild(sep);
      menu.appendChild(settingsBtn);
      menu.appendChild(saveBtn);
    }
  }

  window.HakoMachiGithubData = {
    settings,
    openSettingsModal,
    saveCurrentBuildingToGithub,
    footprintFromConfig,
    defaultLibrary,
  };

  document.addEventListener('DOMContentLoaded', injectMenuItems);
})();
