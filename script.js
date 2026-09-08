/* ============================================================
   GX-LAUNCHER 1.10 — SHARED SCRIPT
   ============================================================ */

// ===== STORAGE HELPERS =====
const _memStore = {};
function _lsGet(name) {
    try { return localStorage.getItem(name); } catch(e) { return _memStore[name] ?? null; }
}
function _lsSet(name, value) {
    try { localStorage.setItem(name, value); } catch(e) { _memStore[name] = value; }
}
function getCookie(name)            { return _lsGet(name); }
function setCookie(name, value, _d) { _lsSet(name, String(value)); }

// ===== TOAST =====
let _toastTimer;
function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '') + ' show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== STATUS LINE =====
function setStatus(html) {
    const el = document.getElementById('status-line');
    if (el) el.innerHTML = html;
}

// ===== LOADING OVERLAY =====
function showLoading(msg) {
    const ov = document.getElementById('loading-overlay');
    const tx = document.getElementById('loading-text');
    if (ov) ov.classList.add('active');
    if (tx) tx.textContent = msg || 'LOADING...';
    setLoadingBar(0);
}
function hideLoading() {
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.classList.remove('active');
}
function setLoadingBar(pct) {
    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = pct + '%';
}

// ===== THEME SYSTEM =====
const GX_THEMES = {
    'default':  {},
    'green':    { '--accent':'#00cc44','--accent-hi':'#00ff55','--accent-dim':'#006622','--accent-glow':'rgba(0,180,60,0.15)','--border2':'#003318' },
    'blood':    { '--accent':'#cc0000','--accent-hi':'#ff4444','--accent-dim':'#800000','--accent-glow':'rgba(200,0,0,0.22)','--border2':'#4a0000','--bg':'#080000','--bg2':'#0d0000','--bg3':'#120000','--panel':'#0f0000' },
    'midnight': { '--accent':'#5566ff','--accent-hi':'#7788ff','--accent-dim':'#2233bb','--accent-glow':'rgba(80,100,255,0.18)','--border2':'#1a2050','--bg':'#070710','--bg2':'#0c0c1a','--bg3':'#111125','--panel':'#0e0e1e' },
    'ash':      { '--accent':'#999999','--accent-hi':'#cccccc','--accent-dim':'#555555','--accent-glow':'rgba(150,150,150,0.15)','--border2':'#404040' },
    'amber':    { '--accent':'#cc7700','--accent-hi':'#ffaa00','--accent-dim':'#7a4400','--accent-glow':'rgba(200,120,0,0.18)','--border2':'#3a2200','--bg':'#090600','--bg2':'#100d00','--bg3':'#181200','--panel':'#130f00' },
};
const GX_DEFAULTS = {
    '--accent':'#cc0000','--accent-hi':'#ff2222','--accent-dim':'#7a0000',
    '--accent-glow':'rgba(180,0,0,0.18)','--bg':'#0a0a0a','--bg2':'#111111',
    '--bg3':'#181818','--panel':'#141414','--border2':'#3a0000'
};

function applyTheme(name) {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(GX_DEFAULTS)) root.style.setProperty(k, v);
    const t = GX_THEMES[name] || {};
    for (const [k, v] of Object.entries(t)) root.style.setProperty(k, v);
    setCookie('launcherTheme', name, 365);
    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.themeName === name);
    });
}

function updateNavVisibility() {}
function toggleModMaker() {}

// ===== VERSION SELECTOR =====
let _selectedVersion = '';

function toggleVersionDropdown() {
    const dd  = document.getElementById('version-dropdown');
    const sel = document.getElementById('version-select');
    if (!dd) return;
    const isOpen = dd.classList.toggle('open');
    sel.classList.toggle('open', isOpen);
    const search = document.getElementById('version-search');
    if (search) {
        if (isOpen) {
            search.value = '';
            filterVersionDropdown(search);
            setTimeout(() => search.focus(), 0);
        }
    }
}

