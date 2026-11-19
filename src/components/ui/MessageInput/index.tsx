import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import type { MessageAttachment, MessageInputProps } from './types';
import { useRef, useState } from 'react';
import ArrowUpwardIcon from '@/assets/icons/arrow-upward.svg?react';
import AttachFileIcon from '@/assets/icons/attach-file.svg?react';
import CloseIcon from '@/assets/icons/close.svg?react';
import { Field as BaseField } from '@base-ui/react/field';
import { cn } from '@/lib/cn';
import { CONTROL_BORDER, CONTROL_SURFACE_FILL, CONTROL_SURFACE_MIN_WIDTH } from '@/lib/ui/controlSurface';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { DEFAULT_MAX_ATTACHMENTS, DEFAULT_PLACEHOLDER, MAX_LENGTH } from './constants';
import { revealCaret } from './utils/caret';
import { useAutosize } from './hooks/useAutosize';

const ROOT_CLASSES = 'flex w-full items-end gap-l';

/*
 * Own ring per button: the box's `focus-within` cannot say which child has focus. `outline-solid` is required —
 * `outline-none` sets `--tw-outline-style: none`, which `outline-1` reads.
 */
const FOCUS_RING_CLASSES = `
    outline-none focus-visible:outline-solid focus-visible:outline-1
    focus-visible:outline-border-focused focus-visible:outline-offset-2
`;

/* Wrapper, not button padding: padding would make a 38px target with a ring around all 38. */
const ATTACH_SLOT_CLASSES = 'flex shrink-0 flex-col justify-end pb-attachment-offset';

const ATTACH_CLASSES = `
    flex size-2xl items-center justify-center cursor-pointer
    text-icons-general-strong disabled:cursor-default disabled:text-icons-general-medium
    ${FOCUS_RING_CLASSES}
`;

/*
 * Ramp disabled > focus > invalid, gated: `:has()` inherits its argument's specificity, and an unguarded
 * invalid rule would hide the focus border (WCAG 2.4.7). Disabled draws no border, unlike other controls.
 */
const BOX_CLASSES = `
    flex min-h-7xl flex-1 flex-col justify-center ${CONTROL_SURFACE_MIN_WIDTH}
    cursor-text rounded-s border p-l ${CONTROL_SURFACE_FILL} ${CONTROL_BORDER.default}
    not-has-[textarea:disabled]:not-focus-within:has-[textarea[data-invalid]]:border-border-negative
    not-has-[textarea:disabled]:focus-within:border-border-focused
    has-[textarea:disabled]:border-transparent
`;

/* Stated: border + `p-l` + the 32px send button otherwise lands at 58. */
const RESTING_HEIGHT_CLASSES = 'h-7xl';

/* Six-row clamp on the viewport, not the textarea. Kit `ScrollArea`: a native bar is wide against 12px padding. */
const TEXT_SCROLL_CLASSES = 'w-full max-h-[calc(6*var(--text-body-m--line-height))]';

/*
 * At rest the 32px button overflows the 30px content box 1px each side, so `items-center` keeps one line on
 * its drawn 16px; grown, `items-end` seats the button beside the last line.
 */
const BOX_ROW_CLASSES = 'flex w-full gap-s';

/* Gap 6 while writing, 12 while editing, as drawn. */
const COLUMN_CLASSES = `flex flex-1 flex-col ${CONTROL_SURFACE_MIN_WIDTH}`;

const ACTION_ROW_CLASSES = 'flex w-full justify-end gap-m';

/* `block`: inline reserves descender room, so the autosized height would land off. */
const TEXTAREA_CLASSES = `
    block w-full resize-none outline-none ${CONTROL_SURFACE_MIN_WIDTH}
    text-body-m text-text-general-strong placeholder:text-text-general-medium
    disabled:text-text-disabled disabled:placeholder:text-text-disabled
`;

/* Not `IconButton`: its ramp (44/40/20) has no 32px cell. */
const SUBMIT_CLASSES = `
    flex size-4xl shrink-0 items-center justify-center cursor-pointer rounded-s
    bg-button-primary-default text-icons-on-surface-strong shadow-button inset-shadow-button
    ${FOCUS_RING_CLASSES}
`;

