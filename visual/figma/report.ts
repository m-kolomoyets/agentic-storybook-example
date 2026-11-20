// Builds visual/.results/figma/index.html from the last `pnpm vrt figma` (visual/FIGMA-TESTING.md):
// - every FigmaMatrix story, one block per Figma component set, laid out like the set (its own variant properties);
//   one switch flips every cell between story, Figma, pixel diff and a swipe overlay;
// - kit coverage: every component set in the Figma file (catalog.json) and whether a matrix holds it to the code.
// Image paths are relative, so the page works from disk, as a CI artifact, and through Storybook's `/__visual` route.
import type { FigmaBlockResult, FigmaCatalog, FigmaCellResult, FigmaStoryResult } from './types.ts';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { layoutMatrix } from './layout.ts';
import { parseFigmaUrl } from './sets.ts';
import { FIGMA_REFS_DIR, FIGMA_RESULTS_DIR } from './types.ts';

const STORYBOOK_URL = 'http://localhost:6006';

const MARK: Record<FigmaCellResult['status'], string> = { pass: '✓', fail: '✕', approved: '≈', missing: '∅' };

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
        return `&#${char.charCodeAt(0)};`;
    });
}

function percent(ratio: number | null): string {
    return ratio === null ? '' : `${(ratio * 100).toFixed(1)} %`;
}

function cellHtml(cell: FigmaCellResult, toPage: (file: string) => string): string {
    const img = (file: string, layer: string, alt: string) => {
        return `<img class="layer ${layer}" srcset="${escapeHtml(toPage(file))} 2x" alt="${escapeHtml(alt)}">`;
    };
    const name = cell.variant.name;
    const notes = [
        ...cell.spec.mismatches,
        ...(cell.image.error ? [`image: ${cell.image.error.replace(/ Reference screenshot:.*/, '')}`] : []),
    ];
    let stage: string;
    if (cell.files.actual) {
        const diff = cell.files.diff
            ? img(cell.files.diff, 'diff', `Diff: ${name}`)
            : '<span class="layer diff identical">identical</span>';
        stage = `${img(cell.files.reference, 'figma', `Figma: ${name}`)}${img(cell.files.actual, 'story', `Story: ${name}`)}${diff}`;
    } else {
        // No code equivalent: Figma only, in every view.
        stage = img(cell.files.figma, 'figma always', `Figma: ${name}`);
    }
    const label = cell.status === 'missing' ? 'no code' : percent(cell.image.ratio);
    const issues =
        notes.length && cell.status === 'fail'
            ? `<ul class="issues">${notes
                  .map((line) => {
                      return `<li>${escapeHtml(line)}</li>`;
                  })
                  .join('')}</ul>`
            : '';

    return `
<div class="cell" data-status="${cell.status}" title="${escapeHtml(name)}">
    <span class="chip ${cell.status}">${MARK[cell.status]} ${label}</span>
    <div class="stage">${stage}</div>
    ${cell.approval ? `<p class="approval">${escapeHtml(cell.approval)}</p>` : ''}
    ${issues}
</div>`;
}

