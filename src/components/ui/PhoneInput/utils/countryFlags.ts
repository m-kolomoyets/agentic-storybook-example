/*
 * Flag artwork as SVG components. `country-flag-icons` and `libphonenumber-js` are independently
 * versioned region lists, so a missing flag is a normal outcome (callers draw a blank box).
 * Not emoji flags: Windows Chrome renders them as letters.
 * Trade-off vs amber (per-flag `<img>` asset URLs via `import.meta.glob`): the namespace import
 * bundles every flag component, because a glob into pnpm's `node_modules` is fragile.
 */
import type { ComponentType, ReactElement, SVGAttributes } from 'react';
import type { CountryCode } from 'libphonenumber-js/min';
import { createElement } from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

type FlagComponent = ComponentType<SVGAttributes<SVGElement>>;

const FLAGS: Partial<Record<string, FlagComponent>> = Flags;

/**
 * The flag element for `code`, or `undefined` where there is no artwork. An element, not the
 * component: a component looked up during render trips `react-hooks/static-components`.
 */
export function renderFlag(code: CountryCode, props: SVGAttributes<SVGElement>): ReactElement | undefined {
    const flag = FLAGS[code];
    return flag === undefined ? undefined : createElement(flag, props);
}