/*
 * Horizontal scroll with `shrink-0` cards: wrapping would grow the box 86px per row on a phone. Scrollbar
 * hidden but still a scroll container, so tabbing to a card's × scrolls it into view.
 */
const STRIP_CLASSES = 'flex gap-s overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* `overflow-clip` so the radius cuts the image; `relative` anchors the delete button. */
const CARD_CLASSES = 'relative shrink-0 size-attachment-card overflow-clip rounded-xs';

/* Both axes stated: an `<img>` sized `auto` in one renders at intrinsic size. */
const IMAGE_CLASSES = 'size-full object-cover';

/* 20×20 at `top 2 right 2` = `IconButton` `xs`. */
const DELETE_CLASSES = 'absolute top-xxs right-xxs';

const GLYPH_CLASSES = 'size-2xl';
const SUBMIT_GLYPH_CLASSES = 'size-xl';

const NO_ATTACHMENTS: MessageAttachment[] = [];

/**
 * Message composer: growing text box, paperclip, photo-card strip, send (or Cancel/Save in `edit`). Control
 * only — label and helper are `Field`'s. Never resolves a `File` to a URL: it emits `onAttach(files)`; upload
 * and object-URL lifetime are the caller's (amber ADR-0007). `Enter` is a newline, `⌘/Ctrl+Enter` submits.
 * Figma: 10550:246987 (`Notes Input`).
 */
