import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { expect } from 'storybook/test';
import supplementCss from './tokens-supplement.css?raw';
import tokensCss from './tokens.css?raw';

/*
 * Every swatch here is parsed from the CSS at build time — nothing is hand-copied, so a regenerated
 * `tokens.css` updates this page. Values are resolved in JS rather than read via `var()`: Tailwind
 * only emits the theme variables a utility uses, so most tokens have no runtime custom property.
 */

type Token = { name: string; value: string };

function parseTokens(...sources: string[]): Map<string, string> {
    const tokens = new Map<string, string>();
    for (const source of sources) {
        const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
        for (const [, name, value] of code.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) {
            // Later files win, as in the cascade (`index.css` imports the supplement second).
            tokens.delete(name);
            tokens.set(name, value.replace(/\s+/g, ' ').trim());
        }
    }
    return tokens;
}

const TOKENS = parseTokens(tokensCss, supplementCss);

/** Inline every `var(--x[, fallback])` with its parsed value, so the result works without the variable. */
function resolve(value: string, depth = 0): string {
    if (depth > 8) {
        return value;
    }
    const next = value.replace(
        /var\((--[a-z0-9-]+)(?:\s*,\s*([^()]+))?\)/g,
        (match, name: string, fallback?: string) => {
            return TOKENS.get(name) ?? fallback ?? match;
        }
    );
    return next === value ? value : resolve(next, depth + 1);
}

function tokensWithPrefix(prefix: string): Token[] {
    return [...TOKENS]
        .filter(([name]) => {
            return name.startsWith(prefix) && !name.slice(prefix.length).includes('--');
        })
        .map(([name, value]) => {
            return { name, value };
        });
}

/** Raw palette steps (`--color-blue-500`) are literal values on a numeric step; semantic tokens are not. */
function isPrimitiveColor({ name, value }: Token) {
    return /-\d+(-\d+)?$/.test(name) && !value.startsWith('var(');
}

function colorFamily(name: string) {
    const rest = name.replace(/^--color-/, '');
    return rest.startsWith('color-chart-line') ? 'chart-line' : rest.split('-')[0];
}

function groupColors() {
    const groups = new Map<string, Token[]>();
    for (const token of tokensWithPrefix('--color-')) {
        if (isPrimitiveColor(token)) {
            continue;
        }
        const family = colorFamily(token.name);
        groups.set(family, [...(groups.get(family) ?? []), token]);
    }
    return groups;
}

function TokenLabel({ token }: { token: Token }) {
    return (
        <span className="flex min-w-px flex-col">
            <code className="text-caption-m text-text-general-strong">{token.name}</code>
            <span className="text-caption-s break-all text-text-general-medium">{token.value}</span>
        </span>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section aria-label={title} className="flex flex-col gap-l">
            <h2 className="text-heading-s text-text-general-strong">{title}</h2>
            {children}
        </section>
    );
}

const LIST = 'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-l';

function ColorSwatches() {
    return (
        <div className="flex flex-col gap-4xl">
            {[...groupColors()].map(([family, tokens]) => {
                return (
                    <Section key={family} title={family}>
                        <ul className={LIST}>
                            {tokens.map((token) => {
                                return (
                                    <li key={token.name} className="flex items-center gap-m">
                                        <span
                                            aria-hidden="true"
                                            className="size-6xl shrink-0 rounded-s border border-border-primary"
                                            style={{ background: resolve(token.value) }}
                                        />
                                        <TokenLabel token={token} />
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>
                );
            })}
        </div>
    );
}

function SizeList({ prefix, render }: { prefix: string; render: (value: string) => CSSProperties }) {
    return (
        <ul className="flex flex-col gap-m">
            {tokensWithPrefix(prefix).map((token) => {
                return (
                    <li key={token.name} className="grid grid-cols-[16rem_1fr] items-center gap-l">
                        <TokenLabel token={token} />
                        <span aria-hidden="true" style={render(resolve(token.value))} />
                    </li>
                );
            })}
        </ul>
    );
}

function spacingBar(value: string): CSSProperties {
    return { width: value, height: '0.75rem', background: 'currentColor' };
}

function radiusBox(value: string): CSSProperties {
    return {
        width: '4rem',
        height: '3rem',
        borderRadius: value,
        border: `1px solid ${resolve('var(--color-border-primary)')}`,
        background: resolve('var(--color-surface-card, transparent)'),
    };
}

function shadowBox(value: string): CSSProperties {
    return {
        width: '6rem',
        height: '3rem',
        borderRadius: '0.5rem',
        boxShadow: value,
        background: resolve('var(--color-surface-card, transparent)'),
    };
}

function TypeScale() {
    return (
        <ul className="flex flex-col gap-l">
            {tokensWithPrefix('--text-').map((token) => {
                const name = token.name;
                const style: CSSProperties = {
                    fontSize: resolve(token.value),
                    lineHeight: TOKENS.get(`${name}--line-height`),
                    fontWeight: TOKENS.get(`${name}--font-weight`),
                    letterSpacing: TOKENS.get(`${name}--letter-spacing`),
                };
                return (
                    <li key={name} className="grid grid-cols-[16rem_1fr] items-center gap-l">
                        <TokenLabel token={token} />
                        <span className="text-text-general-strong" style={style}>
                            {`${name.replace('--', '')} — The quick brown fox`}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

const meta = {
    title: 'Foundations/Tokens',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Semantic colour tokens by family. Raw palette primitives are omitted on purpose. */
export const Colors: Story = {
    render: function Colors() {
        return <ColorSwatches />;
    },
    play: async ({ canvas }) => {
        for (const family of ['border', 'button', 'icons', 'surface', 'text', 'chart-line', 'schedule']) {
            await expect(canvas.getByRole('region', { name: family })).toBeInTheDocument();
        }
        await expect(canvas.getByText('--color-border-primary')).toBeInTheDocument();
        await expect(canvas.queryByText('--color-blue-500')).toBeNull();
    },
};

export const Spacing: Story = {
    render: function Spacing() {
        return (
            <Section title="Spacing">
                <SizeList prefix="--spacing-" render={spacingBar} />
            </Section>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('--spacing-xl')).toBeInTheDocument();
    },
};

export const Radius: Story = {
    render: function Radius() {
        return (
            <Section title="Radius">
                <SizeList prefix="--radius-" render={radiusBox} />
            </Section>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('--radius-s')).toBeInTheDocument();
    },
};

/** `--text-*` steps with their paired line height, weight and tracking. */
export const Typography: Story = {
    render: function Typography() {
        return (
            <Section title="Type scale">
                <TypeScale />
            </Section>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('--text-body-m')).toBeInTheDocument();
        // Sub-properties belong to their step, not the list.
        await expect(canvas.queryByText('--text-body-m--line-height')).toBeNull();
    },
};

export const Shadows: Story = {
    render: function Shadows() {
        return (
            <Section title="Shadows">
                <SizeList prefix="--shadow-" render={shadowBox} />
                <SizeList prefix="--inset-shadow-" render={shadowBox} />
            </Section>
        );
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('--shadow-button')).toBeInTheDocument();
    },
};
