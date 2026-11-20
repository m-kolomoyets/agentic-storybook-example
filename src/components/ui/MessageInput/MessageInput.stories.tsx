import type { ReactNode } from 'react';
import type { MessageAttachment, MessageInputProps } from './types';
import preview from '#.storybook/preview';
import { expect, fn, waitFor } from 'storybook/test';
import { Field } from '@/components/ui/Field';
import { MessageInput } from '.';

const FIGMA = 'https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=';

const PLACEHOLDER = 'Write a note';

/* Inline image: the component never resolves a `File` (amber ADR-0007). */
const PHOTO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#3f4a3a"/>' +
        '<circle cx="26" cy="24" r="11" fill="#d7e08a"/><path d="M0 80 L28 42 L50 64 L64 52 L80 70 L80 80 Z" fill="#7d8f5c"/></svg>'
)}`;

function photos(count: number): MessageAttachment[] {
    return Array.from({ length: count }, (_, index) => {
        return { id: `photo-${index + 1}`, url: PHOTO_URL, alt: `Photo ${index + 1}` };
    });
}

/** The three lines `Filled` (10551:247254) draws. */
const FILLED_TEXT =
    'Moved the west bin down to 14% after the weekend run. Fan two is still cycling more than it should.';

const LONG_TEXT = Array.from({ length: 9 }, (_, index) => {
    return `Line ${index + 1}: the box grows to six of these and then scrolls instead.`;
}).join('\n');

type StoryArgs = Omit<MessageInputProps, 'mode' | 'onSubmit' | 'onCancel'> & {
    mode: 'write' | 'edit';
    onSubmit: () => void;
    onCancel: () => void;
};

function renderInput({ mode, onCancel, ...props }: StoryArgs) {
    return mode === 'edit' ? <MessageInput {...props} mode="edit" onCancel={onCancel} /> : <MessageInput {...props} />;
}

/* The drawn frame is 375px with 16px padding; the input is `w-full`, so the story supplies the width. */
function Frame({ children }: { children: ReactNode }) {
    return <div className="w-[343px]">{children}</div>;
}

const meta = preview.type<{ args: StoryArgs }>().meta({
    title: 'UI/MessageInput',
    args: {
        mode: 'write',
        placeholder: PLACEHOLDER,
        disabled: false,
        error: false,
        maxAttachments: 5,
        onSubmit: fn(),
        onCancel: fn(),
        onValueChange: fn(),
        onAttachmentsChange: fn(),
        onAttach: fn(),
    },
    argTypes: {
        mode: { control: 'inline-radio', options: ['write', 'edit'] },
    },
    render: function Default(args) {
        return renderInput(args);
    },
    decorators: [
        function Width(Story) {
            return (
                <Frame>
                    <Story />
                </Frame>
            );
        },
    ],
    parameters: { design: { type: 'figma', url: `${FIGMA}10550-246987` } },
});

/**
 * Figma 10549:246942: empty, at rest, no send button. Typing shows it. `Enter` is a newline; `⌘Enter` and
 * `Ctrl+Enter` submit (and type nothing); `⌘Enter` with nothing to send does nothing.
 */
export const Default = meta.story({
    parameters: { design: { type: 'figma', url: `${FIGMA}10549-246942` } },
});

Default.test('Enter is a newline; Cmd/Ctrl+Enter and Send submit', async ({ canvas, userEvent, args }) => {
    const textarea = canvas.getByRole('textbox');

    await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
    await userEvent.click(textarea);
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await expect(args.onSubmit).not.toHaveBeenCalled();
    // Unprevented, so user-event's simulated Enter may have typed a newline; start clean.
    await userEvent.clear(textarea);

    await userEvent.type(textarea, 'Bin up');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Bin up');
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();

    await userEvent.keyboard('{Enter}');
    await expect(textarea).toHaveValue('Bin up\n');
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(2);
    await expect(textarea).toHaveValue('Bin up\n');

    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSubmit).toHaveBeenCalledTimes(3);
});

/** A mousedown anywhere on the box focuses the textarea. */
Default.test('a mousedown on the box focuses the textarea', async ({ canvas, userEvent }) => {
    const textarea = canvas.getByRole('textbox');
    const box = textarea.closest('.min-h-7xl');

    await expect(box).not.toBeNull();
    await userEvent.click(box as HTMLElement);
    await expect(textarea).toHaveFocus();
});

/** Figma 10551:247254: three lines, send live. The send button's name is `submitLabel`. */
Default.test(
    'submitLabel names the send button',
    { args: { defaultValue: FILLED_TEXT, submitLabel: 'Post note' } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Post note' })).toBeVisible();
    }
);

/**
 * Figma 10558:204254: a photo-only note is submittable. Each × is named per card (WCAG 4.1.2), emits the
 * remaining list, and keeps focus off the textarea.
 */
Default.test(
    'a photo-only note is submittable; each remove is named and keeps focus off',
    { args: { defaultAttachments: photos(1) } },
    async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible();
        await expect(canvas.getByRole('img', { name: 'Photo 1' })).toBeInTheDocument();

        await userEvent.click(canvas.getByRole('button', { name: 'Remove Photo 1' }));
        await expect(args.onAttachmentsChange).toHaveBeenCalledWith([]);
        await expect(canvas.getByRole('textbox')).not.toHaveFocus();
        await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
    }
);

/** Figma 10559:204329. Photos without `alt` fall back to positional names. */
Default.test(
    'photos without alt fall back to positional names',
    {
        args: {
            defaultValue: FILLED_TEXT,
            defaultAttachments: [
                { id: 'a1', url: PHOTO_URL },
                { id: 'a2', url: PHOTO_URL },
            ],
        },
    },
    async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Remove attachment 2' })).toBeInTheDocument();
    }
);

/** The paperclip emits whatever the picker returned; resolving it to a URL is the caller's job. */
Default.test(
    'the paperclip emits the picked files and resets the input',
    async ({ canvas, canvasElement, userEvent, args }) => {
        const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
        const file = new File(['grain'], 'auger.png', { type: 'image/png' });

        await expect(canvas.getByRole('button', { name: 'Attach photo' })).toBeEnabled();
        await expect(input).not.toBeNull();
        await userEvent.upload(input as HTMLInputElement, file);
        await expect(args.onAttach).toHaveBeenCalledWith([file]);
        // Cleared so the same file can be picked again.
        await expect(input).toHaveValue('');
    }
);

/** No Figma node: at `maxAttachments` the paperclip is disabled rather than files dropped. */
Default.test(
    'at maxAttachments the paperclip is disabled',
    { args: { defaultAttachments: photos(5), maxAttachments: 5 } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Attach photo' })).toBeDisabled();
    }
);

/** No Figma node: the strip scrolls sideways rather than wrapping. */
Default.test(
    'many photos render in one sideways strip',
    { args: { defaultValue: 'Six angles on the same auger.', defaultAttachments: photos(6), maxAttachments: 6 } },
    async ({ canvas }) => {
        await expect(canvas.getAllByRole('img')).toHaveLength(6);
    }
);

/** No Figma node: past six lines the box stops growing and scrolls. */
Default.test(
    'past six lines the box stops growing and scrolls',
    { args: { defaultValue: LONG_TEXT } },
    async ({ canvas }) => {
        const textarea = canvas.getByRole('textbox');
        const viewport = textarea.parentElement?.closest('[data-base-ui-scroll-area-viewport], [style*="overflow"]');
        const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);

        await waitFor(() => {
            return expect(textarea.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 6);
        });
        await expect(viewport).not.toBeNull();
        await expect((viewport as HTMLElement).clientHeight).toBeLessThanOrEqual(Math.ceil(lineHeight * 6));
    }
);

/**
 * Figma 10551:249903: Cancel / Save replace the send button. `⌘Enter` saves and never cancels; Cancel is a
 * button, never a key — `Escape` reaches the surrounding dialog un-prevented.
 */
Default.test(
    'edit: Cmd+Enter and Save submit, Cancel is a button, Escape passes through',
    { args: { mode: 'edit', defaultValue: FILLED_TEXT } },
    async ({ canvas, canvasElement, userEvent, args }) => {
        const escapes: boolean[] = [];
        function recordEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                escapes.push(event.defaultPrevented);
            }
        }
        canvasElement.addEventListener('keydown', recordEscape);

        await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
        await userEvent.click(canvas.getByRole('textbox'));
        await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
        await expect(args.onSubmit).toHaveBeenCalledTimes(1);
        await userEvent.keyboard('{Escape}');
        await expect(escapes).toEqual([false]);
        await expect(args.onCancel).not.toHaveBeenCalled();

        await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
        await expect(args.onSubmit).toHaveBeenCalledTimes(2);
        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
        await expect(args.onCancel).toHaveBeenCalledOnce();

        canvasElement.removeEventListener('keydown', recordEscape);
    }
);

/** Figma 10560:201257: `edit` is not gated on content — an empty Save is the caller's call. */
Default.test('edit is not gated on content', { args: { mode: 'edit' } }, async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('textbox'));
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
});

/**
 * Figma 10551:247256: no border (the fill stays), unlike every other disabled control. While editing, Cancel
 * and Save stay visible and inert; `⌘Enter` does nothing.
 */
Default.test(
    'disabled editing keeps Cancel/Save visible and inert',
    { args: { mode: 'edit', disabled: true, defaultValue: FILLED_TEXT } },
    async ({ canvas, args }) => {
        await expect(canvas.getByRole('textbox')).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Attach photo' })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: 'Save' })).toHaveAttribute('data-disabled', 'true');
        await expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveAttribute('data-disabled', 'true');
        await expect(args.onSubmit).not.toHaveBeenCalled();
    }
);

/** Standalone `error`: the bare hook, no message. Inside a `Field` use its `invalid` instead. */
Default.test(
    'standalone error marks the textarea',
    { args: { error: true, defaultValue: FILLED_TEXT } },
    async ({ canvas }) => {
        await expect(canvas.getByRole('textbox')).toHaveAttribute('data-invalid');
    }
);

/** Figma 10732:7629; `Helper Text` (10732:8766) is the caller's `Field.Error`, wired by `Field`. */
export const ErrorInField = meta.story({
    args: { defaultValue: FILLED_TEXT, defaultAttachments: photos(1) },
    render: function ErrorInField(args) {
        return (
            <Field.Root name="note" invalid>
                <Field.Label>Note</Field.Label>
                {renderInput(args)}
                <Field.Error>That note is longer than a note is allowed to be.</Field.Error>
            </Field.Root>
        );
    },
});

ErrorInField.test('Field invalid marks the textarea and describes the error', async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox', { name: 'Note' });
    await expect(textarea).toHaveAttribute('data-invalid');
    await expect(textarea).toHaveAccessibleDescription('That note is longer than a note is allowed to be.');
});

const MATRIX: { label: string; props: Partial<StoryArgs> }[] = [
    { label: 'default', props: {} },
    {
        label: 'typing — focus forced',
        props: { defaultValue: 'Moved the west bin', className: '[&>div]:border-border-focused' },
    },
    { label: 'filled', props: { defaultValue: FILLED_TEXT } },
    { label: 'photo only', props: { defaultAttachments: photos(1) } },
    { label: 'filled with photo', props: { defaultValue: FILLED_TEXT, defaultAttachments: photos(1) } },
    { label: 'editing', props: { mode: 'edit', defaultValue: FILLED_TEXT } },
    { label: 'editing with photo', props: { mode: 'edit', defaultValue: FILLED_TEXT, defaultAttachments: photos(1) } },
    { label: 'error', props: { error: true, defaultValue: FILLED_TEXT } },
    { label: 'disabled', props: { disabled: true } },
    {
        label: 'disabled, filled with photo',
        props: { disabled: true, defaultValue: FILLED_TEXT, defaultAttachments: photos(1) },
    },
];

/** Every drawn state, for side-by-side review against Figma. `focus forced` pins the border a canvas cannot. */
export const Matrix = meta.story({
    parameters: {
        design: [
            { name: 'Filled', type: 'figma', url: `${FIGMA}10551-247254` },
            { name: 'Photo only', type: 'figma', url: `${FIGMA}10558-204254` },
            { name: 'Filled with photos', type: 'figma', url: `${FIGMA}10559-204329` },
            { name: 'Editing', type: 'figma', url: `${FIGMA}10551-249903` },
            { name: 'Editing empty', type: 'figma', url: `${FIGMA}10560-201257` },
            { name: 'Editing with photo', type: 'figma', url: `${FIGMA}10575-209434` },
            { name: 'Disabled', type: 'figma', url: `${FIGMA}10551-247256` },
            { name: 'Error', type: 'figma', url: `${FIGMA}10732-7629` },
        ],
    },
    decorators: [],
    render: function Matrix(args) {
        return (
            <div className="flex flex-col gap-xl">
                {MATRIX.map(({ label, props }) => {
                    return (
                        <div key={label} className="flex w-[343px] flex-col gap-s">
                            <span className="text-caption-m text-text-general-medium">{label}</span>
                            {renderInput({ ...args, ...props })}
                        </div>
                    );
                })}
            </div>
        );
    },
});
