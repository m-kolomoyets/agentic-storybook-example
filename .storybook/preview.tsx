import addonA11y from '@storybook/addon-a11y';
import addonDesigns from '@storybook/addon-designs';
import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';
import { themes } from 'storybook/theming';
import { Toast } from '@/components/ui/Toast';
import '@/styles/index.css';

// CSF Next: story files build on this via `preview.meta()` → `meta.story()` → `story.test()`.
export default definePreview({
    addons: [addonDocs(), addonA11y(), addonDesigns()],
    parameters: {
        layout: 'centered',
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
            sort: 'requiredFirst',
        },
        // The kit draws a single dark mode; `html` already paints `surface-ground` (styles/index.css).
        backgrounds: { disable: true },
        docs: { theme: themes.dark },
        // Fail Vitest runs on a11y violations.
        a11y: { test: 'error' },
        // Chromatic snapshots are billed: only `Matrix` stories opt back in (`disableSnapshot: false`).
        chromatic: { disableSnapshot: true },
    },
    tags: ['autodocs'],
    decorators: [
        function withKitText(Story) {
            return (
                <div className="font-sans text-body-m text-text-general-strong">
                    {/* Toasts are manager-driven (ADR-0005): any story can raise one, so the viewport is global. */}
                    <Toast.Provider>
                        <Story />
                        <Toast.Viewport />
                    </Toast.Provider>
                </div>
            );
        },
    ],
});
