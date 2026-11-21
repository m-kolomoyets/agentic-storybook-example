// One stylesheet for the Storybook "Figma diff" panel and the report page, so both look and read the same: the
// variant matrix with its sticky cell inspector (view.ts builds what goes in it), controls, status tones and motion.
// Dark only, like the kit. Everything is scoped under `.fx`: the panel injects it into Storybook's manager, which must
// not restyle. Design: claude.ai artifact "Figma Sync — Storybook addon & report" (Matrix, Main, Report boards).

/** Google Fonts; both renderers fall back to system fonts offline. Keep `.storybook/manager-head.html` in sync. */
export const FIGMA_UI_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

export const FIGMA_UI_CSS = `
.fx {
    --bg: #0a0a0b; --panel: #0d0d0f; --surface: #111113; --raised: #131316; --raised-2: #18181b; --sunken: #0b0b0d;
    --line: #1f1f23; --line-2: #26262b; --line-3: #34343a;
    --ink: #f4f4f2; --ink-2: #e4e4e7; --soft: #c9c9cf; --muted: #a1a1aa; --faint: #8a8a94;
    --match: #3dd68c; --differ: #ff7a4d; --differ-ink: #ffb59a; --approved: #c9c0ff; --approved-bar: #b3a6ff; --nocode: #8a8a94;
    --display: 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif;
    --text: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    color-scheme: dark;
    background: var(--panel); color: var(--ink); font: 400 13px/1.5 var(--text);
    -webkit-font-smoothing: antialiased;
}
.fx *, .fx *::before, .fx *::after { box-sizing: border-box; }
.fx a { color: var(--ink); }
.fx a:hover { color: #fff; }
.fx :focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.fx h1, .fx h2, .fx h3, .fx h4 { margin: 0; font-family: var(--display); font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; }
.fx pre { margin: 0; }
.fx-mono { font-family: var(--mono); }
.fx-muted { color: var(--faint); }
.fx-eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--faint); }
.fx-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.fx-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.fx-link { font-size: 12px; color: var(--muted) !important; text-decoration: none; white-space: nowrap; }
.fx-link:hover { color: var(--ink) !important; }

/* Tones: --tone (text/icon), --tone-bg (fills), --tone-line (borders). */
.fx [data-tone='match'] { --tone: var(--match); --tone-bg: rgb(61 214 140 / 0.12); --tone-line: var(--line-2); }
.fx [data-tone='differ'], .fx [data-tone='error'] { --tone: var(--differ); --tone-bg: rgb(255 122 77 / 0.12); --tone-line: rgb(255 122 77 / 0.45); }
.fx [data-tone='approved'] { --tone: var(--approved); --tone-bg: rgb(179 166 255 / 0.12); --tone-line: rgb(179 166 255 / 0.55); }
.fx [data-tone='nocode'] { --tone: var(--nocode); --tone-bg: var(--raised-2); --tone-line: var(--line-3); }
.fx [data-tone][data-empty] { --tone: var(--faint); --tone-bg: var(--raised-2); }

/* Controls. Press feedback 120ms; colour changes 150ms; reduced motion turns both off. */
.fx button { font-family: inherit; }
.fx-btn, .fx-seg > button, .fx-cell, .fx-icon-btn { transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 200ms ease, transform 120ms var(--ease-out); }
.fx-btn:active:not(:disabled), .fx-seg > button:active, .fx-cell:active, .fx-icon-btn:active { transform: scale(0.97); }
.fx-btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--line-3); background: transparent; color: var(--ink); font-size: 13px; cursor: pointer;
    text-decoration: none; white-space: nowrap; }
.fx-btn:disabled { color: var(--faint); cursor: default; }
.fx-btn--primary { border-color: transparent; background: var(--ink); color: var(--bg) !important; font-weight: 600; }
.fx-btn--lg { height: 40px; padding: 0 16px; }
.fx-icon-btn { width: 32px; height: 32px; border-radius: 999px; border: 1px solid var(--line-3); background: transparent; color: var(--ink); cursor: pointer; }
.fx-cmd { display: inline-flex; align-items: center; gap: 10px; height: 36px; padding: 0 12px; border-radius: 10px;
    border: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font: 12px var(--mono); cursor: pointer; }
.fx-cmd > span:first-child { color: var(--faint); }
.fx-cmd__hint { font: 11px var(--text); color: var(--faint); }
.fx-seg { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 3px; border: 1px solid var(--line-2); border-radius: 999px; }
.fx-seg > button { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); font-size: 12px; cursor: pointer; }
.fx-seg > button[aria-pressed='true'] { background: var(--ink); color: var(--bg); }
.fx-seg__n { font-family: var(--mono); opacity: 0.7; }
.fx-chip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px;
    font-size: 12px; background: var(--tone-bg); color: var(--tone); white-space: nowrap; }
.fx-badge { flex: none; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600; background: var(--tone-bg); color: var(--tone); }

/* "Copied ✓": the label fades and scales in, 150ms. */
.fx-pop { display: inline-block; animation: fx-pop 150ms var(--ease-out); }
@keyframes fx-pop { from { opacity: 0; transform: scale(0.97); } }
.fx-spin { animation: fx-spin 900ms linear infinite; }
@keyframes fx-spin { to { transform: rotate(360deg); } }
.fx-pulse { animation: fx-pulse 1.2s ease-in-out infinite; }
@keyframes fx-pulse { 50% { opacity: 0.45; } }
/* Report bars grow from the left once, 500ms, staggered by the inline animation-delay. */
.fx-grow { transform-origin: left center; animation: fx-grow 500ms var(--ease-out) both; }
@keyframes fx-grow { from { transform: scaleX(0); } }

/* Matrix: summary, toolbar, then the grid with the cell inspector beside it. */
.fx-matrix { display: flex; flex-direction: column; background: var(--panel); }
.fx-matrix__summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px;
    padding: 18px 24px; border-bottom: 1px solid var(--line); }
.fx-headline { font: 600 20px/1.2 var(--display); letter-spacing: -0.01em; }
.fx-headline span { color: var(--faint); }
.fx-matrix__toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px;
    padding: 12px 24px; border-bottom: 1px solid var(--line); }
.fx-matrix__body { container: fx-body / inline-size; display: flex; flex-wrap: wrap; align-items: flex-start; }
.fx-matrix__grid { flex: 999 1 560px; min-width: 0; padding: 18px 24px 28px; display: flex; flex-direction: column; gap: 28px; }
.fx-block { display: flex; flex-direction: column; gap: 16px; }
.fx-block__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.fx-block__head h3 { font-size: 16px; letter-spacing: -0.01em; }
.fx-block__score { font: 11px var(--mono); color: var(--faint); }
.fx-section { display: flex; flex-direction: column; gap: 6px; }
.fx-section > h4 { font: 600 12px var(--text); letter-spacing: 0; color: var(--soft); }
.fx-scroll { overflow: auto clip; }
.fx-grid { border-collapse: separate; border-spacing: 6px; }
.fx-grid th { font-size: 11px; font-weight: 400; color: var(--faint); text-align: center; white-space: nowrap; vertical-align: bottom; }
.fx-grid th[scope='row'] { max-width: 240px; padding-right: 8px; font-size: 12px; line-height: 1.4; color: var(--muted); text-align: left; white-space: normal; vertical-align: middle; }
.fx-grid td { min-width: 76px; padding: 0; }

/* Cell: a thumbnail (story / figma / pixel diff / swipe, picked by data-thumb on the matrix) and its metric. */
.fx-cell { width: 100%; display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 6px 6px 7px;
    border-radius: 12px; border: 1px solid var(--tone-line); background: var(--raised); color: inherit; font: inherit; cursor: pointer; }
.fx-cell[data-tone='differ'], .fx-cell[data-tone='error'] { background: rgb(255 122 77 / 0.06); }
.fx-cell[data-tone='approved'] { border-style: dashed; background: rgb(179 166 255 / 0.05); }
.fx-cell[data-tone='nocode'] { border-style: dashed; background: transparent; }
.fx-cell[aria-pressed='true'] { border: 1px solid var(--ink); box-shadow: 0 0 0 3px rgb(244 244 242 / 0.16); }
.fx-cell__metric { font: 11px var(--mono); color: var(--tone); text-align: center; white-space: nowrap; }
.fx-thumb { position: relative; display: grid; place-items: center; height: 40px; padding: 4px; border-radius: 8px; overflow: hidden; background: var(--sunken); }
.fx-thumb > * { grid-area: 1 / 1; }
.fx-thumb img { display: block; max-width: 100%; max-height: 32px; }
.fx-thumb canvas { display: block; max-width: 100%; max-height: 32px; object-fit: contain; image-rendering: pixelated; }
.fx-thumb [hidden] { display: none; }
.fx-thumb__note { font-size: 10px; color: var(--faint); }
.fx-thumb__note--error { color: var(--differ-ink); }
.fx-thumb__line { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--ink); }
.fx-thumb [data-layer] { visibility: hidden; }
[data-thumb='story'] .fx-thumb [data-layer~='story'],
[data-thumb='figma'] .fx-thumb [data-layer~='figma'],
[data-thumb='diff'] .fx-thumb [data-layer~='diff'],
[data-thumb='swipe'] .fx-thumb [data-layer~='swipe'] { visibility: visible; }
[data-thumb='diff'] .fx-cell:not([data-tone='nocode']) .fx-thumb { background: #000; }
[data-thumb='swipe'] .fx-thumb [data-layer~='swipe-story'] { visibility: visible; clip-path: inset(0 0 0 50%); background: var(--sunken); }
.fx-cell[data-tone='nocode'] .fx-thumb [data-layer~='figma'] { visibility: visible; }
[data-thumb='story'] .fx-cell[data-tone='nocode'] .fx-thumb img,
[data-thumb='diff'] .fx-cell[data-tone='nocode'] .fx-thumb img,
[data-thumb='swipe'] .fx-cell[data-tone='nocode'] .fx-thumb img { opacity: 0.45; }
/* Filter: cells outside it fade to 0.22 (200ms) but stay in place, so the grid keeps its shape. */
[data-filter='differ'] .fx-cell:not([data-tone='differ'], [data-tone='error']),
[data-filter='approved'] .fx-cell:not([data-tone='approved']),
[data-filter='nocode'] .fx-cell:not([data-tone='nocode']),
[data-filter='match'] .fx-cell:not([data-tone='match']) { opacity: 0.22; }

/* Inspector: beside the grid it sticks to the top of the scroller and scrolls on its own when taller. 100cqh is the
   panel's scroller height (a size container); with no such container (report) it falls back to the viewport. */
.fx-inspector { flex: 1 1 380px; max-width: 480px; min-width: 0; padding: 18px 22px 28px; border-left: 1px solid var(--line);
    background: var(--surface); display: flex; flex-direction: column; gap: 16px; }
@container fx-body (min-width: 940px) {
    .fx-inspector { position: sticky; top: var(--fx-sticky-top, 0px); max-height: calc(100cqh - var(--fx-sticky-top, 0px) - var(--fx-sticky-bottom, 0px));
        overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--line-3) transparent; }
}
@container fx-body (max-width: 939.98px) {
    .fx-inspector { max-width: none; border-left: 0; border-top: 1px solid var(--line); }
}
.fx-inspector__nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--faint); }
.fx-inspector__pos { min-width: 52px; font: 11px var(--mono); color: var(--muted); text-align: center; }
.fx-inspector__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.fx-inspector__head h3 { font-size: 19px; line-height: 1.25; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.fx-inspector__when { font: 11px/1.5 var(--mono); color: var(--faint); overflow-wrap: anywhere; }
.fx-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; }
.fx-stats > div { padding: 10px 12px; border-radius: 12px; background: var(--raised-2); display: flex; flex-direction: column; gap: 4px; }
.fx-stats dt { font-size: 11px; color: var(--faint); }
.fx-stats dd { margin: 0; font: 15px var(--mono); }
.fx-stats dd[data-over] { color: var(--differ); }
.fx-tiles { display: grid; grid-template-columns: repeat(var(--tiles, 3), minmax(0, 1fr)); gap: 8px; margin: 0; }
.fx-tile { margin: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.fx-tile__stage { position: relative; display: grid; place-items: center; height: 104px; padding: 8px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--sunken); overflow: hidden; }
.fx-tile__stage[data-diff] { background: #000; }
/* The whole snapshot, at its own aspect ratio, scaled to the card's inner box (up or down); never cropped. */
.fx-tile__stage img, .fx-tile__stage canvas { position: absolute; inset: 8px; width: calc(100% - 16px); height: calc(100% - 16px); object-fit: contain; }
.fx-tile__stage canvas { image-rendering: pixelated; }
.fx-tile__stage [hidden] { display: none; }
/* A tile opens its full-size view (lightbox.ts). */
button.fx-tile__stage { width: 100%; color: inherit; font: inherit; cursor: zoom-in; }
button.fx-tile__stage:disabled { cursor: default; }
/* Full-size view of a tile (lightbox.ts). */
.fx-lightbox { margin: auto; box-sizing: border-box; width: min(1400px, calc(100vw - 48px)); height: calc(100dvh - 48px); max-height: none; padding: 14px;
    border: 1px solid var(--line-3); border-radius: 16px; background: #0a0a0b; color: var(--ink); }
.fx-lightbox[open] { display: flex; flex-direction: column; gap: 10px; }
.fx-lightbox::backdrop { background: rgb(6 6 7 / 0.88); }
.fx-lightbox__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; font: 12px var(--mono); color: var(--soft); }
.fx-lightbox__tools { display: flex; align-items: center; gap: 8px; }
.fx-lightbox__zoom { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--line-2); border-radius: 999px; }
.fx-lightbox__zoom > button { min-width: 40px; height: 26px; padding: 0 10px; border: 0; border-radius: 999px; background: transparent; color: var(--muted);
    font: 11px var(--mono); cursor: pointer; }
.fx-lightbox__zoom > button[aria-pressed='true'] { background: var(--ink); color: #0a0a0b; }
.fx-lightbox__zoom > button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.fx-lightbox__stage { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; padding: 24px; border-radius: 12px;
    border: 1px solid var(--line-2); background: repeating-conic-gradient(#151518 0 25%, #0e0e10 0 50%) 0 0 / 16px 16px;
    scrollbar-width: thin; scrollbar-color: var(--line-3) transparent; }
.fx-lightbox__stage[data-diff] { background: #000; }
.fx-lightbox__stage img, .fx-lightbox__stage canvas { display: block; flex: none; max-width: none; margin: auto; zoom: var(--fx-zoom, 1); image-rendering: pixelated; }
/* Fit: the whole snapshot as large as the stage allows, aspect kept. Fixed zooms: the 2x PNG × n, scrolling. */
.fx-lightbox__stage[data-zoom='fit'] img, .fx-lightbox__stage[data-zoom='fit'] canvas { position: absolute; inset: 24px; width: calc(100% - 48px);
    height: calc(100% - 48px); margin: 0; object-fit: contain; }
/* "What differs" key: same hues as the onion skin (diff-map.ts). */
.fx-diffmap { display: flex; gap: 10px; align-items: baseline; margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
.fx-diffmap__key { display: inline-flex; gap: 3px; flex: none; }
.fx-diffmap__key i { width: 10px; height: 10px; border-radius: 2px; }
.fx-diffmap__key [data-class='colour'] { background: #ffde59; }
.fx-diffmap__key [data-class='figma'] { background: #ff8a3d; }
.fx-diffmap__key [data-class='story'] { background: #4da3ff; }
.fx-tile__stage span { padding: 0 6px; font-size: 11px; line-height: 1.4; color: var(--faint); text-align: center; }
.fx-tile figcaption { font: 10px var(--mono); color: var(--faint); }
.fx-tile a { display: contents; }
.fx-callout { padding: 14px 16px; border-radius: 14px; background: var(--raised-2); line-height: 1.55; color: var(--soft); display: flex; flex-direction: column; gap: 6px; }
.fx-callout strong { color: var(--ink); font-size: 13px; }
.fx-callout[data-kind='error'] { background: rgb(255 122 77 / 0.08); color: var(--ink-2); }
.fx-callout[data-kind='error'] strong { color: var(--differ-ink); }
.fx-callout[data-kind='approved'] { background: rgb(179 166 255 / 0.08); color: var(--ink-2); }
.fx-callout[data-kind='approved'] strong { color: var(--approved); }
.fx-callout[data-kind='match'] { background: rgb(61 214 140 / 0.08); color: #cff5e1; }
.fx-legend { display: flex; align-items: center; gap: 8px; font: 11px var(--mono); color: var(--muted); }
.fx-legend__btn { flex: none; display: inline-grid; place-items: center; width: 24px; height: 24px; padding: 0; border-radius: 999px;
    border: 1px solid var(--line-3); background: transparent; color: var(--soft); font: italic 600 12px var(--text); cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease; }
.fx-legend__btn:hover { background: var(--raised-2); color: var(--ink); }
.fx-popover { max-width: min(340px, calc(100vw - 32px)); margin: auto; padding: 14px 16px; border: 1px solid var(--line-3); border-radius: 12px;
    background: var(--raised); color: var(--ink-2); font: 12px/1.55 var(--text); box-shadow: 0 12px 32px rgb(0 0 0 / 0.5); }
.fx-popover::backdrop { background: rgb(0 0 0 / 0.25); }
.fx-popover strong { display: block; margin-bottom: 8px; font-weight: 600; color: var(--ink); }
.fx-popover ul { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 6px; }
.fx-group { display: flex; flex-direction: column; gap: 8px; }
.fx-group > h4 { font: 600 12px var(--text); letter-spacing: 0; }
.fx-group > h4 span { font: 400 12px var(--mono); color: var(--differ); }
.fx-issue { border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden; }
.fx-issue__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 10px; padding: 8px 12px; background: #151518; font-size: 12px; }
.fx-issue__head .fx-mono { font-size: 11px; color: var(--muted); }
.fx-issue__delta { color: var(--differ); }
.fx-issue__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 6px 12px; border-top: 1px solid var(--line-2); font-size: 11px; color: var(--muted); }
.fx-issue__meta code { font-size: 11px; color: var(--faint); overflow-wrap: anywhere; }
.fx-issue[data-follower] { border-style: dashed; }
.fx-follows { font-style: italic; }
.fx-kind { padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line-3); color: var(--ink); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
.fx-kind[data-severity='3'] { border-color: var(--differ); color: var(--differ); }
.fx-kind[data-severity='2'] { border-color: rgb(255 122 77 / 0.5); }
.fx-kind[data-kind='token-drift'], .fx-kind[data-kind='a11y-deviation'] { border-color: var(--approved); color: var(--approved); }
.fx-contrast { font-family: var(--mono); color: var(--soft); }
.fx-issue__sides { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; }
.fx-issue__sides > div { padding: 9px 12px; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.fx-issue__sides > div + div { border-left: 1px solid var(--line-2); background: rgb(255 122 77 / 0.05); }
.fx-issue__sides dt { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
.fx-issue__sides dd { margin: 0; display: flex; flex-direction: column; gap: 5px; }
.fx-value { display: flex; align-items: center; gap: 8px; font: 12px var(--mono); overflow-wrap: anywhere; }
.fx-issue__sides > div + div .fx-value { color: var(--differ-ink); }
.fx-note { font: 10.5px/1.5 var(--mono); color: var(--muted); overflow-wrap: anywhere; }
.fx-issue__drift { padding: 7px 12px; border-top: 1px solid var(--line-2); font-size: 11px; color: var(--approved); }
.fx-swatch { flex: none; width: 14px; height: 14px; border-radius: 4px; border: 1px solid #3a3a40;
    background: linear-gradient(var(--swatch), var(--swatch)), repeating-conic-gradient(#2a2a2f 0 25%, #1a1a1e 0 50%) 0 0 / 6px 6px; }
.fx-ignored { display: flex; flex-direction: column; gap: 6px; }
.fx-ignored > h4 { font: 600 12px var(--text); letter-spacing: 0; color: var(--faint); }
.fx-ignored li { padding: 8px 12px; border-radius: 10px; border: 1px dashed var(--line-2); font: 11px/1.5 var(--mono); color: var(--faint); list-style: none; }
.fx-ignored ul { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.fx-fix { display: flex; flex-direction: column; gap: 8px; }
.fx-fix > h4 { font: 600 12px var(--text); letter-spacing: 0; }
.fx-pre { max-height: 150px; overflow: auto; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--bg);
    font: 11px/1.6 var(--mono); color: var(--soft); white-space: pre-wrap; }
.fx-fix__note { font-size: 11px; line-height: 1.5; color: var(--faint); }

/* Prompt dialog: review and edit a prompt before copying it. */
.fx-prompt { margin: auto; width: min(880px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); padding: 16px; border: 1px solid var(--line-3);
    border-radius: 16px; background: var(--bg); color: var(--ink); }
.fx-prompt[open] { display: flex; flex-direction: column; gap: 12px; }
.fx-prompt::backdrop { background: rgb(6 6 7 / 0.88); }
.fx-prompt__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.fx-prompt__head h2 { font-size: 15px; }
.fx-prompt textarea { width: 100%; min-height: min(60dvh, 520px); resize: vertical; padding: 12px 14px; border-radius: 12px;
    border: 1px solid var(--line-2); background: var(--panel); color: var(--ink-2); font: 12px/1.6 var(--mono); }
.fx-prompt__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 11px; color: var(--faint); }

/* Loading and empty states (panel). */
.fx-skeleton { display: flex; flex-direction: column; gap: 10px; }
.fx-skeleton > div { height: 22px; border-radius: 8px; background: var(--raised-2); }
.fx-empty { display: flex; justify-content: center; padding: 56px 24px 72px; }
.fx-empty > div { max-width: 460px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
.fx-empty h2 { font-size: 22px; }
.fx-empty p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--muted); }

@media (prefers-reduced-motion: reduce) {
    .fx *, .fx *::before, .fx *::after { animation: none !important; transition: none !important; }
}
`;
