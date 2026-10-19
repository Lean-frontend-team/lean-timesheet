// Install page: turns the bundled bookmarklet into a draggable link and copy buttons.
import code from 'virtual:bookmarklet';

const bookmark = 'javascript:' + encodeURIComponent(code);
const link = document.getElementById('bookmarklet');
link.href = bookmark;
link.addEventListener('click', (e) => {
  e.preventDefault();
  alert('Drag this button to your bookmarks bar, then use it on erp.lean.sa.');
});

const copy = async (text, okId) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  const ok = document.getElementById(okId);
  ok.hidden = false;
  setTimeout(() => (ok.hidden = true), 2000);
};
document.getElementById('copyLink').onclick = () => copy(bookmark, 'copiedLink');
document.getElementById('copyCode').onclick = () => copy(code, 'copiedCode');

// Browser tabs; open the one matching the visitor's browser
document.querySelectorAll('[data-tab]').forEach(
  (b) =>
    (b.onclick = () => {
      document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      document
        .querySelectorAll('[data-panel]')
        .forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
    }),
);
if (
  /Mac/.test(navigator.platform) &&
  /Safari/.test(navigator.userAgent) &&
  !/Chrome|Edg|Firefox/.test(navigator.userAgent)
)
  document.querySelector('[data-tab="safari"]').click();
else if (/Firefox/.test(navigator.userAgent))
  document.querySelector('[data-tab="firefox"]').click();