function blockHtml(block: FigmaBlockResult, toPage: (file: string) => string): string {
    const items = block.cells.map((cell) => {
        return { ...cell, props: cell.variant.props };
    });
    const tables = layoutMatrix(block.axes, block.layout, items).map((section) => {
        const rowHeaders = section.rows.some((row) => {
            return row.label !== '';
        });
        const columns = section.columns
            .map((column) => {
                return `<th scope="col">${escapeHtml(column)}</th>`;
            })
            .join('');
        const head = `<tr>${rowHeaders ? '<th scope="col"><span class="sr">Variant</span></th>' : ''}${columns}</tr>`;
        const body = section.rows
            .map((row) => {
                const cells = row.cells
                    .map((cell) => {
                        return `<td>${cell ? cellHtml(cell, toPage) : ''}</td>`;
                    })
                    .join('');

                return `<tr>${rowHeaders ? `<th scope="row">${escapeHtml(row.label)}</th>` : ''}${cells}</tr>`;
            })
            .join('');
        const caption = section.title ? `<caption>${escapeHtml(section.title)}</caption>` : '';

        return `<div class="scroll"><table>${caption}<thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    });

    return `
<section class="block">
    <h3>${escapeHtml(block.set.name)} <a href="${escapeHtml(block.set.url)}" target="_blank" rel="noreferrer">Figma ↗</a></h3>
    ${tables.join('\n')}
</section>`;
}

function count(cells: FigmaCellResult[], status: FigmaCellResult['status']): number {
    return cells.filter((cell) => {
        return cell.status === status;
    }).length;
}

function summary(cells: FigmaCellResult[]): string {
    const failing = count(cells, 'fail');
    const approved = count(cells, 'approved');
    const missing = count(cells, 'missing');

    return [
        `<span class="chip ${failing ? 'fail' : 'pass'}">${count(cells, 'pass')}/${cells.length - missing} match</span>`,
        failing ? `<span class="chip fail">${failing} failing</span>` : '',
        approved ? `<span class="chip approved">${approved} approved</span>` : '',
        missing ? `<span class="chip missing">${missing} no code</span>` : '',
    ].join(' ');
}

function storyLink(storyId: string, label: string): string {
    const id = escapeHtml(storyId);

    return `<a class="story-link" data-story="${id}" href="${STORYBOOK_URL}/?path=/story/${id}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function storyHtml(result: FigmaStoryResult, toPage: (file: string) => string): string {
    const cells = result.blocks.flatMap((block) => {
        return block.cells;
    });

    return `
<section class="component" data-failing="${count(cells, 'fail')}">
    <header>
        <h2>${escapeHtml(result.title)} / ${escapeHtml(result.name)}</h2>
        ${summary(cells)}
        ${storyLink(result.storyId, 'Storybook')}
        <span class="muted">ran ${escapeHtml(new Date(result.ranAt).toLocaleString())}</span>
    </header>
    ${result.blocks
        .map((block) => {
            return blockHtml(block, toPage);
        })
        .join('\n')}
</section>`;
}

function coverageHtml(catalog: FigmaCatalog | null, results: FigmaStoryResult[]): string {
    if (!catalog) {
        return '';
    }
    const covered = new Map<string, string>();
    for (const result of results) {
        for (const block of result.blocks) {
            covered.set(parseFigmaUrl(block.set.url).nodeId, result.storyId);
        }
    }
    const rows = catalog.sets
        .map((set) => {
            const storyId = covered.get(set.nodeId);
            const url = `https://www.figma.com/design/${catalog.fileKey}/?node-id=${set.nodeId.replace(':', '-')}`;
            const matrix = storyId ? storyLink(storyId, storyId) : '<span class="muted">not held to code yet</span>';

            return `<tr data-covered="${storyId ? 'yes' : 'no'}"><td>${escapeHtml(set.page)}</td><td><a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(set.name)}</a></td><td>${escapeHtml(set.frame)}</td><td>${matrix}</td></tr>`;
        })
        .join('');
    const synced = escapeHtml(new Date(catalog.syncedAt).toLocaleDateString());

    return `
<details class="component coverage">
    <summary><h2>Kit coverage</h2> <span class="chip pass">${covered.size}/${catalog.sets.length} Figma component sets have a matrix</span></summary>
    <p class="muted">Every component set in the Figma file (catalog synced ${synced}). To add one: its URL to visual/figma/sets.ts, a FigmaMatrix story, then <code>pnpm vrt figma</code>.</p>
    <div class="scroll"><table class="list"><thead><tr><th scope="col">Page</th><th scope="col">Component set</th><th scope="col">Frame</th><th scope="col">Matrix story</th></tr></thead><tbody>${rows}</tbody></table></div>
</details>`;
}

const STYLE = `
:root { color-scheme: light dark; --bg: #f6f7fa; --surface: #fff; --fg: #1b1d26; --muted: #646a7d; --line: #dde0e8;
    --accent: #3d55d6; --pass: #17794a; --pass-bg: #e2f4ea; --fail: #b3261e; --fail-bg: #fbe4e2;
    --approved: #8a5a00; --approved-bg: #fbf0d6; --missing: #5d6273; --missing-bg: #eceef3; }
@media (prefers-color-scheme: dark) { :root { --bg: #12141b; --surface: #1a1d26; --fg: #e8eaf2; --muted: #9aa0b4;
    --line: #2c3040; --accent: #8fa0ff; --pass: #6fd39b; --pass-bg: #173526; --fail: #ff8f86; --fail-bg: #3d1c1a;
    --approved: #f0c062; --approved-bg: #3a2e12; --missing: #a4aabd; --missing-bg: #262a36; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 48px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; }
main { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
h1 { margin: 0; font-size: 22px; } h2 { margin: 0; font-size: 16px; display: inline; } h3 { margin: 0 0 8px; font-size: 14px; }
a { color: var(--accent); }
.muted { color: var(--muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.toolbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px;
    padding: 10px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
.toolbar fieldset { border: 0; margin: 0; padding: 0; display: flex; gap: 4px; align-items: center; }
.toolbar legend { float: left; margin-right: 8px; font-weight: 600; }
.toolbar label.seg { padding: 4px 10px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
.toolbar input[type=radio] { position: absolute; opacity: 0; }
.toolbar input[type=radio]:checked + span { color: var(--accent); font-weight: 600; }
.toolbar label.seg:has(input:checked) { border-color: var(--accent); }
.toolbar label.seg:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
.component { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 18px; }
.component header, .coverage summary { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.coverage summary { cursor: pointer; }
.block { border-top: 1px solid var(--line); padding-top: 12px; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; }
caption { text-align: left; font-weight: 600; padding: 4px 0 8px; }
th { font-size: 12px; font-weight: 500; color: var(--muted); text-align: left; padding: 4px 12px 4px 0; vertical-align: middle; }
td { padding: 6px 14px 10px 0; vertical-align: top; }
.list td { padding: 4px 16px 4px 0; vertical-align: baseline; }
.list tr[data-covered=yes] td:first-child::before { content: '● '; color: var(--pass); }
.chip { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.chip.pass { color: var(--pass); background: var(--pass-bg); } .chip.fail { color: var(--fail); background: var(--fail-bg); }
.chip.approved { color: var(--approved); background: var(--approved-bg); } .chip.missing { color: var(--missing); background: var(--missing-bg); }
.cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; max-width: 340px; }
.cell[data-status=fail] .stage { outline: 2px solid var(--fail); }
.cell[data-status=approved] .stage { outline: 2px dashed var(--approved); }
.cell[data-status=missing] .stage { opacity: 0.55; outline: 1px dashed var(--missing); }
.stage { display: inline-grid; padding: 4px; border-radius: 4px; }
.layer { grid-area: 1 / 1; display: block; max-width: none; }
.identical { font-size: 11px; color: var(--muted); align-self: center; }
.approval { margin: 0; font-size: 11px; color: var(--approved); }
.issues { margin: 0; padding-left: 16px; font: 11px/1.4 ui-monospace, monospace; color: var(--fail); }
body[data-view=figma] .layer:not(.figma),
body[data-view=story] .layer:not(.story):not(.always),
body[data-view=diff] .layer:not(.diff):not(.always) { visibility: hidden; }
body[data-view=swipe] .layer.diff { visibility: hidden; }
body[data-view=swipe] .layer.story { clip-path: inset(0 calc(100% - var(--swipe, 50%)) 0 0); }
body:not([data-view=swipe]) .swipe-only { display: none; }
body.failing-only .component[data-failing="0"]:not(.coverage), body.failing-only .cell:not([data-status=fail]) { opacity: 0.25; }
`;

// View switch, swipe position, failure highlight; story links go same-origin when served by Storybook.
const SCRIPT = `
for (const input of document.querySelectorAll('input[name=view]')) {
    input.addEventListener('change', () => { document.body.dataset.view = input.value; });
}
document.querySelector('#swipe').addEventListener('input', (event) => {
    document.body.style.setProperty('--swipe', event.target.value + '%');
});
document.querySelector('#failing').addEventListener('change', (event) => {
    document.body.classList.toggle('failing-only', event.target.checked);
});
if (location.protocol.startsWith('http')) {
    for (const link of document.querySelectorAll('.story-link')) {
        link.href = '/?path=/story/' + link.dataset.story;
    }
}
`;

async function readJson<T>(file: string): Promise<T | null> {
    try {
        return JSON.parse(await readFile(file, 'utf8')) as T;
    } catch {
        return null;
    }
}

/** Writes the report and returns its path, or null when there are no results. */
export async function writeFigmaReport(root: string): Promise<string | null> {
    const resultsDir = path.join(root, FIGMA_RESULTS_DIR);
    let files: string[];
    try {
        files = (await readdir(path.join(resultsDir, 'results'))).filter((file) => {
            return file.endsWith('.json');
        });
    } catch {
        return null;
    }
    const results = (
        await Promise.all(
            files.map((file) => {
                return readJson<FigmaStoryResult>(path.join(resultsDir, 'results', file));
            })
        )
    ).filter((result): result is FigmaStoryResult => {
        return result !== null;
    });
    const catalog = await readJson<FigmaCatalog>(path.join(root, FIGMA_REFS_DIR, 'catalog.json'));
    const cellsOf = (result: FigmaStoryResult) => {
        return result.blocks.flatMap((block) => {
            return block.cells;
        });
    };
    results.sort((a, b) => {
        return count(cellsOf(b), 'fail') - count(cellsOf(a), 'fail') || a.title.localeCompare(b.title);
    });
    const all = results.flatMap(cellsOf);
    const toPage = (file: string) => {
        return path.relative(resultsDir, path.join(root, file)).split(path.sep).join('/');
    };
    const views = [
        ['story', 'Story'],
        ['figma', 'Figma'],
        ['diff', 'Diff'],
        ['swipe', 'Swipe'],
    ]
        .map(([value, label]) => {
            const checked = value === 'story' ? ' checked' : '';

            return `<label class="seg"><input type="radio" name="view" value="${value}"${checked}><span>${label}</span></label>`;
        })
        .join('');
    const legend = '✓ match · ✕ fails · ≈ approved deviation · ∅ no code equivalent';

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figma matrix report</title>
<style>${STYLE}</style>
</head>
<body data-view="story">
<main>
    <h1>Figma matrix report</h1>
    <p>${results.length} components · ${all.length} Figma variants · ${summary(all)} <span class="muted">· ${legend} · generated ${new Date().toLocaleString()}</span></p>
    <div class="toolbar">
        <fieldset><legend>Show</legend>${views}</fieldset>
        <label class="swipe-only">Swipe (story ← → Figma) <input type="range" id="swipe" min="0" max="100" value="50"></label>
        <label><input type="checkbox" id="failing"> Highlight failures</label>
    </div>
    ${results
        .map((result) => {
            return storyHtml(result, toPage);
        })
        .join('\n')}
    ${coverageHtml(catalog, results)}
</main>
<script>${SCRIPT}</script>
</body>
</html>
`;
    const file = path.join(resultsDir, 'index.html');
    await writeFile(file, html);

    return file;
}
