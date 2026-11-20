/* eslint-disable no-console -- CLI check: console is its output. */
// `pnpm vrt figma --doctor`: can Figma testing run here, and what's out of date? One Figma call per file at most
// (`/meta`, the cheap version check). Prints one line per check with its fix, then the mode:
// - full: token works; new sets can be synced and Figma changes adopted;
// - offline: no usable token, but every registered set is cached; tests and the panel work, syncing doesn't;
// - blocked: something a run needs is missing.
// Exit code 0 unless blocked.
import type { FigmaSetManifest } from './types.ts';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIGMA_SETS, parseFigmaUrl } from './sets.ts';
import { FIGMA_REFS_DIR, figmaSlug, variantSlug } from './types.ts';

type Level = 'ok' | 'warn' | 'fail';
type Check = { level: Level; name: string; detail: string; fix?: string };

const MARK: Record<Level, string> = { ok: '✓', warn: '!', fail: '✕' };

function exists(file: string): Promise<boolean> {
    return readFile(file).then(
        () => {
            return true;
        },
        () => {
            return false;
        }
    );
}

async function reachable(url: string): Promise<boolean> {
    try {
        await fetch(url, { signal: AbortSignal.timeout(2000) });

        return true;
    } catch {
        return false;
    }
}

/** Every `FIGMA_SETS.<key>` referenced from a story file. */
async function setsUsedByStories(root: string): Promise<Set<string>> {
    const used = new Set<string>();
    const files = await readdir(path.join(root, 'src'), { recursive: true });
    for (const file of files) {
        if (!file.endsWith('.stories.tsx')) {
            continue;
        }
        const source = await readFile(path.join(root, 'src', file), 'utf8');
        for (const match of source.matchAll(/FIGMA_SETS\.(\w+)/g)) {
            used.add(match[1] ?? '');
        }
    }

    return used;
}

