const resources = window.PHONEBOOK_RESOURCES || [];
const tabs = document.getElementById('tabs');
const main = document.getElementById('main');
const search = document.getElementById('search');
const category = document.getElementById('category');
// Some private browsers and file: viewers deny storage access. Browsing still works.
let activeId = 'start';
try { activeId = localStorage.getItem('gj-phonebook-active') || activeId; } catch (_) {}
let printMode = false;
const clearFilters = document.getElementById('clearFilters');
const resultCount = document.getElementById('resultCount');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function telHref(number) {
  return 'tel:' + String(number).replace(/[^0-9+]/g,'');
}
function smsHref(phone) {
  const number = String(phone.number).replace(/[^0-9+]/g,'');
  return 'sms:' + number + (phone.body ? '?body=' + encodeURIComponent(phone.body) : '');
}
function fullText(r) {
  return JSON.stringify(r).toLowerCase();
}
function filtered() {
  const q = search.value.trim().toLowerCase();
  const c = category.value;
  return resources.filter(r => (!c || r.category === c) && (!q || fullText(r).includes(q)));
}
function renderCategoryOptions() {
  const cats = [...new Set(resources.map(r=>r.category))].sort();
  category.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
}
function renderTabs() {
  const list = filtered();
  if (!list.some(r=>r.id===activeId) && list.length) activeId = list[0].id;
  resultCount.textContent = `${list.length} of ${resources.length} resources${search.value.trim() || category.value ? ' match your filters' : ''}.`;
  clearFilters.disabled = !search.value && !category.value;
  tabs.innerHTML = list.length ? list.map(r => `
    <button class="tab ${r.id===activeId?'active':''} ${r.urgent?'urgent':''}" data-id="${escapeHtml(r.id)}" type="button" ${r.id===activeId?'aria-current="true"':''}>
      <span class="name">${escapeHtml(r.name)}</span>
      <span class="cat">${escapeHtml(r.category)}</span>
    </button>`).join('') : '<div class="empty">No matching resources.</div>';
  tabs.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    activeId = btn.dataset.id;
    try { localStorage.setItem('gj-phonebook-active', activeId); } catch (_) {}
    renderTabs();
    renderMain();
    document.getElementById('main').focus({preventScroll:true});
    if (window.innerWidth < 801) window.scrollTo({top: tabs.offsetTop - 8, behavior:'smooth'});
  }));
}
function phonesHtml(r) {
  if (!r.phones || !r.phones.length) return '';
  return `<div class="phone-grid">${r.phones.map(p => {
    const modes = p.mode === 'calltext' ? ['tel', 'sms'] : [p.mode === 'sms' ? 'sms' : 'tel'];
    return modes.map(mode => `
      <a class="phone" href="${escapeHtml(mode === 'sms' ? smsHref(p) : telHref(p.number))}">
        <span>${mode === 'sms' ? 'Text' : 'Call'}: ${escapeHtml(p.label)}</span>
        <strong>${escapeHtml((p.prefix||'') + p.number)}</strong>
      </a>`).join('');
  }).join('')}</div>`;
}
function info(label, value) {
  if (!value) return '';
  return `<div class="info"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(value)}</p></div>`;
}
function sourcesHtml(r) {
  if (!r.sources || !r.sources.length) return '<p class="small-note">No external source link is needed for this universal emergency entry.</p>';
  return `<div class="sources">${r.sources.map(s=>`<a href="${escapeHtml(s.url)}" target="_blank" rel="noreferrer">${escapeHtml(s.label)}<span class="print-url">${escapeHtml(s.url)}</span></a>`).join('')}</div>`;
}
function cardHtml(r, printClass='') {
  return `<article class="card ${printClass}">
    <div class="card-head">
      <div class="badges">
        <span class="badge">${escapeHtml(r.category)}</span>
        ${r.urgent?'<span class="badge urgent">Urgent route</span>':''}
      </div>
      <h2>${escapeHtml(r.name)}</h2>
      <p class="status">${escapeHtml(r.status)}</p>
      <p class="summary">${escapeHtml(r.summary)}</p>
    </div>
    <div class="body">
      ${phonesHtml(r)}
      <div class="info-grid">
        ${info('Address / service area', r.address)}
        ${info('Hours', r.hours)}
        ${info('Who can use it', r.eligibility)}
        ${info('Cost', r.cost)}
        ${info('What to bring', r.bring)}
        ${info('No ID?', r.id_note)}
        ${info('Transportation', r.transport)}
        ${info('After hours', r.after_hours)}
        ${info('Last research review', r.last_verified)}
      </div>
      <section class="section">
        <h3>How to access it</h3>
        <ol class="steps">${(r.access||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>
      </section>
      ${r.alerts && r.alerts.length ? `<section class="section"><h3>Important cautions</h3><ul class="alert-list">${r.alerts.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section>`:''}
      <section class="section">
        <h3>Sources / update links</h3>
        ${sourcesHtml(r)}
      </section>
    </div>
  </article>`;
}
function renderMain() {
  if (printMode) {
    main.innerHTML = resources.map(r=>cardHtml(r,'print-resource')).join('');
    return;
  }
  const list = filtered();
  const r = list.find(x=>x.id===activeId) || list[0];
  main.innerHTML = r ? cardHtml(r) : '<section class="empty"><h2>No matching resources</h2><p>Try a shorter search, choose another category, or clear both filters.</p><button type="button" class="print-btn" data-clear-filters>Clear filters</button></section>';
}
function resetFilters() {
  search.value = '';
  category.value = '';
  renderTabs();
  renderMain();
  search.focus();
}
clearFilters.addEventListener('click', resetFilters);
main.addEventListener('click', event => {
  if (event.target.closest('[data-clear-filters]')) resetFilters();
});
search.addEventListener('input',()=>{renderTabs();renderMain();});
category.addEventListener('change',()=>{renderTabs();renderMain();});
document.getElementById('printAll').addEventListener('click',()=>{
  printMode = true;
  renderMain();
  setTimeout(()=>{
    window.print();
    printMode = false;
    renderMain();
  },50);
});
window.addEventListener('afterprint',()=>{printMode=false;renderMain();});
renderCategoryOptions();
renderTabs();
renderMain();
document.getElementById('totalResources').textContent = `${resources.length} resources`;

let deferredInstallPrompt = null;
const installButton = document.getElementById('installApp');
const shareButton = document.getElementById('shareApp');
const installHelp = document.getElementById('installHelp');
const downloadButton = document.getElementById('downloadHtml');
const offlineStatus = document.getElementById('offlineStatus');
const OFFLINE_CACHE_NAME = 'gj-unhoused-phonebook-v4-review-20261119';
let offlineReady = false;

function showInstallHelp(message) {
  installHelp.textContent = message;
  installHelp.hidden = false;
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.textContent = 'Install app';
});

