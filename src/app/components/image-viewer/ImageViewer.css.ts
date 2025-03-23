import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const ImageViewer = style([
	DefaultReset,
	{
		height: '100%',
	},
]);

export const ImageViewerHeader = style([
	DefaultReset,
	{
		paddingLeft: config.space.S200,
		paddingRight: config.space.S200,
		borderBottomWidth: config.borderWidth.B300,
		flexShrink: 0,
		gap: config.space.S200,

	},
]);

export const ImageViewerContent = style([
	DefaultReset,
	{
		backgroundColor: `var(--mui-palette-background-container)`,
		color: `var(--mui-palette-background-onContainer)`,
		overflow: 'hidden',
	},
]);

export const ImageViewerImg = style([
	DefaultReset,
	{
		objectFit: 'contain',
		width: 'auto',
		height: 'auto',
		maxWidth: '100%',
		maxHeight: '100%',
		backgroundColor: `var(--mui-palette-surface-container)`,
		transition: 'transform 100ms linear',
	},
]);
