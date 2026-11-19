import { createCn } from 'cn/engine';
import tables from './cn-tables';

/**
 * Class merger fitted to the kit's theme. The stock `cn` export ships tailwind-merge's default
 * tables, which misread the named scales in `styles/tokens.css` — e.g. it treats `text-body-m`
 * as a colour and drops it next to `text-text-general-strong`. `cn-tables.ts` is regenerated
 * from `@theme` by the `cn/vite` plugin on every dev/build start; never edit it by hand.
 */
export const cn = createCn(tables);
