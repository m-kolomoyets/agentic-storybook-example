import type { Preview } from '@storybook/react-vite';
import { themes } from 'storybook/theming';
import { Toast } from '@/components/ui/Toast';
import '@/styles/index.css';

const preview: Preview = {
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
        backgrounds: { disabled: true },
        docs: { theme: themes.dark },
        // Fail Vitest runs on a11y violations.
        a11y: { test: 'error' },
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
};

export default preview;