function filterVersionDropdown(input) {
    const dd = document.getElementById('version-dropdown');
    if (!dd) return;
    const query = input.value.trim().toLowerCase();
    let currentGroup = null;
    let groupHasMatch = false;
    const groups = [];
    dd.querySelectorAll('.version-group-label, .version-option').forEach(el => {
        if (el.classList.contains('version-group-label')) {
            if (currentGroup) groups.push([currentGroup, groupHasMatch]);
            currentGroup = el;
            groupHasMatch = false;
        } else {
            const text = el.textContent.toLowerCase();
            const match = !query || text.includes(query);
            el.style.display = match ? '' : 'none';
            if (match) groupHasMatch = true;
        }
    });
    if (currentGroup) groups.push([currentGroup, groupHasMatch]);
    groups.forEach(([label, hasMatch]) => { label.style.display = hasMatch ? '' : 'none'; });
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const dd = document.getElementById('version-dropdown');
        const sel = document.getElementById('version-select');
        if (dd && dd.classList.contains('open')) {
            dd.classList.remove('open');
            sel.classList.remove('open');
        }
    }
});

function selectVersion(path, label, isWasm) {
    _selectedVersion = path;
    const lbl = document.getElementById('version-label');
    if (lbl) lbl.textContent = label;
    document.getElementById('version-dropdown')?.classList.remove('open');
    document.getElementById('version-select')?.classList.remove('open');
    const btn = document.getElementById('play-btn');
    if (btn) btn.disabled = false;
    document.querySelectorAll('.version-option').forEach(o => o.classList.remove('active-ver'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active-ver');
    const method = getCookie('launchMethod') || 'regular';
    const modeLabels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    const badge = document.getElementById('mode-badge-text');
    if (badge) badge.textContent = modeLabels[method] || method.toUpperCase();
    setStatus('VERSION: <span class="hl">' + label + '</span>');
}

document.addEventListener('click', e => {
    if (!e.target.closest('.version-wrapper')) {
        document.getElementById('version-dropdown')?.classList.remove('open');
        document.getElementById('version-select')?.classList.remove('open');
    }
});

// ===== WISP INJECTION =====

// Checks if WISP injection is enabled in settings
function isWispEnabled() {
    return getCookie('wispEnabled') === 'true';
}

// Returns the configured WISP URL, or the default
function getWispUrl() {
    return getCookie('wispUrl') || 'wss://anura.pro/';
}

// Injects the wispcraft bundle script into a raw HTML string
// Returns the modified HTML string
async function injectWispIntoHtml(html) {
    // Lazy-load the bundle from wisp-bundle.js if not already loaded
    if (typeof getWispBundle !== 'function') {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'wisp-bundle.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load wisp-bundle.js'));
            document.head.appendChild(s);
        });
    }

    const b64 = getWispBundle();
    const wispUrl = getWispUrl();

    // Build the injected script:
    // 1. Sets wispcraft_wispurl in localStorage so wispcraft uses our configured server
    // 2. Decodes and executes the wispcraft bundle
    const injectedScript = `<script>
(function(){
  try { localStorage.setItem('wispcraft_wispurl', ${JSON.stringify(wispUrl)}); } catch(e){}
  var s=document.createElement('script');
  s.textContent=atob(${JSON.stringify(b64)});
  document.currentScript.parentNode.insertBefore(s,document.currentScript);
})();
<\/script>`;

    // Prepend into <head> if present, else prepend to <html>, else prepend to document
    if (/<head[\s>]/i.test(html)) {
        return html.replace(/(<head[^>]*>)/i, '$1\n' + injectedScript);
    } else if (/<html[\s>]/i.test(html)) {
        return html.replace(/(<html[^>]*>)/i, '$1\n<head>' + injectedScript + '</head>');
    } else {
        return injectedScript + html;
    }
}

// ===== SERVER INJECTION =====
const GX_SERVERS = [
    { name: "mc.arch.lol",                    addr: "mc.arch.lol" },
    { name: "Zentic",                          addr: "wss://zentic.cc" },
    { name: "Zyth",                            addr: "wss://mc.zyth.me" },
    { name: "AsianF4rmer",                     addr: "wss://asianf4rmer.minecraft.pe" },
    { name: "shhnowisnottheti.me",             addr: "wss://sus.shhnowisnottheti.me" },
    { name: "Aeon Network",                    addr: "wss://aeon-network.net/1.8" },
    { name: "Adderall",                        addr: "wss://adderall.ir" },
    { name: "Lamp Lifesteal",                  addr: "wss://mc.lamplifesteal.xyz" },
    { name: "VanillaMC",                       addr: "wss://vanillamc.org" },
    { name: "Voidsent",                        addr: "wss://mc.voidsent.net" },
    { name: "Dumbshit Survival X",             addr: "wss://mc.dssx.uk" },
    { name: "Mytheria MC",                     addr: "wss://play.mytheriamc.net" },
    { name: "CMC",                             addr: "wss://cmc.tf" },
];

