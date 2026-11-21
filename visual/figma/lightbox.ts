/// <reference lib="dom" />
// Full-size view of an inspector tile (Figma, story or "what differs"): a modal with Fit / 1× / 2× / 4× / 8× zoom over
// the 2x snapshot. One implementation for the Storybook "Figma diff" panel and, via `Function#toString`, the report
// page's inline script: it must stay self-contained (no imports, no outer references) and plain-JS-safe once types are
// stripped. Styles: `.fx-lightbox` in theme.ts.

/** Opens the picture a tile shows (its `<img>`, or its painted `<canvas>`, copied) enlarged; removed on close. */
export function openLightbox(caption: string, diff: boolean, source: HTMLImageElement | HTMLCanvasElement): void {
    const make = (tag: string, className: string) => {
        const element = document.createElement(tag);
        element.className = className;

        return element;
    };
    let picture: HTMLImageElement | HTMLCanvasElement;
    if (source instanceof HTMLCanvasElement) {
        picture = document.createElement('canvas');
        picture.width = source.width;
        picture.height = source.height;
        picture.getContext('2d')?.drawImage(source, 0, 0);
        picture.setAttribute('role', 'img');
        picture.setAttribute('aria-label', source.getAttribute('aria-label') ?? caption);
    } else {
        picture = document.createElement('img');
        picture.src = source.currentSrc || source.src;
        picture.alt = caption;
    }

    const dialog = make('dialog', 'fx fx-lightbox') as HTMLDialogElement;
    dialog.setAttribute('aria-label', `${caption}, enlarged`);
    const head = make('div', 'fx-lightbox__head');
    const title = make('span', '');
    title.textContent = caption;
    const tools = make('div', 'fx-lightbox__tools');
    const zooms = make('div', 'fx-lightbox__zoom');
    zooms.setAttribute('role', 'group');
    zooms.setAttribute('aria-label', 'Zoom');
    const stage = make('div', 'fx-lightbox__stage');
    if (diff) {
        stage.dataset.diff = '';
    }
    // Fit: the whole snapshot as large as the stage allows. Fixed zooms: the 2x PNG × n, scrolling.
    const setZoom = (level: string) => {
        stage.dataset.zoom = level;
        if (level === 'fit') {
            stage.style.removeProperty('--fx-zoom');
        } else {
            stage.style.setProperty('--fx-zoom', level);
        }
        for (const button of zooms.children) {
            button.setAttribute('aria-pressed', String(button.getAttribute('data-zoom') === level));
        }
    };
    for (const level of ['fit', '1', '2', '4', '8']) {
        const button = make('button', '') as HTMLButtonElement;
        button.type = 'button';
        button.dataset.zoom = level;
        button.textContent = level === 'fit' ? 'Fit' : `${level}×`;
        button.addEventListener('click', () => {
            setZoom(level);
        });
        zooms.append(button);
    }
    const close = make('button', 'fx-btn') as HTMLButtonElement;
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', () => {
        dialog.close();
    });
    tools.append(zooms, close);
    head.append(title, tools);
    stage.append(picture);
    dialog.append(head, stage);
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
    dialog.addEventListener('close', () => {
        dialog.remove();
    });
    setZoom('fit');
    document.body.append(dialog);
    dialog.showModal();
}
