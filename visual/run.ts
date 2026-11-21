/* eslint-disable no-console -- CLI script: console is its output. */
// Visual-regression comparison runner: same `vrt`-tagged stories through DIY, Argos and Chromatic.
// Usage: pnpm vrt <diy|argos|chromatic|figma|all> [--update] [--refresh] [--host-browser]; pnpm vrt figma --doctor
// Figma variable names (visual/figma/variables.ts): pnpm vrt figma --variables-script | --variables <file> <fnv>
// `figma` is not regression: it holds `figma`-tagged stories to Figma itself; `all` runs the three regression tools.
// Each run appends one record to visual/runs.jsonl (committed) — the input for the final comparison report.
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { runFigmaDoctor } from './figma/doctor.ts';
import {
    figmaVariablesScript,
    mergeFigmaVariables,
    syncFigmaCatalog,
    syncFigmaSets,
    unnamedFigmaVariables,
} from './figma/figma-api.ts';
import { writeFigmaReport } from './figma/report.ts';

type Tool = 'diy' | 'argos' | 'chromatic' | 'figma';
type VitestTool = Exclude<Tool, 'chromatic'>;

type RunRecord = {
    tool: Tool;
    startedAt: string;
    durationMs: number;
    exitCode: number;
    browser: 'docker-linux' | 'host' | 'chromatic-cloud';
    update: boolean;
    stories: number;
    passed: number | null;
    changed: number | null;
    failed: number | null;
    url: string | null;
};

type VitestJson = {
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    testResults: { assertionResults: { status: string; failureMessages: string[] }[] }[];
};

const TOOLS: Tool[] = ['diy', 'argos', 'chromatic', 'figma'];
const REGRESSION_TOOLS: Tool[] = ['diy', 'argos', 'chromatic'];
const VRT_TAG = 'vrt';
const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS = path.join(ROOT, 'visual/.results');
const RUNS_LOG = path.join(ROOT, 'visual/runs.jsonl');
const DOCKER_WS = 'ws://127.0.0.1:3100/';

const args = process.argv.slice(2);
const target = args.find((arg) => {
    return !arg.startsWith('--');
});
const update = args.includes('--update');
const refresh = args.includes('--refresh');
const doctor = args.includes('--doctor');
const hostBrowser = args.includes('--host-browser');

