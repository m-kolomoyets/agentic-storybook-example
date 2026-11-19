/* Line-break-deciding properties copied onto the mirror. `getPropertyValue` takes CSS names. */
const MIRROR_STYLE_PROPERTIES = [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'font-variant',
    'letter-spacing',
    'line-height',
    'text-indent',
    'text-transform',
    'word-spacing',
    'word-break',
    'overflow-wrap',
    'tab-size',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'box-sizing',
];

/**
 * A `<textarea>` exposes no caret position, so the text up to the caret is laid out in an off-screen mirror
 * and a zero-width marker's `offsetTop` is read.
 */
function caretOffsetTop(control: HTMLTextAreaElement) {
    const styles = getComputedStyle(control);
    const mirror = document.createElement('div');

    mirror.style.cssText = [
        ...MIRROR_STYLE_PROPERTIES.map((property) => {
            return `${property}:${styles.getPropertyValue(property)}`;
        }),
        // Off-screen, not `display: none`: there must be layout to measure.
        'position:absolute',
        'top:0',
        'left:-9999px',
        'visibility:hidden',
        'white-space:pre-wrap',
        `width:${String(control.clientWidth)}px`,
    ].join(';');

    // `textContent`: the value is user text.
    mirror.textContent = control.value.slice(0, control.selectionEnd);

    // Zero-width space: an empty inline box has no line of its own.
    const marker = document.createElement('span');
    marker.textContent = '​';
    mirror.append(marker);

    document.body.append(mirror);
    const offsetTop = marker.offsetTop;
    mirror.remove();

    return offsetTop;
}

/**
 * Scrolls the caret's line into view inside the clamping viewport. The browser only does this when the
 * textarea scrolls itself, and here the `ScrollArea` around it does.
 */
export function revealCaret(control: HTMLTextAreaElement, viewport: HTMLDivElement | null, lineHeight: number) {
    if (!viewport) {
        return;
    }

    const visibleHeight = viewport.clientHeight;
    if (control.scrollHeight <= visibleHeight) {
        return;
    }

    const top = caretOffsetTop(control);
    const bottom = top + (Number.isFinite(lineHeight) ? lineHeight : 0);

    if (top < viewport.scrollTop) {
        viewport.scrollTop = top;
        return;
    }

    if (bottom > viewport.scrollTop + visibleHeight) {
        viewport.scrollTop = bottom - visibleHeight;
    }
}
