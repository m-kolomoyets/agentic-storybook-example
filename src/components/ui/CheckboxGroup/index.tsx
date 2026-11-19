import type { CheckboxGroupProps } from './types';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';

/**
 * Shared state for `Checkbox` children; the only way to reach `Indeterminate` through a group (`parent` +
 * `allValues`). Zero styling: Figma draws no group/fieldset/legend (ADR-0002). No roving focus — each
 * checkbox keeps its own tab stop. Not needed for independent checkboxes.
 */
function CheckboxGroup(props: CheckboxGroupProps) {
    return <BaseCheckboxGroup {...props} />;
}

export { CheckboxGroup };
