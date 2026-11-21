/// <reference lib="dom" />
// Basic accessibility of one matrix cell's live render, like the browser DevTools accessibility pane: role, accessible
// name, keyboard focusable, text contrast (WCAG 1.4.3) and target size (WCAG 2.5.8). Measured in the preview by the
// FigmaMatrix story and shown in the "Figma diff" panel. A quick read, not an audit: the Accessibility tab runs axe.
import type { A11yRow } from './selection.ts';
import type { Rgba } from './types.ts';
import { contrastRatio, over, toRgba } from './colors.ts';

const INTERACTIVE = 'button, a[href], input, select, textarea, [role], [tabindex]';

const IMPLICIT_ROLES: [string, string][] = [
    ['button', 'button'],
    ['a[href]', 'link'],
    ['input[type="checkbox"]', 'checkbox'],
    ['input[type="radio"]', 'radio'],
    ['input[type="range"]', 'slider'],
    ['select', 'combobox'],
    ['textarea', 'textbox'],
    ['input', 'textbox'],
];

function roleOf(element: Element): string | null {
    const explicit = element.getAttribute('role');
    if (explicit) {
        return explicit;
    }

    return (
        IMPLICIT_ROLES.find(([selector]) => {
            return element.matches(selector);
        })?.[1] ?? null
    );
}

function textOf(element: Element): string {
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The accessible name, by the common paths: aria-labelledby, aria-label, a label, the text, title, alt. */
function nameOf(element: Element): string {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const text = labelledBy
            .split(/\s+/)
            .map((id) => {
                const target = element.ownerDocument.getElementById(id);

                return target ? textOf(target) : '';
            })
            .join(' ')
            .trim();
        if (text) {
            return text;
        }
    }
    const label = element.getAttribute('aria-label')?.trim();
    if (label) {
        return label;
    }
    if (element instanceof HTMLInputElement && element.labels?.length) {
        return textOf(element.labels[0] as HTMLLabelElement);
    }
    const wrappingLabel = element.closest('label');
    if (wrappingLabel) {
        return textOf(wrappingLabel);
    }

    return (
        textOf(element) ||
        element.getAttribute('title') ||
        element.querySelector('img[alt]')?.getAttribute('alt') ||
        element.querySelector('svg title')?.textContent ||
        ''
    );
}

/** The colour behind an element: its own and its ancestors' backgrounds composited, page ground at the bottom. */
export function backgroundOf(element: Element): Rgba {
    const layers: Rgba[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
        const layer = toRgba(getComputedStyle(node).backgroundColor);
        if (layer.a > 0) {
            layers.push(layer);
            if (layer.a >= 1) {
                break;
            }
        }
    }

    return layers.reduceRight<Rgba>(
        (under, layer) => {
            return over(layer, under);
        },
        { r: 0, g: 0, b: 0, a: 1 }
    );
}

/** Rendered and not visually hidden (sr-only text is 1px and clipped): text a sighted user reads. */
function isVisible(element: Element): boolean {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
        box.width > 1 &&
        box.height > 1 &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0 &&
        style.clipPath !== 'inset(50%)'
    );
}

/** The first element that holds visible text of its own. */
function textElement(root: Element): Element | null {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent?.trim() && node.parentElement && isVisible(node.parentElement)) {
            return node.parentElement;
        }
    }

    return null;
}

function isDisabled(element: Element): boolean {
    return (
        element.matches(':disabled') ||
        element.getAttribute('aria-disabled') === 'true' ||
        // Base UI writes `data-disabled` bare; some kit parts write it as "true" / "false".
        ['', 'true'].includes(element.getAttribute('data-disabled') ?? 'absent')
    );
}

/** The basic checks for one rendered component (the matrix cell's first child). */
export function measureA11y(root: Element): A11yRow[] {
    const target = root.matches(INTERACTIVE) ? root : (root.querySelector(INTERACTIVE) ?? root);
    const role = roleOf(target);
    const interactive = role !== null && target.matches(INTERACTIVE);
    const disabled = isDisabled(target);
    const name = nameOf(target);
    const rows: A11yRow[] = [];

    rows.push({ label: 'Role', value: role ?? '—', note: role ? '' : 'generic', pass: null });
    rows.push({
        label: 'Accessible name',
        value: name || '—',
        note: !name && interactive ? 'missing' : '',
        pass: !name && interactive ? false : null,
    });
    const focusable = interactive && !disabled && (target as HTMLElement).tabIndex >= 0;
    rows.push({
        label: 'Keyboard focusable',
        value: focusable ? 'Yes' : 'No',
        note: disabled ? 'disabled' : '',
        pass: null,
    });

    const text = textElement(root);
    if (text) {
        const style = getComputedStyle(text);
        const ratio = contrastRatio(over(toRgba(style.color), backgroundOf(text)), backgroundOf(text));
        const size = Number.parseFloat(style.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
        const minimum = large ? 3 : 4.5;
        rows.push({
            label: 'Text contrast',
            value: `${ratio.toFixed(1)}:1`,
            note: disabled ? 'exempt: disabled' : `AA ${minimum}:1`,
            pass: disabled ? null : ratio >= minimum,
        });
    } else {
        rows.push({ label: 'Text contrast', value: '—', note: 'no text', pass: null });
    }

    if (interactive) {
        // Visually hidden native inputs (0×0) take the size of the rendered control.
        let box = target.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) {
            box = root.getBoundingClientRect();
        }
        const width = Math.round(box.width);
        const height = Math.round(box.height);
        rows.push({
            label: 'Target size',
            value: `${width} × ${height} px`,
            note: 'min 24 × 24',
            pass: Math.min(width, height) >= 24,
        });
    } else {
        rows.push({ label: 'Target size', value: '—', note: 'not interactive', pass: null });
    }

    const failed = rows.filter((row) => {
        return row.pass === false;
    });
    rows.push({
        label: 'Checks failed',
        value: String(failed.length),
        note: failed
            .map((row) => {
                return row.label.toLowerCase();
            })
            .join(', '),
        pass: failed.length === 0,
    });

    return rows;
}
