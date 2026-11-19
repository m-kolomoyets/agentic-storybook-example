import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';
import { revealCaret } from '../utils/caret';

/**
 * Grows the textarea to its content. Not `field-sizing: content` (no Safari). A layout effect so a multi-line
 * `defaultValue` never paints as one line first. Returns whether the text is one line — only layout can say.
 */
export function useAutosize(
    ref: RefObject<HTMLTextAreaElement | null>,
    viewportRef: RefObject<HTMLDivElement | null>,
    value: string
) {
    const [isSingleRow, setIsSingleRow] = useState(true);

    useLayoutEffect(
        function autosize() {
            const control = ref.current;
            if (!control) {
                return undefined;
            }

            function measure(textarea: HTMLTextAreaElement) {
                const styles = getComputedStyle(textarea);
                // Unusable line height (`normal`) → unclamped content height.
                const lineHeight = Number.parseFloat(styles.lineHeight);
                const paddingBlock = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);

                // `auto` first: `scrollHeight` never shrinks below the element's own height.
                textarea.style.height = 'auto';
                const contentHeight = textarea.scrollHeight;

                // Zero (`display: none`) is never pinned — it would collapse the box; the observer re-measures.
                if (contentHeight === 0) {
                    return;
                }

                textarea.style.height = `${contentHeight}px`;

                // After the height (the caret's line only exists then); only while focused.
                if (document.activeElement === textarea) {
                    revealCaret(textarea, viewportRef.current, lineHeight);
                }

                // `<=`, not `===`: `scrollHeight` rounds to an integer. Newline count is the fallback.
                setIsSingleRow(
                    Number.isFinite(lineHeight) && Number.isFinite(paddingBlock)
                        ? contentHeight <= lineHeight + paddingBlock
                        : !value.includes('\n')
                );
            }

            measure(control);

            // Width only (`measure` writes the height). Also fires when a `display: none` subtree shows.
            let lastWidth = -1;
            const observer = new ResizeObserver((entries) => {
                const width = entries[0]?.contentRect.width ?? 0;
                if (width === lastWidth) {
                    return;
                }
                lastWidth = width;
                measure(control);
            });
            observer.observe(control);

            return () => {
                observer.disconnect();
            };
        },
        [ref, viewportRef, value]
    );

    return isSingleRow;
}