installButton.addEventListener('click', async () => {
  if (location.protocol === 'file:') {
    showInstallHelp('Keep this HTML file on your device. Its saved entries and search work without internet. Calling, texting, and opening websites require the appropriate connection.');
    return;
  }
  if (deferredInstallPrompt) {
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (_) {
      showInstallHelp('The install prompt could not open. Use your browser menu to add this page to the home screen, or download the offline HTML.');
    }
    deferredInstallPrompt = null;
    return;
  }
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua);
  if (ios) {
    showInstallHelp('iPhone/iPad: open this page in Safari, tap Share, choose Add to Home Screen, then tap Add.');
  } else {
    showInstallHelp('If no install prompt appears: open the browser menu and choose Install app or Add to home screen. You can always use Download offline HTML instead.');
  }
});


const HOSTED_SOURCE_FILES = ["resources-01.js", "resources-02.js", "resources-03.js", "resources-04.js", "resources-05.js", "resources-06.js", "resources-07.js", "resources-08.js", "resources-09.js", "resources-10.js", "resources-11.js", "resources-12.js", "app.js"];

async function makeSingleFileDownload() {
  const clone = document.documentElement.cloneNode(true);
  const body = clone.querySelector('body');
  clone.dataset.offlineCopy = 'true';

  // Do not save temporary button, filter, installation, or readiness state.
  const savedDownloadButton = clone.querySelector('#downloadHtml');
  savedDownloadButton.disabled = false;
  savedDownloadButton.textContent = 'Download offline HTML';
  const savedInstallButton = clone.querySelector('#installApp');
  savedInstallButton.disabled = false;
  savedInstallButton.textContent = 'Offline copy help';
  const savedHelp = clone.querySelector('#installHelp');
  savedHelp.hidden = true;
  savedHelp.textContent = '';
  clone.querySelector('#offlineStatus').textContent = 'Saved offline copy. Website links require internet; calls and texts require phone service.';
  clone.querySelector('#search').value = '';
  clone.querySelector('#search').setAttribute('value', '');
  clone.querySelectorAll('#category option').forEach(option => option.removeAttribute('selected'));
  clone.querySelector('#category').value = '';
  clone.querySelector('#clearFilters').disabled = true;
  const recoveryLink = clone.querySelector('#recoveryGuideLink');
  if (recoveryLink) recoveryLink.href = 'https://falloutmule.github.io/solidarity-not-charity-can-run/phonebook/recovery.html';

  clone.querySelectorAll('script[src]').forEach(node => node.remove());
  clone.querySelectorAll('link[rel="manifest"],link[rel="icon"]').forEach(node => node.remove());

  const qrImg = clone.querySelector('[data-share-qr]');
  if (qrImg) {
    const qrResponse = await fetch('./share-qr.svg');
    if (!qrResponse.ok) throw new Error('Could not load sharing QR code');
    const holder = document.createElement('span');
    holder.innerHTML = await qrResponse.text();
    const svg = holder.querySelector('svg');
    if (!svg) throw new Error('Sharing QR code is not valid SVG');
    svg.classList.add('embedded-qr');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code for the online Grand Junction phonebook');
    qrImg.replaceWith(svg);
  }

  if (location.protocol !== 'file:') {
    const sourceTexts = await Promise.all(HOSTED_SOURCE_FILES.map(async file => {
      const response = await fetch('./' + file);
      if (!response.ok) throw new Error('Could not load ' + file);
      return response.text();
    }));
    const inlineScript = document.createElement('script');
    inlineScript.textContent = sourceTexts.join('\n').replace(/<\/script/gi, '<\\/script');
    body.appendChild(inlineScript);
  }

  const serialized = '<!doctype html>\n' + clone.outerHTML;
  const blob = new Blob([serialized], {type: 'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grand-junction-offline-unhoused-phonebook.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

downloadButton.addEventListener('click', async () => {
  downloadButton.disabled = true;
  const originalLabel = downloadButton.textContent;
  downloadButton.textContent = 'Preparing download…';
  try {
    await makeSingleFileDownload();
  } catch (_) {
    showInstallHelp('The single-file download could not be assembled. Try reloading once while online, then use Download again.');
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = originalLabel;
  }
});

shareButton.addEventListener('click', async () => {
  const shareData = {
    title: 'Grand Junction Offline Unhoused Phonebook',
    text: 'Offline-first Grand Junction and Mesa County resource phonebook.',
    url: 'https://falloutmule.github.io/solidarity-not-charity-can-run/phonebook/'
  };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch (_) {}
  }
  showInstallHelp('Share this address: https://falloutmule.github.io/solidarity-not-charity-can-run/phonebook/');
});

function checkOfflineReady(registration) {
  const worker = registration.active || navigator.serviceWorker.controller;
  if (!worker || typeof MessageChannel === 'undefined') return;
  const channel = new MessageChannel();
  const timeout = setTimeout(() => {
    channel.port1.close();
    if (!offlineReady) offlineStatus.textContent = 'Offline copy is not confirmed yet. Download the HTML for a separate saved copy.';
  }, 5000);
  channel.port1.onmessage = event => {
    clearTimeout(timeout);
    channel.port1.close();
    const status = event.data || {};
    offlineReady = status.type === 'OFFLINE_STATUS' && status.cache === OFFLINE_CACHE_NAME && status.ready === true;
    offlineStatus.textContent = offlineReady
      ? 'Ready offline: this phonebook and the recovery guide are saved in this browser. Website links require internet; calls and texts require phone service.'
      : 'Offline setup is incomplete. Reload while online, or download the HTML for a separate saved copy.';
  };
  try {
    worker.postMessage({type: 'CHECK_OFFLINE_READY'}, [channel.port2]);
  } catch (_) {
    clearTimeout(timeout);
    channel.port1.close();
    offlineStatus.textContent = 'Offline copy is not confirmed yet. Reload or download the HTML for a saved copy.';
  }
}

const canRegisterWorker = location.protocol === 'https:' ||
  (location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname));
if (location.protocol === 'file:') {
  offlineStatus.textContent = 'Saved offline copy. Website links require internet; calls and texts require phone service.';
  installButton.textContent = 'Offline copy help';
  installButton.disabled = false;
} else if ('serviceWorker' in navigator && canRegisterWorker) {
  offlineStatus.textContent = 'Saving this phonebook and the recovery guide for offline use…';
  navigator.serviceWorker.register('./sw.js').then(registration => {
    function watch(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') checkOfflineReady(registration);
        if (worker.state === 'redundant' && !offlineReady) offlineStatus.textContent = 'Offline setup did not complete. Download the HTML or reload while online.';
      });
    }
    watch(registration.installing);
    watch(registration.waiting);
    registration.addEventListener('updatefound', () => watch(registration.installing));
    navigator.serviceWorker.ready.then(() => checkOfflineReady(registration));
    navigator.serviceWorker.addEventListener('controllerchange', () => checkOfflineReady(registration));
  }).catch(() => {
    offlineStatus.textContent = 'Offline app setup did not complete. Download the HTML for a saved copy.';
  });
} else {
  offlineStatus.textContent = 'Use Download offline HTML to save a self-contained copy on this device.';
}

window.addEventListener('appinstalled', () => {
  installButton.textContent = 'Installed';
  installButton.disabled = true;
  showInstallHelp(offlineReady
    ? 'Added to the home screen, and the offline copy is ready.'
    : 'Added to the home screen. Wait for the Ready offline message before relying on it without internet.');
});


// Companion recovery guide. Keep the link usable in downloaded single-file copies.
(() => {
  let link = document.getElementById('recoveryGuideLink');
  if (!link) {
    const heading = document.querySelector('header h1');
    if (!heading) return;
    const row = document.createElement('div');
    row.className = 'share-actions';
    link = document.createElement('a');
    link.id = 'recoveryGuideLink';
    link.textContent = 'Recovery programs — Colorado + national';
    row.appendChild(link);
    heading.insertAdjacentElement('afterend', row);
  }
  link.href = location.protocol === 'file:'
    ? 'https://falloutmule.github.io/solidarity-not-charity-can-run/phonebook/recovery.html'
    : './recovery.html';
})();