/** `dockerWs`: the runner's Docker browser endpoint (visual/run.ts), the single source of its port. */
export async function runFigmaDoctor(root: string, dockerWs: string): Promise<boolean> {
    const checks: Check[] = [];
    const token = process.env.FIGMA_TOKEN;
    const fileKeys = [
        ...new Set(
            Object.values(FIGMA_SETS).map((url) => {
                return parseFigmaUrl(url).fileKey;
            })
        ),
    ];

    // 1. Figma access: token present, valid, and able to read every registered file.
    const versions = new Map<string, string>();
    if (token) {
        for (const fileKey of fileKeys) {
            const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/meta`, {
                headers: { 'X-Figma-Token': token },
            }).catch(() => {
                return null;
            });
            if (response?.ok) {
                const { file } = (await response.json()) as { file: { version: string } };
                versions.set(fileKey, file.version);
                checks.push({ level: 'ok', name: 'Figma access', detail: `file ${fileKey} readable` });
            } else {
                checks.push({
                    level: 'fail',
                    name: 'Figma access',
                    detail: `file ${fileKey}: ${response ? `HTTP ${response.status}` : 'network error'}`,
                    fix:
                        response?.status === 403
                            ? 'Token lacks access: the token owner needs view access to the file and the file_content:read scope.'
                            : 'Check the network; a 429 means the rate limit: wait out Retry-After.',
                });
            }
        }
    } else {
        checks.push({
            level: 'warn',
            name: 'Figma access',
            detail: 'FIGMA_TOKEN not set',
            fix: 'Figma → Settings → Security → Personal access tokens (scope file_content:read); put FIGMA_TOKEN=… in .env.local.',
        });
    }

    // 2. Cache: every registered set synced, and at the file's current version.
    let missing = 0;
    for (const [key, url] of Object.entries(FIGMA_SETS)) {
        const { fileKey, nodeId } = parseFigmaUrl(url);
        const dir = path.join(root, FIGMA_REFS_DIR, figmaSlug(fileKey, nodeId));
        const manifest = await readFile(path.join(dir, 'manifest.json'), 'utf8')
            .then((text) => {
                return JSON.parse(text) as FigmaSetManifest;
            })
            .catch(() => {
                return null;
            });
        const pngs = manifest
            ? await Promise.all(
                  manifest.variants.map((variant) => {
                      return exists(path.join(dir, `${variantSlug(variant.id)}.png`));
                  })
              )
            : [];
        if (!manifest || !pngs.every(Boolean)) {
            missing += 1;
            checks.push({
                level: 'warn',
                name: `Set ${key}`,
                detail: 'not synced',
                fix: 'pnpm vrt figma (needs Figma access)',
            });
        } else if (versions.has(fileKey) && versions.get(fileKey) !== manifest.source.version) {
            checks.push({
                level: 'warn',
                name: `Set ${key}`,
                detail: `Figma changed since sync (${manifest.source.lastModified.slice(0, 10)})`,
                fix: 'pnpm vrt figma --refresh, then review the __refs__ diff (FIGMA-TESTING.md → When Figma changes)',
            });
        } else {
            checks.push({ level: 'ok', name: `Set ${key}`, detail: `${manifest.variants.length} variants cached` });
        }
    }

    // 3. Sets nobody tests.
    const used = await setsUsedByStories(root);
    const orphans = Object.keys(FIGMA_SETS).filter((key) => {
        return !used.has(key);
    });
    checks.push(
        orphans.length
            ? {
                  level: 'warn',
                  name: 'Stories',
                  detail: `registered but in no story: ${orphans.join(', ')}`,
                  fix: 'Add a FigmaMatrix block for each, or drop it from sets.ts',
              }
            : { level: 'ok', name: 'Stories', detail: `${used.size} registered sets used by FigmaMatrix stories` }
    );

    // 4. Kit catalog (coverage list).
    checks.push(
        (await exists(path.join(root, FIGMA_REFS_DIR, 'catalog.json')))
            ? { level: 'ok', name: 'Catalog', detail: 'kit coverage list cached' }
            : { level: 'warn', name: 'Catalog', detail: 'not synced', fix: 'pnpm vrt figma (needs Figma access)' }
    );

    // 5. Runtime: pinned browser, Storybook dev server.
    const dockerHttp = dockerWs.replace(/^ws:/, 'http:');
    const docker = await reachable(dockerHttp);
    checks.push(
        docker
            ? { level: 'ok', name: 'Browser', detail: `Docker Chromium on ${new URL(dockerHttp).host} (pinned)` }
            : {
                  level: 'warn',
                  name: 'Browser',
                  detail: 'Docker Chromium not reachable',
                  fix: 'pnpm vrt:browser (Docker Desktop running), or add --host-browser',
              }
    );
    const storybook = await reachable('http://localhost:6006/');
    checks.push(
        storybook
            ? { level: 'ok', name: 'Storybook', detail: ':6006 up (Figma diff tab, MCP test-run)' }
            : {
                  level: 'warn',
                  name: 'Storybook',
                  detail: ':6006 down; only the panel and MCP need it',
                  fix: 'pnpm storybook',
              }
    );

    const hasAccess = versions.size === fileKeys.length;
    let mode = 'blocked';
    if (hasAccess) {
        mode = 'full';
    } else if (missing === 0) {
        mode = 'offline';
    }

    for (const check of checks) {
        console.log(`${MARK[check.level]} ${check.name.padEnd(28)} ${check.detail}`);
        if (check.fix && check.level !== 'ok') {
            console.log(`  ${''.padEnd(28)} → ${check.fix}`);
        }
    }
    console.log(
        `\nMode: ${mode}${
            {
                full: ': sync, test and adopt Figma changes.',
                offline: ': test against the cached refs; syncing new sets or Figma changes needs Figma access.',
                blocked: ': registered sets are not cached and Figma is unreachable. Fix Figma access first.',
            }[mode]
        }`
    );

    return mode !== 'blocked';
}
