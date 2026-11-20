import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { FAN_STATUS_ICON_SIZES, FAN_STATUS_ICON_STATUSES } from './constants';
import { FanStatusIcon } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const meta = preview.meta({
    title: 'UI/FanStatusIcon',
    component: FanStatusIcon,
    args: { status: 'running', size: 'md' },
    argTypes: {
        status: { control: 'inline-radio', options: FAN_STATUS_ICON_STATUSES },
        size: { control: 'inline-radio', options: FAN_STATUS_ICON_SIZES },
    },
    parameters: { design: { type: 'figma', url: `${FIGMA}13867-643998` } },
});

/** Playground — decorative by default: `aria-hidden`, glyph `alt=""`. */
export const Default = meta.story();

Default.test('decorative by default: aria-hidden tile, empty glyph alt', async ({ canvasElement, canvas }) => {
    const tile = canvasElement.querySelector('[data-status="running"]');
    await expect(tile).toHaveAttribute('aria-hidden', 'true');
    await expect(canvas.queryByRole('img')).toBeNull();
    await expect(tile!.querySelector('img')).toHaveAttribute('alt', '');
});

/** `label` → announced image, for where the fan state is the only signal. */
Default.test(
    'label makes it an announced image',
    { args: { status: 'error', label: 'Fan error' } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('img', { name: 'Fan error' })).toBeInTheDocument();
    }
);

/** Every status × size. */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'md', type: 'figma', url: `${FIGMA}13867-643998` },
            { name: 'sm', type: 'figma', url: `${FIGMA}14026-847827` },
        ],
    },
    render: function Matrix() {
        return (
            <div className="grid grid-cols-[6rem_repeat(2,auto)] items-center justify-start gap-l">
                <span />
                {FAN_STATUS_ICON_SIZES.map((size) => {
                    return (
                        <span key={size} className="text-caption-m text-text-general-medium">
                            {size} — {size === 'md' ? 24 : 12}px
                        </span>
                    );
                })}
                {FAN_STATUS_ICON_STATUSES.map((status) => {
                    return (
                        <div key={status} className="contents">
                            <span className="text-caption-m text-text-general-medium">{status}</span>
                            {FAN_STATUS_ICON_SIZES.map((size) => {
                                return <FanStatusIcon key={size} status={status} size={size} />;
                            })}
                        </div>
                    );
                })}
            </div>
        );
    },
});
