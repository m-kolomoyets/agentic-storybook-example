import type { Meridiem, MeridiemPickerProps } from '../../types';
import { useRef, useState } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '@/lib/cn';
import { DROPDOWN_POSITIONER, OVERLAY_PANEL, OVERLAY_SIDE_OFFSET } from '@/lib/ui/overlayPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Option } from '@/components/ui/Option';
import { Radio } from '@/components/ui/Radio';
import { RadioGroup } from '@/components/ui/RadioGroup';

const MERIDIEMS: readonly Meridiem[] = ['AM', 'PM'];

const SHEET_TITLE = 'Select AM or PM';

/* Figma `12153:71134`: value in `Body/Medium` white, then the 20px chevron. Greys with the field by inheriting. */
const TRIGGER_CLASSES = `
    group/meridiem flex cursor-pointer items-center gap-xs rounded-icon-xs
    text-body-m whitespace-nowrap text-text-general-strong
    disabled:cursor-not-allowed disabled:text-inherit
    outline-none focus-visible:outline-solid focus-visible:outline-1
    focus-visible:outline-border-focused focus-visible:outline-offset-2
`;

const CHEVRON_CLASSES = 'size-2xl shrink-0 transition-transform group-data-[popup-open]/meridiem:rotate-180';

/* The dropdown hangs off the whole field (anchored to the `Input` body, as wide as it) — `Select`'s geometry. */
const POSITIONER_CLASSES = `${DROPDOWN_POSITIONER} outline-hidden`;
const POPUP_CLASSES = `${OVERLAY_PANEL} w-full outline-hidden`;

/* `Control Card` `8995:22030`: 12px left, 6px right, 8px vertical; radio and label 6px apart. */
const SHEET_ROW_CLASSES = 'flex w-full cursor-pointer items-center gap-s py-m pr-s pl-l';
/* `Selector` `9185:7478`: the 16px radio centred in a 24px line. */
const SHEET_SELECTOR_CLASSES = 'flex h-3xl shrink-0 items-center';
const SHEET_LABEL_CLASSES = 'text-body-m-medium text-text-general-strong';

function TriggerContent({ value }: { value: Meridiem }) {
    return (
        <>
            <span>{value}</span>
            <ChevronDownIcon aria-hidden className={CHEVRON_CLASSES} />
        </>
    );
}

/*
 * The trigger sits in `Input`'s end slot `<span>`, inside the field body — two parents up. `Input` exposes
 * no ref to its body, so the walk is the cheaper coupling.
 */
function fieldBodyOf(trigger: HTMLElement | null): Element | null {
    return trigger?.parentElement?.parentElement ?? trigger;
}

function DesktopMeridiemPicker({ value, onValueChange, label, disabled }: MeridiemPickerProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);

    return (
        <BaseMenu.Root disabled={disabled}>
            <BaseMenu.Trigger
                ref={triggerRef}
                className={cn`${TRIGGER_CLASSES}`}
                aria-label={`${label}, ${value}`}
                disabled={disabled}
            >
                <TriggerContent value={value} />
            </BaseMenu.Trigger>
            <BaseMenu.Portal>
                <BaseMenu.Positioner
                    anchor={() => {
                        return fieldBodyOf(triggerRef.current);
                    }}
                    side="bottom"
                    align="end"
                    sideOffset={OVERLAY_SIDE_OFFSET}
                    className={cn`${POSITIONER_CLASSES}`}
                >
                    <BaseMenu.Popup className={cn`${POPUP_CLASSES}`}>
                        <BaseMenu.RadioGroup
                            value={value}
                            onValueChange={(next) => {
                                onValueChange(next as Meridiem);
                            }}
                        >
                            {MERIDIEMS.map((meridiem) => {
                                return (
                                    <BaseMenu.RadioItem
                                        key={meridiem}
                                        value={meridiem}
                                        closeOnClick
                                        render={
                                            <Option
                                                label={meridiem}
                                                {...(meridiem === value ? { 'data-selected': '' } : {})}
                                            />
                                        }
                                    />
                                );
                            })}
                        </BaseMenu.RadioGroup>
                    </BaseMenu.Popup>
                </BaseMenu.Positioner>
            </BaseMenu.Portal>
        </BaseMenu.Root>
    );
}

function MobileMeridiemPicker({ value, onValueChange, label, disabled }: MeridiemPickerProps) {
    const [open, setOpen] = useState(false);
    /* The sheet edits a draft; only `Apply` hands it over. */
    const [draft, setDraft] = useState<Meridiem>(value);

    function handleApply() {
        if (draft !== value) {
            onValueChange(draft);
        }
        setOpen(false);
    }

    return (
        <>
            <button
                type="button"
                className={cn`${TRIGGER_CLASSES}`}
                aria-label={`${label}, ${value}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                data-popup-open={open ? '' : undefined}
                disabled={disabled}
                onClick={() => {
                    setDraft(value);
                    setOpen(true);
                }}
            >
                <TriggerContent value={value} />
            </button>

            <BottomSheet.Root open={open} onOpenChange={setOpen}>
                <BottomSheet.Popup>
                    <BottomSheet.Title>{SHEET_TITLE}</BottomSheet.Title>
                    <BottomSheet.Close aria-label={`Close ${SHEET_TITLE}`} />
                    <BottomSheet.Content>
                        <RadioGroup
                            value={draft}
                            onValueChange={(next) => {
                                setDraft(next as Meridiem);
                            }}
                            className="flex w-full flex-col"
                        >
                            {MERIDIEMS.map((meridiem) => {
                                return (
                                    <label key={meridiem} className={SHEET_ROW_CLASSES}>
                                        <span className={SHEET_SELECTOR_CLASSES}>
                                            <Radio
                                                value={meridiem}
                                                className="data-[checked]:text-text-general-strong"
                                            />
                                        </span>
                                        <span className={SHEET_LABEL_CLASSES}>{meridiem}</span>
                                    </label>
                                );
                            })}
                        </RadioGroup>
                    </BottomSheet.Content>
                    <BottomSheet.Footer>
                        <BottomSheet.Cancel>Back</BottomSheet.Cancel>
                        <BottomSheet.Action onClick={handleApply}>Apply</BottomSheet.Action>
                    </BottomSheet.Footer>
                </BottomSheet.Popup>
            </BottomSheet.Root>
        </>
    );
}

/**
 * `TimeInput`'s trailing `AM ⌄` addon — Figma `12153:71134`. A dropdown at and above `md:`, the
 * `Select AM or PM` bottom sheet (`12766:226874`) below: two portals and two focus contracts, not a restyle.
 */
function MeridiemPicker(props: MeridiemPickerProps) {
    const isMobile = useIsMobile();
    return isMobile ? <MobileMeridiemPicker {...props} /> : <DesktopMeridiemPicker {...props} />;
}

export { MeridiemPicker };
