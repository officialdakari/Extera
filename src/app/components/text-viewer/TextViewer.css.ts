import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const TextViewer = style([
	DefaultReset,
	{
		height: '100%',
	},
]);

export const TextViewerHeader = style([
	DefaultReset,
	{
		paddingLeft: config.space.S200,
		paddingRight: config.space.S200,
		borderBottomWidth: config.borderWidth.B300,
		flexShrink: 0,
		gap: config.space.S200,
	},
]);

export const TextViewerContent = style([
	DefaultReset,
	{
		backgroundColor: 'var(--mui-palette-background-paper)',
		color: 'var(--mui-palette-text-primary)',
		overflow: 'hidden',
	},
]);

export const TextViewerPre = style([
	DefaultReset,
	{
		padding: config.space.S600,
		whiteSpace: 'pre-wrap',
	},
]);
