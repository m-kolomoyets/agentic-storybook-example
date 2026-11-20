import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';
import { registerFigmaDiffPanel } from './figma-panel.tsx';

// The kit is dark-only; match the manager chrome so previews don't flash against a white UI.
addons.setConfig({ theme: themes.dark });

registerFigmaDiffPanel();
