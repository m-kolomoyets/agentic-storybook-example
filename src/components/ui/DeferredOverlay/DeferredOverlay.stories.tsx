import { lazy, useEffect, useState } from 'react';
import preview from '#.storybook/preview';
import { expect, fn, waitFor } from 'storybook/test';
import { DeferredOverlay } from '.';

type PanelProps = { open: boolean; onClose: () => void; onLoad: () => void };

const loadPanel = fn();
const onLoad = fn();

function LoadedPanel({ open, onClose, onLoad: handleLoad }: PanelProps) {
    useEffect(
        function reportLoaded() {
            handleLoad();
        },
        [handleLoad]
    );
    return (
        <section
            aria-label="Lazy panel"
            hidden={!open}
            className="flex flex-col gap-m rounded-m bg-surface-card p-l text-text-general-strong"
        >
            <p>Loaded on first open — closing keeps it mounted.</p>
            <button type="button" className="w-fit rounded-s bg-surface-control px-m py-xs" onClick={onClose}>
                Close
            </button>
        </section>
    );
}

// Stands in for a feature's `lazy` overlay: the factory runs on the element's first render.
function createLazyPanel() {
    return lazy(() => {
        loadPanel();
        return Promise.resolve({ default: LoadedPanel });
    });
}

const meta = preview.meta({
    title: 'UI/DeferredOverlay',
    component: DeferredOverlay,
    args: { open: false, children: null },
    argTypes: { children: { control: false } },
});

/** A lazy panel behind a trigger: nothing renders (and no chunk loads) until the first open. */
export const Default = meta.story({
    beforeEach: () => {
        loadPanel.mockClear();
        onLoad.mockClear();
    },
    render: function LazyOnFirstOpen() {
        // Fresh `lazy` per mount so every visit re-proves the deferred load.
        const [LazyPanel] = useState(createLazyPanel);
        const [open, setOpen] = useState(false);
        return (
            <div className="flex flex-col gap-l">
                <button
                    type="button"
                    className="w-fit rounded-s bg-surface-control px-m py-xs"
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    Open the lazy panel
                </button>
                <DeferredOverlay open={open}>
                    <LazyPanel
                        open={open}
                        onLoad={onLoad}
                        onClose={() => {
                            setOpen(false);
                        }}
                    />
                </DeferredOverlay>
            </div>
        );
    },
});

/** Nothing (and no chunk) before the first open; mounted on open; still mounted after close. */
Default.test('loads on first open and stays mounted after close', async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvasElement.querySelector('section')).toBeNull();
    await expect(onLoad).not.toHaveBeenCalled();
    await expect(loadPanel).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Open the lazy panel' }));
    const panel = await canvas.findByRole('region', { name: 'Lazy panel' });
    await expect(onLoad).toHaveBeenCalledOnce();
    await expect(loadPanel).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await waitFor(async () => {
        await expect(panel).not.toBeVisible();
    });
    await expect(canvasElement.querySelector('section')).toBe(panel);
});
