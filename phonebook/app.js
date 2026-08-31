const resources = window.PHONEBOOK_RESOURCES || [];
const tabs = document.getElementById('tabs');
const main = document.getElementById('main');
const search = document.getElementById('search');
const category = document.getElementById('category');
let activeId = localStorage.getItem('gj-phonebook-active') || 'start';
let printMode = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function telHref(number) {
  return 'tel:' + String(number).replace(/[^0-9+]/g,'');
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
  tabs.innerHTML = list.length ? list.map(r => `
    <button class="tab ${r.id===activeId?'active':''} ${r.urgent?'urgent':''}" data-id="${escapeHtml(r.id)}" type="button">
      <span class="name">${escapeHtml(r.name)}</span>
      <span class="cat">${escapeHtml(r.category)}</span>
    </button>`).join('') : '<div class="empty">No matching resources.</div>';
  tabs.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    activeId = btn.dataset.id;
    localStorage.setItem('gj-phonebook-active', activeId);
    renderTabs();
    renderMain();
    document.getElementById('main').focus({preventScroll:true});
    if (window.innerWidth < 801) window.scrollTo({top: tabs.offsetTop - 8, behavior:'smooth'});
  }));
}
function phonesHtml(r) {
  if (!r.phones || !r.phones.length) return '';
  return `<div class="phone-grid">${r.phones.map(p => `
    <a class="phone" href="${telHref(p.number)}">
      <span>${escapeHtml(p.label)}</span>
      <strong>${escapeHtml((p.prefix||'') + p.number)}</strong>
    </a>`).join('')}</div>`;
}
function info(label, value) {
  if (!value) return '';
  return `<div class="info"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(value)}</p></div>`;
}
function sourcesHtml(r) {
  if (!r.sources || !r.sources.length) return '<p class="small-note">No external source link is needed for this universal emergency entry.</p>';
  return `<div class="sources">${r.sources.map(s=>`<a href="${escapeHtml(s.url)}" target="_blank" rel="noreferrer">${escapeHtml(s.label)}</a>`).join('')}</div>`;
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
  const r = resources.find(x=>x.id===activeId) || filtered()[0];
  main.innerHTML = r ? cardHtml(r) : '<div class="empty">No matching resources.</div>';
}
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

let deferredInstallPrompt = null;
const installButton = document.getElementById('installApp');
const shareButton = document.getElementById('shareApp');
const installHelp = document.getElementById('installHelp');
const downloadButton = document.getElementById('downloadHtml');

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
    showInstallHelp('This is already the permanent offline HTML copy. Keep the file or add a shortcut to it using your phone or file manager.');
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (_) {}
    deferredInstallPrompt = null;
    return;
  }
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua);
  if (ios) {
    showInstallHelp('iPhone/iPad: open this page in Safari, tap Share, choose Add to Home Screen, then tap Add.');
  } else {
    showInstallHelp('If no install prompt appears: open the browser menu and choose Install app or Add to Home screen. You can always use Download offline HTML instead.');
  }
});


const HOSTED_SOURCE_FILES = ["resources-01.js", "resources-02.js", "resources-03.js", "resources-04.js", "resources-05.js", "resources-06.js", "resources-07.js", "resources-08.js", "resources-09.js", "resources-10.js", "resources-11.js", "resources-12.js", "app.js"];

async function makeSingleFileDownload() {
  const clone = document.documentElement.cloneNode(true);
  const body = clone.querySelector('body');

  clone.querySelectorAll('script[src]').forEach(node => node.remove());
  clone.querySelectorAll('link[rel="manifest"],link[rel="icon"]').forEach(node => node.remove());

  const qrImg = clone.querySelector('[data-share-qr]');
  if (qrImg) {
    try {
      const qrResponse = await fetch('./share-qr.svg');
      if (qrResponse.ok) {
        const qrText = await qrResponse.text();
        const holder = document.createElement('span');
        holder.innerHTML = qrText;
        const svg = holder.querySelector('svg');
        if (svg) {
          svg.classList.add('embedded-qr');
          qrImg.replaceWith(svg);
        }
      }
    } catch (_) {}
  }

  if (location.protocol !== 'file:') {
    const sourceTexts = await Promise.all(HOSTED_SOURCE_FILES.map(async file => {
      const response = await fetch('./' + file);
      if (!response.ok) throw new Error('Could not load ' + file);
      return response.text();
    }));
    const inlineScript = document.createElement('script');
    inlineScript.textContent = sourceTexts.join('\n');
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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    showInstallHelp('Offline app setup did not complete. The phonebook still works online, and the downloadable HTML remains available.');
  });
}

window.addEventListener('appinstalled', () => {
  installButton.textContent = 'Installed';
  installButton.disabled = true;
  showInstallHelp('Installed. The phonebook can now be opened from the home screen and used offline.');
});