function MessageInput({
    value,
    defaultValue,
    onValueChange,
    mode = 'write',
    onSubmit,
    onCancel,
    attachments,
    defaultAttachments,
    onAttachmentsChange,
    onAttach,
    maxAttachments = DEFAULT_MAX_ATTACHMENTS,
    error = false,
    disabled,
    placeholder = DEFAULT_PLACEHOLDER,
    attachLabel = 'Attach photo',
    submitLabel = 'Send',
    className,
}: MessageInputProps) {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
    const isValueControlled = value !== undefined;
    const storedValue = isValueControlled ? value : uncontrolledValue;

    const [uncontrolledAttachments, setUncontrolledAttachments] = useState(defaultAttachments ?? NO_ATTACHMENTS);
    const areAttachmentsControlled = attachments !== undefined;
    const storedAttachments = areAttachmentsControlled ? attachments : uncontrolledAttachments;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSingleRow = useAutosize(textareaRef, viewportRef, storedValue);

    const isEditing = mode === 'edit';
    // `edit` counts as grown: the 40px action row takes the alignment.
    const isResting = isSingleRow && !isEditing && storedAttachments.length === 0;

    // Content, not text: a photo-only note is submittable. `edit` is not gated; the caller's `onSubmit` decides.
    const hasContent = storedValue.trim() !== '' || storedAttachments.length > 0;
    const isSubmitAllowed = !disabled && (isEditing || hasContent);
    const isSendVisible = !isEditing && isSubmitAllowed;

    // The picker is `multiple`; overshooting in one go is the caller's call.
    const canAttach = !disabled && storedAttachments.length < maxAttachments;

    // Spread as an object: `data-invalid: undefined` would clobber a surrounding `Field`'s value.
    const invalidAttribute = error ? { 'data-invalid': '' } : undefined;

    const columnClasses = cn`${COLUMN_CLASSES} ${isEditing ? 'gap-l' : 'gap-s'}`;
    const boxRowClasses = cn`${BOX_ROW_CLASSES} ${isResting ? 'items-center' : 'items-end'}`;
    const boxClasses = cn`${BOX_CLASSES} ${isResting ? RESTING_HEIGHT_CLASSES : ''}`;

    function emitValue(next: string) {
        if (!isValueControlled) {
            setUncontrolledValue(next);
        }
        onValueChange?.(next);
    }

    function removeAttachment(removed: MessageAttachment) {
        const next = storedAttachments.filter((attachment) => {
            return attachment.id !== removed.id;
        });
        if (!areAttachmentsControlled) {
            setUncontrolledAttachments(next);
        }
        onAttachmentsChange?.(next);
    }

    // No `Escape` handling: `Dialog`/`BottomSheet` own it as dismiss.
    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || !isSubmitAllowed) {
            return;
        }
        event.preventDefault();
        onSubmit();
    }

    // Scoped to the box itself, so delete buttons and the action row keep their pointer events.
    function handleBoxMouseDown(event: MouseEvent<HTMLDivElement>) {
        const control = textareaRef.current;
        if (event.target !== event.currentTarget || !control || control.disabled) {
            return;
        }
        event.preventDefault();
        control.focus();
    }

    // `select` also covers caret moves without a value change (arrows, `Home`, clicks).
    function handleSelect() {
        const control = textareaRef.current;
        if (!control) {
            return;
        }
        revealCaret(control, viewportRef.current, Number.parseFloat(getComputedStyle(control).lineHeight));
    }

    function handleFilesPicked(event: ChangeEvent<HTMLInputElement>) {
        const picked = event.target.files;
        if (picked && picked.length > 0) {
            onAttach?.(Array.from(picked));
        }
        // Cleared so the same file can be picked twice (`change` fires only on a differing value).
        event.target.value = '';
    }

    return (
        <div className={cn`${ROOT_CLASSES} ${className}`}>
            <div className={ATTACH_SLOT_CLASSES}>
                <button
                    type="button"
                    aria-label={attachLabel}
                    disabled={!canAttach}
                    onClick={() => {
                        fileInputRef.current?.click();
                    }}
                    className={ATTACH_CLASSES}
                >
                    <AttachFileIcon aria-hidden className={GLYPH_CLASSES} />
                </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFilesPicked} />
            {/* Pointer convenience only; the textarea is reachable by Tab and its label. */}
            {/* eslint-disable-next-line jsx-a11y-x/no-static-element-interactions */}
            <div className={boxClasses} onMouseDown={handleBoxMouseDown}>
                <div className={boxRowClasses}>
                    <div className={columnClasses}>
                        {storedAttachments.length > 0 ? (
                            <div className={STRIP_CLASSES}>
                                {storedAttachments.map((attachment, index) => {
                                    return (
                                        <div key={attachment.id} className={CARD_CLASSES}>
                                            <img
                                                src={attachment.url}
                                                alt={attachment.alt ?? ''}
                                                className={IMAGE_CLASSES}
                                            />
                                            {/* Named per card: identical "Remove" buttons fail WCAG 4.1.2. */}
                                            <IconButton
                                                size="xs"
                                                aria-label={
                                                    attachment.alt === undefined
                                                        ? `Remove attachment ${index + 1}`
                                                        : `Remove ${attachment.alt}`
                                                }
                                                icon={<CloseIcon />}
                                                onClick={() => {
                                                    removeAttachment(attachment);
                                                }}
                                                className={DELETE_CLASSES}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                        {/* `BaseField.Control`: a raw `<textarea>` gets no `Field` id/description/invalid wiring. */}
                        <ScrollArea className={TEXT_SCROLL_CLASSES} viewportRef={viewportRef}>
                            <BaseField.Control
                                render={
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        onKeyDown={handleKeyDown}
                                        onSelect={handleSelect}
                                    />
                                }
                                {...invalidAttribute}
                                maxLength={MAX_LENGTH}
                                value={storedValue}
                                onValueChange={emitValue}
                                placeholder={placeholder}
                                disabled={disabled}
                                className={TEXTAREA_CLASSES}
                            />
                        </ScrollArea>
                        {/* `disabled` forwarded rather than the row hidden, so the way out stays visible. */}
                        {isEditing ? (
                            <div className={ACTION_ROW_CLASSES}>
                                <Button variant="secondary" size="sm" disabled={disabled} onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button variant="primary" size="sm" disabled={!isSubmitAllowed} onClick={onSubmit}>
                                    Save
                                </Button>
                            </div>
                        ) : null}
                    </div>
                    {isSendVisible ? (
                        <button type="button" aria-label={submitLabel} onClick={onSubmit} className={SUBMIT_CLASSES}>
                            <ArrowUpwardIcon aria-hidden className={SUBMIT_GLYPH_CLASSES} />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export { MAX_LENGTH, MessageInput };
export type { MessageAttachment, MessageInputProps } from './types';
