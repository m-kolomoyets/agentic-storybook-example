/*
 * Flag artwork as asset URLs: the picker is virtualized, so only mounted rows fetch their flag; a
 * namespace import of `country-flag-icons/react/3x2` would bundle all ~265 flag components.
 * Not emoji flags: Windows Chrome renders them as letters. `country-flag-icons` and `libphonenumber-js`
 * are independently versioned region lists, so a missing flag is a normal outcome (callers draw a blank box).
 */
import type { CountryCode } from 'libphonenumber-js/min';

/*
 * Relative path: the package's `exports` map hides the `.svg` files from a bare specifier. `?no-inline`:
 * nearly every flag is under `assetsInlineLimit`, so `?url` would inline them all as data URIs.
 * A glob fails open (empty map → blank boxes); the `Flags` story asserts it matched.
 */
const FLAG_URLS_BY_PATH = import.meta.glob<string>('../../../../../node_modules/country-flag-icons/3x2/*.svg', {
    eager: true,
    query: '?no-inline',
    import: 'default',
});

/* ISO-2 → URL, built once: the picker asks per row on every keystroke. */
const URL_BY_CODE = new Map<string, string>(
    Object.entries(FLAG_URLS_BY_PATH).map(([path, url]) => {
        const stem = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length);
        return [stem.toUpperCase(), url];
    })
);

/** The flag URL for `code`, or `undefined` where there is no artwork. */
export function flagUrl(code: CountryCode): string | undefined {
    return URL_BY_CODE.get(code);
}
