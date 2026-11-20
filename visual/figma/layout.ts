// Lays Figma variants out the way the matrix, the panel and the report show them: one section per option of
// `layout.sections`, `layout.columns` across, every other axis combined down the side. Options keep Figma's order;
// combinations Figma doesn't draw are dropped (sections, rows and columns with no variant at all disappear).
import type { FigmaMatrixLayout, FigmaSetManifest } from './types.ts';

type WithProps = { props: Record<string, string> };

export type MatrixSection<T> = {
    /** `Size: Big`, or null when there is no section axis. */
    title: string | null;
    columns: string[];
    rows: { label: string; cells: (T | null)[] }[];
};

function combinations(axes: FigmaSetManifest['axes']): Record<string, string>[] {
    return axes.reduce<Record<string, string>[]>(
        (acc, axis) => {
            return acc.flatMap((combo) => {
                return axis.options.map((option) => {
                    return { ...combo, [axis.name]: option };
                });
            });
        },
        [{}]
    );
}

function matches(item: WithProps, combo: Record<string, string>): boolean {
    return Object.entries(combo).every(([name, option]) => {
        return item.props[name] === option;
    });
}

export function layoutMatrix<T extends WithProps>(
    axes: FigmaSetManifest['axes'],
    layout: FigmaMatrixLayout,
    items: T[]
): MatrixSection<T>[] {
    const axis = (name: string | null) => {
        const found = axes.find((candidate) => {
            return candidate.name === name;
        });
        if (name && !found) {
            throw new Error(
                `Figma set has no "${name}" property (has: ${axes
                    .map((a) => {
                        return a.name;
                    })
                    .join(', ')})`
            );
        }

        return found;
    };
    const sectionAxis = axis(layout.sections);
    const columnAxis = axis(layout.columns);
    if (!columnAxis) {
        throw new Error('layout.columns is required');
    }
    const rowAxes = axes.filter((candidate) => {
        return candidate !== sectionAxis && candidate !== columnAxis;
    });

    const sectionCombos = sectionAxis
        ? sectionAxis.options.map((option) => {
              return { [sectionAxis.name]: option };
          })
        : [{}];

    return sectionCombos.flatMap((sectionCombo) => {
        const inSection = items.filter((item) => {
            return matches(item, sectionCombo);
        });
        const columns = columnAxis.options.filter((option) => {
            return inSection.some((item) => {
                return item.props[columnAxis.name] === option;
            });
        });
        const rows = combinations(rowAxes)
            .map((rowCombo) => {
                return {
                    label: Object.values(rowCombo).join(' · '),
                    cells: columns.map((column) => {
                        return (
                            inSection.find((item) => {
                                return matches(item, { ...rowCombo, [columnAxis.name]: column });
                            }) ?? null
                        );
                    }),
                };
            })
            .filter((row) => {
                return row.cells.some(Boolean);
            });
        if (rows.length === 0) {
            return [];
        }
        const title = sectionAxis ? `${sectionAxis.name}: ${sectionCombo[sectionAxis.name]}` : null;

        return [{ title, columns, rows }];
    });
}
