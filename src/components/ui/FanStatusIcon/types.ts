/** One vocabulary for both Figma sets (24px `Running/Error/Off/Updating`, 12px `On/Offline/Off/Updating`). */
export type FanStatusIconStatus = 'running' | 'off' | 'error' | 'updating';

/** `sm` 12px (`Side Menu/Fan Icon`), `md` 24px (`Fan States`). */
export type FanStatusIconSize = 'sm' | 'md';

export type FanStatusIconProps = {
    status: FanStatusIconStatus;
    /** @default 'md' */
    size?: FanStatusIconSize;
    /** Accessible name (`role="img"`). Omitted → `aria-hidden`; pass only where the icon stands alone. */
    label?: string;
    className?: string;
};