function injectServersIntoHtml(html) {
    const injection = `<script>
(function(){
  var toAdd = ${JSON.stringify(GX_SERVERS)};
  function doInject() {
    var existing = (window.eaglercraftXOpts && window.eaglercraftXOpts.servers) || [];
    var existingAddrs = existing.map(function(s){ return s.addr; });
    toAdd.forEach(function(s){
      if (existingAddrs.indexOf(s.addr) === -1) existing.push(s);
    });
    if (window.eaglercraftXOpts) window.eaglercraftXOpts.servers = existing;
  }
  if (window.eaglercraftXOpts) {
    doInject();
  } else {
    var poll = setInterval(function(){
      if (window.eaglercraftXOpts) { clearInterval(poll); doInject(); }
    }, 50);
  }
})();
<\/script>`;

    if (/<head[\s>]/i.test(html)) {
        return html.replace(/(<head[^>]*>)/i, '$1\n' + injection);
    } else if (/<html[\s>]/i.test(html)) {
        return html.replace(/(<html[^>]*>)/i, '$1\n<head>' + injection + '</head>');
    } else {
        return injection + html;
    }
}

// ===== LAUNCH LOGIC =====
function playGame() {
    if (!_selectedVersion) { showToast('Select a version first.', true); return; }

    const method = getCookie('launchMethod') || 'regular';
    const relUrl = 'game/' + _selectedVersion + '/index.html';
    const absUrl = new URL(relUrl, location.href).href;
    const popupFeatures = 'width=1280,height=720,toolbar=0,menubar=0,location=0,status=0';
    const wispOn = isWispEnabled();

    // Regular mode: always open the real URL directly.
    // WISP injection requires fetching/rewriting HTML and is not compatible with regular mode.
    if (method === 'regular') {
        if (wispOn) {
            showToast('WISP injection is not supported in Regular mode — use Blob or About:Blank instead.', true);
        }
        window.open(absUrl, '_blank');
        setStatus('LAUNCHED');
        return;
    }


    if (wispOn && method === 'popup') {
        setStatus('WISP: INJECTING...');
        _fetchWithProgress(absUrl).then(html => injectWispIntoHtml(html)).then(html => injectServersIntoHtml(html)).then(html => {
            const blob = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            const w = window.open(blobUrl, '_blank', popupFeatures);
            if (!w) showToast('Popup blocked — allow popups for this site.', true);
            setStatus('LAUNCHED WITH <span class="hl">WISP + POPUP</span>');
        }).catch(err => {
            showToast('WISP failed (' + err.message + ') — launching without WISP.', true);
            setStatus('WISP ERROR — LAUNCHING WITHOUT WISP');
            const w = window.open(absUrl, '_blank', popupFeatures);
            if (!w) showToast('Popup blocked — allow popups for this site.', true);
        });
        return;
    }





    if (method === 'popup') {
        const w = window.open(absUrl, '_blank', popupFeatures);
        if (!w) showToast('Popup blocked — allow popups for this site.', true);

    } else if (method === 'about-blank') {
        _fetchWithProgress(absUrl).then(html => {
            return wispOn ? injectWispIntoHtml(html) : html;
        }).then(html => {
            return injectServersIntoHtml(html);
        }).then(html => {
            const win = window.open('', '_blank');
            if (!win) { showToast('Popup blocked.', true); return; }
            win.document.open();
            win.document.write(html);
            win.document.close();
            setStatus(wispOn
                ? 'LAUNCHED AS <span class="hl">ABOUT:BLANK + WISP</span>'
                : 'LAUNCHED AS <span class="hl">ABOUT:BLANK</span>');
        }).catch(err => {
            if (wispOn) {
                showToast('WISP failed (' + err.message + ') — launching without WISP.', true);
                setStatus('WISP ERROR — LAUNCHING WITHOUT WISP');
                _fetchWithProgress(absUrl).then(html => injectServersIntoHtml(html)).then(html => {
                    const win = window.open('', '_blank');
                    if (!win) { showToast('Popup blocked.', true); return; }
                    win.document.open();
                    win.document.write(html);
                    win.document.close();
                    setStatus('LAUNCHED AS <span class="hl">ABOUT:BLANK</span>');
                }).catch(err2 => {
                    showToast('Fetch failed: ' + err2.message, true);
                    setStatus('FETCH ERROR');
                });
            } else {
                showToast('Fetch failed: ' + err.message, true);
                setStatus('FETCH ERROR');
            }
        });

    } else if (method === 'blob') {
        _fetchWithProgress(absUrl).then(html => {
            return wispOn ? injectWispIntoHtml(html) : html;
        }).then(html => {
            return injectServersIntoHtml(html);
        }).then(html => {
            const blob    = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setStatus(wispOn
                ? 'LAUNCHED AS <span class="hl">BLOB + WISP</span>'
                : 'LAUNCHED AS <span class="hl">BLOB URL</span>');
        }).catch(err => {
            if (wispOn) {
                showToast('WISP failed (' + err.message + ') — launching without WISP.', true);
                setStatus('WISP ERROR — LAUNCHING WITHOUT WISP');
                _fetchWithProgress(absUrl).then(html => injectServersIntoHtml(html)).then(html => {
                    const blob = new Blob([html], { type: 'text/html' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                    setStatus('LAUNCHED AS <span class="hl">BLOB URL</span>');
                }).catch(err2 => {
                    showToast('Fetch failed: ' + err2.message, true);
                    setStatus('FETCH ERROR');
                });
            } else {
                showToast('Fetch failed: ' + err.message, true);
                setStatus('FETCH ERROR');
            }
        });

    } else if (method === 'data-uri') {
        try {
            const folder  = _selectedVersion.split('/').map(encodeURIComponent).join('/');
            const cdnBase = 'https://raw.githack.com/xXJ0NXx/GX-Launcher/main/' + folder + '/';
            const gameUrl = cdnBase + 'index.html';

            const loaderHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<base href="${cdnBase}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;font-family:monospace;color:#fff}
#s{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0a0a0a}
#bar-wrap{width:320px;height:6px;background:#222;border-radius:3px;overflow:hidden}
#bar{height:100%;width:0%;background:#cc0000;border-radius:3px;transition:width 0.1s}
#msg{font-size:13px;color:#aaa;letter-spacing:0.1em}
</style>
</head><body>
<div id="s">
  <div id="msg">FETCHING GAME...</div>
  <div id="bar-wrap"><div id="bar"></div></div>
</div>
<script>
(async()=>{
  const url='${gameUrl}';
  const bar=document.getElementById('bar');
  const msg=document.getElementById('msg');
  try{
    const res=await fetch(url);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const len=+res.headers.get('content-length')||0;
    const reader=res.body.getReader();
    const chunks=[];let got=0;
    while(true){
      const{done,value}=await reader.read();
      if(done)break;
      chunks.push(value);got+=value.length;
      if(len)bar.style.width=(5+Math.round(got/len*90))+'%';
    }
    bar.style.width='100%';
    msg.textContent='LAUNCHING...';
    const merged=new Uint8Array(got);let pos=0;
    for(const c of chunks){merged.set(c,pos);pos+=c.length;}
    const html=new TextDecoder().decode(merged);
    const baseTag='<base href="${cdnBase}">';
    let patched;
    if(/<head[\s>]/i.test(html)){patched=html.replace(/(<head[^>]*>)/i,'$1\n'+baseTag);}
    else if(/<html[\s>]/i.test(html)){patched=html.replace(/(<html[^>]*>)/i,'$1\n<head>'+baseTag+'</head>');}
    else{patched=baseTag+html;}
    document.open();
    document.write(patched);
    document.close();
  }catch(e){
    msg.textContent='ERROR: '+e.message;
    bar.style.background='#aa0000';
  }
})();
</script>
</body></html>`;

            const b64     = btoa(unescape(encodeURIComponent(loaderHtml)));
            const dataUri = 'data:text/html;base64,' + b64;
            navigator.clipboard.writeText(dataUri).then(() => {
                _showDataUriSplash(true);
            }).catch(() => {
                _showDataUriSplash(false);
            });
            setStatus('DATA URI COPIED — PASTE IN ADDRESS BAR');
        } catch (e) {
            showToast('Failed to generate URI: ' + e.message, true);
            setStatus('URI ERROR');
        }
    }
}

function _showDataUriSplash(copied) {
    document.getElementById('_gx_uri_splash')?.remove();
    const overlay = document.createElement('div');
    overlay.id = '_gx_uri_splash';
    overlay.style.cssText = [
        'position:fixed','inset:0','z-index:99999',
        'background:rgba(0,0,0,0.92)',
        'display:flex','flex-direction:column',
        'align-items:center','justify-content:center','gap:18px',
        'font-family:var(--mono,monospace)',
        'animation:_gxFadeIn 0.2s ease'
    ].join(';');
    overlay.innerHTML = `
        <style>
            @keyframes _gxFadeIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
            #_gx_uri_splash .splash-box {
                border:1px solid var(--accent,#cc0000);
                background:var(--panel,#141414);
                padding:32px 40px;
                text-align:center;
                max-width:420px;
                box-shadow:0 0 40px var(--accent-glow,rgba(180,0,0,0.2));
            }
            #_gx_uri_splash .splash-icon { font-size:36px; margin-bottom:12px; }
            #_gx_uri_splash .splash-title {
                font-size:13px; letter-spacing:0.18em; text-transform:uppercase;
                color:var(--accent,#cc0000); margin-bottom:10px;
            }
            #_gx_uri_splash .splash-body {
                font-size:11px; color:var(--text-dim,#888); line-height:1.7; margin-bottom:20px;
            }
            #_gx_uri_splash .splash-body strong { color:var(--text-bright,#fff); }
            #_gx_uri_splash .splash-warn {
                font-size:10px; color:#ffaa00; margin-bottom:16px;
            }
            #_gx_uri_splash .splash-close {
                background:var(--accent-dim,#7a0000); border:none;
                color:#fff; font-family:var(--mono,monospace);
                font-size:11px; padding:8px 24px; cursor:pointer;
                letter-spacing:0.1em; text-transform:uppercase;
                transition:background 0.13s;
            }
            #_gx_uri_splash .splash-close:hover { background:var(--accent,#cc0000); }
        </style>
        <div class="splash-box">
            <div class="splash-icon">📋</div>
            <div class="splash-title">${copied ? 'URI Copied!' : 'URI Ready'}</div>
            <div class="splash-body">
                ${copied
                    ? 'The <strong>data: URI</strong> has been copied to your clipboard.'
                    : 'Could not auto-copy — please copy the URI from the address bar manually.'}
                <br><br>
                Open a <strong>new tab</strong>, click the address bar,<br>
                <strong>paste</strong> and press <strong>Enter</strong>.
            </div>
            ${!copied ? '<div class="splash-warn">⚠ Clipboard access was blocked by your browser.</div>' : ''}
            <button class="splash-close" onclick="document.getElementById('_gx_uri_splash').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay?.remove(), 15000);
}

function _fetchWithProgress(url) {
    showLoading('FETCHING...');
    setLoadingBar(5);
    return fetch(url).then(res => {
        if (!res.ok) { hideLoading(); throw new Error('HTTP ' + res.status); }
        const total = parseInt(res.headers.get('content-length') || '0');
        const reader = res.body.getReader();
        let received = 0;
        const chunks = [];

        function pump() {
            return reader.read().then(({ done, value }) => {
                if (done) return;
                chunks.push(value);
                received += value.length;
                if (total) setLoadingBar(5 + Math.round(received / total * 80));
                return pump();
            });
        }

        return pump().then(() => {
            setLoadingBar(88);
            const merged = new Uint8Array(received);
            let pos = 0;
            for (const c of chunks) { merged.set(c, pos); pos += c.length; }
            hideLoading();
            setLoadingBar(100);
            return new TextDecoder().decode(merged);
        });
    }).catch(err => { hideLoading(); throw err; });
}

// ===== NAVIGATION HELPERS =====
function redirectToNews()         { window.location.href = 'news.html'; }
function redirectToClients()      { window.location.href = 'clients.html'; }
function redirectToServers()      { window.location.href = 'servers.html'; }
function redirectToMods()         { window.location.href = 'mods.html'; }
function redirectToMain()         { window.location.href = 'index.html'; }
function redirectToOtherClients() { window.location.href = 'otherclients.html'; }
function redirectToDownloads()    { window.location.href = 'downloads.html'; }
function redirectToSettings()     { window.location.href = 'settings.html'; }

function openBlankPage(link) { window.open(link); }

function createAbout(url) {
    const win = window.open();
    win.document.body.style.margin = '0';
    win.document.body.style.height = '100vh';
    const iframe = win.document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.margin = '0';
    iframe.src = url;
    win.document.body.appendChild(iframe);
}

// ===== SETTINGS PAGE ACTIONS =====
function saveUsername() {
    const val = (document.getElementById('username-input')?.value || '').trim();
    if (!val) { showToast('Enter a username first.', true); return; }
    setCookie('username', val, 365);
    document.querySelectorAll('.profile-name, #profile-name').forEach(el => el.textContent = val);
    showToast('Username saved: ' + val);
}

function applyUiScale(scale) {
    document.documentElement.style.setProperty('--ui-scale', scale);
    document.querySelectorAll('[data-scale]').forEach(btn => {
        btn.classList.toggle('selected', parseFloat(btn.dataset.scale) === scale);
    });
}

function saveUiScale(scale) {
    applyUiScale(scale);
    setCookie('uiScale', scale, 365);
    showToast('UI scale: ' + Math.round(scale * 100) + '%');
}

function loadUiScale() {
    const saved = parseFloat(getCookie('uiScale'));
    const scale = (!isNaN(saved)) ? saved : 1;
    applyUiScale(scale);
}

function applyThemeFromSwatch(name, el) {
    applyTheme(name);
    showToast('Theme: ' + name);
}

function selectLaunchMode(mode, el) {
    setCookie('launchMethod', mode, 365);
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
    const labels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    const badge = document.getElementById('mode-badge-text');
    if (badge) badge.textContent = labels[mode] || mode.toUpperCase();
    showToast('Launch mode: ' + (labels[mode] || mode));
}

// Toggle WISP on/off from settings
function toggleWisp(enabled) {
    setCookie('wispEnabled', enabled ? 'true' : 'false', 365);
    const toggle = document.getElementById('wisp-toggle');
    const status = document.getElementById('wisp-status-text');
    const urlRow = document.getElementById('wisp-url-row');
    if (toggle) toggle.checked = enabled;
    if (status) {
        status.textContent = enabled ? 'ENABLED' : 'DISABLED';
        status.className = 'wisp-status-badge ' + (enabled ? 'on' : 'off');
    }
    if (urlRow) urlRow.style.opacity = enabled ? '1' : '0.45';
    showToast('WISP injection ' + (enabled ? 'enabled' : 'disabled'));
}

// Save WISP URL from settings input
function saveWispUrl() {
    const input = document.getElementById('wisp-url-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        showToast('Enter a WISP server URL.', true);
        return;
    }
    try {
        const u = new URL(val);
        if (!u.protocol.startsWith('ws')) throw new Error('Must start with ws:// or wss://');
    } catch(e) {
        showToast('Invalid URL: ' + e.message, true);
        return;
    }
    setCookie('wispUrl', val, 365);
    showToast('WISP server saved.');
}

function resetWispUrl() {
    const def = 'wss://anura.pro/';
    setCookie('wispUrl', def, 365);
    const input = document.getElementById('wisp-url-input');
    if (input) input.value = def;
    showToast('Reset to default WISP server.');
}

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {

    // Apply saved username
    const username = getCookie('username');
    if (username) {
        document.querySelectorAll('.profile-name, #profile-name').forEach(el => el.textContent = username);
        const input = document.getElementById('username-input');
        if (input) input.value = username;
    }

    // Apply saved theme
    const savedTheme = getCookie('launcherTheme') || 'default';
    applyTheme(savedTheme);

    // Restore launch mode selection on settings page
    const savedMode = getCookie('launchMethod') || 'regular';
    document.querySelectorAll('.mode-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.mode === savedMode);
    });
    const badge = document.getElementById('mode-badge-text');
    const modeLabels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    if (badge) badge.textContent = modeLabels[savedMode] || savedMode.toUpperCase();

    // Restore WISP settings on settings page
    const wispEnabled = isWispEnabled();
    const toggle = document.getElementById('wisp-toggle');
    const status = document.getElementById('wisp-status-text');
    const urlRow = document.getElementById('wisp-url-row');
    const urlInput = document.getElementById('wisp-url-input');
    if (toggle) toggle.checked = wispEnabled;
    if (status) {
        status.textContent = wispEnabled ? 'ENABLED' : 'DISABLED';
        status.className = 'wisp-status-badge ' + (wispEnabled ? 'on' : 'off');
    }
    if (urlRow) urlRow.style.opacity = wispEnabled ? '1' : '0.45';
    if (urlInput) urlInput.value = getWispUrl();

    // Restore UI scale
    loadUiScale();
});
