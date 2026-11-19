/** A photo the caller already resolved to a URL (amber ADR-0007): the component never constructs one. */
export type MessageAttachment = {
    id: string;
    url: string;
    /** Names the card's image and its delete button; falls back to a positional name. */
    alt?: string;
};

export type MessageInputMode = 'write' | 'edit';

type MessageInputModeProps =
    | {
          /** `write`: a send button shows only when there is something to send. @default 'write' */
          mode?: 'write';
          onSubmit: () => void;
          onCancel?: never;
      }
    | {
          /** `edit`: Cancel / Save replace the send button. */
          mode: 'edit';
          onSubmit: () => void;
          /** Required: Cancel is the only way out — `Escape` belongs to the surrounding dialog. */
          onCancel: () => void;
      };

type MessageInputBaseProps = {
    /** `undefined` = uncontrolled. */
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;

    /** `undefined` = uncontrolled. */
    attachments?: MessageAttachment[];
    defaultAttachments?: MessageAttachment[];
    /** × on a card. The caller diffs to learn which id left (and owes any server delete to Save). */
    onAttachmentsChange?: (next: MessageAttachment[]) => void;
    /** Whatever the picker returned. Upload and object-URL lifetime are the caller's. */
    onAttach?: (files: File[]) => void;
    /** At the cap the paperclip is disabled rather than files dropped. @default 5 */
    maxAttachments?: number;

    /** Standalone invalid hook. Inside a `Field.Root` use its `invalid`; the Field wins when both are set. */
    error?: boolean;
    disabled?: boolean;
    /** @default 'Write a note' */
    placeholder?: string;
    /** Paperclip's accessible name. @default 'Attach photo' */
    attachLabel?: string;
    /** Send button's accessible name. @default 'Send' */
    submitLabel?: string;

    /** Lands on the root row (paperclip + box), not the box. */
    className?: string;

    children?: never;
};

export type MessageInputProps = MessageInputBaseProps & MessageInputModeProps;