function run(cmd: string, cmdArgs: string[], env: NodeJS.ProcessEnv = {}): Promise<number> {
    return new Promise((resolve) => {
        const child = spawn(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
        child.on('close', (code) => {
            resolve(code ?? 1);
        });
    });
}

async function readJson<T>(file: string): Promise<T | null> {
    try {
        return JSON.parse(await readFile(file, 'utf8')) as T;
    } catch {
        return null;
    }
}

async function assertDockerBrowser() {
    try {
        await fetch(DOCKER_WS.replace('ws:', 'http:'));
    } catch {
        throw new Error(
            'Docker browser not reachable on :3100. Start it: `pnpm vrt:browser` (or pass --host-browser).'
        );
    }
}

async function runVitest(tool: VitestTool): Promise<Omit<RunRecord, 'tool' | 'startedAt' | 'durationMs'>> {
    if (tool === 'argos' && !process.env.ARGOS_TOKEN) {
        throw new Error('ARGOS_TOKEN missing (.env.local).');
    }
    if (!hostBrowser) {
        await assertDockerBrowser();
    }
    if (tool === 'figma') {
        // Figma sets (visual/figma/sets.ts) into the committed cache first; stories render from it.
        console.log('[vrt:figma] sets:', await syncFigmaSets(ROOT, refresh));
        console.log('[vrt:figma] kit catalog:', await syncFigmaCatalog(ROOT, refresh));
        const unnamed = await unnamedFigmaVariables(ROOT);
        if (unnamed.length) {
            console.warn(
                `[vrt:figma] ${unnamed.length} bound Figma variables have no name in visual/figma/__refs__/variables.json; rows show them by id. Run \`pnpm vrt figma --variables-script\` and follow .claude/skills/figma-matrix/SKILL.md → Variables.`
            );
        }
    }

    const jsonFile = path.join(RESULTS, `${tool}.vitest.json`);
    const exitCode = await run(
        'pnpm',
        [
            'exec',
            'vitest',
            'run',
            `--project=vrt-${tool}`,
            '--reporter=default',
            '--reporter=json',
            `--outputFile.json=${jsonFile}`,
            ...(update && tool === 'diy' ? ['--update'] : []),
        ],
        {
            ...(!hostBrowser && { VRT_BROWSER_WS: DOCKER_WS }),
        }
    );
    const report = await readJson<VitestJson>(jsonFile);
    const failures = report?.testResults.flatMap((file) => {
        return file.assertionResults.filter((test) => {
            return test.status === 'failed';
        });
    });
    // DIY/Figma: a screenshot mismatch is a "change"; anything else (spec, play fn, a11y, timeout) is a failure.
    const changed =
        tool === 'diy' || tool === 'figma'
            ? (failures?.filter((test) => {
                  return test.failureMessages.some((message) => {
                      return message.includes(tool === 'figma' ? 'Figma image' : 'toMatchScreenshot');
                  });
              }).length ?? null)
            : null;

    return {
        exitCode,
        browser: hostBrowser ? 'host' : 'docker-linux',
        update,
        stories: report?.numTotalTests ?? 0,
        passed: report?.numPassedTests ?? null,
        changed,
        failed: report && changed !== null ? report.numFailedTests - changed : (report?.numFailedTests ?? null),
        // Argos prints the build URL; changes are reviewed there. Figma: the local report page.
        url: tool === 'figma' ? await writeFigmaReport(ROOT) : null,
    };
}

type StoryIndex = { entries: Record<string, { type: string; title: string; name: string; tags?: string[] }> };
type ChromaticDiagnostics = {
    build?: { webUrl?: string; changeCount?: number; errorCount?: number; actualTestCount?: number };
};

async function runChromatic(): Promise<Omit<RunRecord, 'tool' | 'startedAt' | 'durationMs'>> {
    if (!process.env.CHROMATIC_PROJECT_TOKEN) {
        throw new Error('CHROMATIC_PROJECT_TOKEN missing (.env.local).');
    }

    const buildExit = await run('pnpm', ['build-storybook', '--quiet']);
    if (buildExit !== 0) {
        throw new Error('build-storybook failed.');
    }

    const index = await readJson<StoryIndex>(path.join(ROOT, 'storybook-static/index.json'));
    const storyNames = Object.values(index?.entries ?? {})
        .filter((entry) => {
            return entry.type === 'story' && entry.tags?.includes(VRT_TAG);
        })
        .map((entry) => {
            return `${entry.title}/${entry.name}`;
        });
    if (storyNames.length === 0) {
        throw new Error(`No stories tagged "${VRT_TAG}".`);
    }

    const diagnosticsFile = path.join(RESULTS, 'chromatic.diagnostics.json');
    const exitCode = await run('pnpm', [
        'exec',
        'chromatic',
        '--storybook-build-dir=storybook-static',
        `--diagnostics-file=${diagnosticsFile}`,
        '--exit-zero-on-changes',
        '--skip-update-check',
        ...(update ? ['--auto-accept-changes'] : []),
        ...storyNames.flatMap((name) => {
            return ['--only-story-names', name];
        }),
    ]);
    const build = (await readJson<ChromaticDiagnostics>(diagnosticsFile))?.build;

    return {
        exitCode,
        browser: 'chromatic-cloud',
        update,
        stories: storyNames.length,
        passed: build?.actualTestCount !== undefined ? build.actualTestCount - (build.changeCount ?? 0) : null,
        changed: build?.changeCount ?? null,
        failed: build?.errorCount ?? null,
        url: build?.webUrl ?? null,
    };
}

async function runTool(tool: Tool): Promise<RunRecord> {
    const startedAt = new Date();
    await rm(path.join(RESULTS, tool), { recursive: true, force: true });
    const result = tool === 'chromatic' ? await runChromatic() : await runVitest(tool);
    const record: RunRecord = {
        tool,
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        ...result,
    };
    await appendFile(RUNS_LOG, `${JSON.stringify(record)}\n`);

    return record;
}

if (!target || (target !== 'all' && !TOOLS.includes(target as Tool)) || (update && target === 'figma')) {
    // `--update` on figma would overwrite Figma's PNGs with screenshots; `--refresh` refetches them instead.
    console.error(
        'Usage: pnpm vrt <diy|argos|chromatic|figma|all> [--update (not figma)] [--refresh] [--host-browser]'
    );
    process.exit(2);
}

const variablesFlag = args.indexOf('--variables');
if (target === 'figma' && args.includes('--variables-script')) {
    // Prints the read-only `use_figma` script that names the bound variables the catalogue lacks.
    console.log((await figmaVariablesScript(ROOT)) ?? 'Every bound Figma variable is named; nothing to export.');
    process.exit(0);
}
if (target === 'figma' && variablesFlag !== -1) {
    const [file, checksum] = args.slice(variablesFlag + 1);
    if (!file || !checksum) {
        console.error("Usage: pnpm vrt figma --variables <file with the script's lines> <fnv from the script>");
        process.exit(2);
    }
    try {
        console.log(`[vrt:figma] named ${await mergeFigmaVariables(ROOT, path.resolve(file), checksum)} variables.`);
    } catch (error) {
        console.error(`[vrt:figma] ${(error as Error).message}`);
        process.exit(1);
    }
    process.exit(0);
}

if (doctor && target === 'figma') {
    // `pnpm vrt figma --doctor`: readiness check only (visual/figma/doctor.ts); runs nothing.
    process.exit((await runFigmaDoctor(ROOT, DOCKER_WS)) ? 0 : 1);
}

await mkdir(RESULTS, { recursive: true });
const selected = target === 'all' ? REGRESSION_TOOLS : [target as Tool];
const records: RunRecord[] = [];
for (const tool of selected) {
    try {
        records.push(await runTool(tool));
    } catch (error) {
        console.error(`[vrt:${tool}] ${(error as Error).message}`);
        process.exitCode = 1;
    }
}
console.table(records);
if (
    records.some((record) => {
        return record.exitCode !== 0;
    })
) {
    process.exitCode = 1;
}
