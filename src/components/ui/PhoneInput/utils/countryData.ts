/*
 * The country list is derived from `libphonenumber-js` metadata, never committed: a hand list goes
 * stale silently. Names via `Intl.DisplayNames` under `locale` (default `'en'`, not
 * `navigator.language`, so row order is machine-independent).
 * Search has **no alias table**: `uk` does not find United Kingdom — deliberate (unbounded, English-only).
 */
import type { CountryCode } from 'libphonenumber-js/min';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';

export type CountryEntry = {
    code: CountryCode;
    /** Digits only, no `+`: `'1'`, `'44'`. Display sites add the `+`. */
    callingCode: string;
    /** Localised; what the row shows and the sort uses. */
    name: string;
    /** Always English; searchable. */
    englishName: string;
};

/** Memoized per locale: ~250 regions × two `DisplayNames` lookups is too much per render. */
const entriesByLocale = new Map<string, CountryEntry[]>();

/** `DisplayNames` echoes the input code for an unknown region; treat that as a miss. */
function localisedName(names: Intl.DisplayNames, code: CountryCode): string | undefined {
    const name = names.of(code);
    return name === undefined || name === code ? undefined : name;
}

/** Every region `/min` can parse, sorted by localised name (`Intl.Collator`, so `Åland` sorts right). Read-only. */
export function getCountryEntries(locale = 'en'): CountryEntry[] {
    const memoized = entriesByLocale.get(locale);
    if (memoized) {
        return memoized;
    }

    const localNames = new Intl.DisplayNames([locale], { type: 'region' });
    const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });

    const entries = getCountries().map<CountryEntry>((code) => {
        // Unknown locally → English; unknown in English too → the bare code (beats a vanished row).
        const englishName = localisedName(englishNames, code) ?? code;
        return {
            code,
            callingCode: getCountryCallingCode(code),
            name: localisedName(localNames, code) ?? englishName,
            englishName,
        };
    });

    const collator = new Intl.Collator(locale);
    entries.sort((left, right) => {
        return collator.compare(left.name, right.name);
    });

    entriesByLocale.set(locale, entries);
    return entries;
}

/** Case- and diacritic-folded: `Aland` ↔ `Åland`. */
function fold(value: string): string {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

function matchFolded(entry: CountryEntry, folded: string): boolean {
    if (folded === '') {
        return true;
    }
    if (fold(entry.name).includes(folded) || fold(entry.englishName).includes(folded)) {
        return true;
    }
    if (entry.code.toLowerCase().includes(folded)) {
        return true;
    }
    // `+44` ≡ `44`, anchored at the start: `44` must not surface `+1244`.
    const digits = folded.startsWith('+') ? folded.slice(1) : folded;
    return /^\d+$/.test(digits) && entry.callingCode.startsWith(digits);
}

/** Localised name, English name, ISO-2, or calling code (with or without `+`). Blank matches all. */
export function matchCountry(entry: CountryEntry, query: string): boolean {
    return matchFolded(entry, fold(query.trim()));
}

/** `entries` narrowed to `query`, source order kept. */
export function filterCountries(entries: CountryEntry[], query: string): CountryEntry[] {
    const folded = fold(query.trim());
    return folded === ''
        ? entries
        : entries.filter((entry) => {
              return matchFolded(entry, folded);
          });
}
