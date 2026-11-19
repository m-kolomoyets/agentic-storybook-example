import type { ReactElement } from 'react';
import type { Status, StatusIconSurface } from '../types';
import { createElement } from 'react';
import CheckCircleIcon from '@/assets/icons/check-circle.svg?react';
import ErrorIcon from '@/assets/icons/error.svg?react';
import ReportProblemIcon from '@/assets/icons/report-problem.svg?react';

/*
 * Class-name constants, unmerged: the consumer owns the merge order. `rounded-s` is Figma's
 * `Radius/m` (8px) — the repo's `rounded-m` is 12px.
 */
export const STATUS_ICON_WRAPPER = 'flex size-5xl items-center justify-center rounded-s p-statusicon-p';

/** 20px glyph box, shared by the default and an override so neither can stretch the chip. */
export const STATUS_ICON_GLYPH_SIZE = 'size-2xl shrink-0';

/** On a light card `default` binds `statusicon-toast`; `statusicon-default` is the dark ground's fill. */
export const STATUS_ICON_FILL: Record<StatusIconSurface, Record<Status, string>> = {
    'on-surface': {
        default: 'bg-surface-statusicon-toast',
        positive: 'bg-surface-statusicon-positive',
        negative: 'bg-surface-statusicon-negative',
        warning: 'bg-surface-statusicon-warning',
    },
    general: {
        default: 'bg-surface-statusicon-default',
        positive: 'bg-surface-statusicon-positive',
        negative: 'bg-surface-statusicon-negative',
        warning: 'bg-surface-statusicon-warning',
    },
};

/** Text colour — SVGR glyphs draw `currentColor`, so an override inherits it. */
export const STATUS_ICON_COLOR: Record<StatusIconSurface, Record<Status, string>> = {
    'on-surface': {
        default: 'text-icons-on-surface-strong',
        positive: 'text-icons-positive',
        negative: 'text-icons-negative',
        warning: 'text-icons-warning',
    },
    general: {
        default: 'text-icons-general-strong',
        positive: 'text-icons-positive',
        negative: 'text-icons-negative',
        warning: 'text-icons-warning',
    },
};

/** Default glyph per status — the one overridable column. `default`/`positive` share a check, as drawn. */
export const STATUS_ICON_GLYPH: Record<Status, ReactElement> = {
    default: createElement(CheckCircleIcon),
    positive: createElement(CheckCircleIcon),
    negative: createElement(ErrorIcon),
    warning: createElement(ReportProblemIcon),
};
