// Opens the feedback survey in a pop-up over the current page instead of
// leaving it. Mark links with data-survey-pop; they stay ordinary links to
// /survey/ when this script doesn't run, or when opened in a new tab.
// The page supplies the brand tokens (--oy-*) through its own :root.

const SRC = '/survey/?embed';

const CSS = `
  .survey-pop {
    width: min(1100px, calc(100vw - 32px));
    height: min(880px, calc(100dvh - 32px));
    max-width: none;
    max-height: none;
    margin: auto;
    padding: 0;
    border: 1.5px solid var(--oy-ink);
    border-radius: var(--oy-radius-lg);
    background: var(--oy-cream);
    color: var(--oy-ink);
    overflow: hidden;
  }
  .survey-pop[open] { display: flex; flex-direction: column; }
  /* ink at 60%; ::backdrop can't rely on inheriting the page's tokens everywhere */
  .survey-pop::backdrop { background: rgba(28, 25, 23, 0.6); }
  html:has(.survey-pop[open]) { overflow: hidden; }
  .survey-pop-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 4px 4px 18px;
    border-bottom: 1.5px solid var(--oy-ink);
  }
  .survey-pop-title {
    font-family: var(--oy-font-mono);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .survey-pop-close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    background: transparent;
    border: none;
    font: 28px/1 var(--oy-font-body);
    color: var(--oy-ink);
    cursor: pointer;
  }
  .survey-pop-close:hover { color: var(--oy-red); }
  .survey-pop-close:focus-visible { outline: 2px solid var(--oy-red); outline-offset: -4px; }
  .survey-pop iframe { flex: 1; display: block; width: 100%; border: 0; background: var(--oy-cream); }
  @media (max-width: 640px) {
    .survey-pop { width: 100vw; height: 100dvh; border: none; border-radius: 0; }
  }
`;

let dialog;

function build() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  dialog = document.createElement('dialog');
  dialog.className = 'survey-pop';
  dialog.setAttribute('aria-label', 'Tramokyo 2026 feedback survey');
  dialog.innerHTML = `
    <div class="survey-pop-bar">
      <span class="survey-pop-title">Form F-26 · Feedback</span>
      <button class="survey-pop-close" type="button" aria-label="Close the survey">×</button>
    </div>
    <iframe title="Tramokyo 2026 feedback survey"></iframe>`;
  dialog.querySelector('.survey-pop-close').addEventListener('click', () => dialog.close());
  // a click on the backdrop lands on the dialog itself
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  // Escape pressed inside the survey never reaches this page's dialog, so listen in there too
  const frame = dialog.querySelector('iframe');
  frame.addEventListener('load', () => {
    try {
      frame.contentWindow.addEventListener('keydown', (e) => { if (e.key === 'Escape') dialog.close(); });
    } catch (_) { /* not same-origin: Escape still works once focus is back on this page */ }
  });
  document.body.append(dialog);
}

function open() {
  if (!dialog) build();
  const frame = dialog.querySelector('iframe');
  dialog.showModal();
  // Load once: closing keeps the survey where it was, and it saves a draft anyway.
  // Focus goes into the survey so its keyboard shortcuts work straight away.
  if (!frame.getAttribute('src')) {
    frame.addEventListener('load', () => frame.focus(), { once: true });
    frame.src = SRC;
  } else {
    frame.focus();
  }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-survey-pop]');
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  open();
});
