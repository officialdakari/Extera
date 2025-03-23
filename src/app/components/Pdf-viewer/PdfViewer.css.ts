import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const PdfViewer = style([
	DefaultReset,
	{
		height: '100%',
	},
]);

export const PdfViewerHeader = style([
	DefaultReset,
	{
		paddingLeft: config.space.S200,
		paddingRight: config.space.S200,
		borderBottomWidth: config.borderWidth.B300,
		flexShrink: 0,
		gap: config.space.S200,
	},
]);
export const PdfViewerFooter = style([
	PdfViewerHeader,
	{
		borderTopWidth: config.borderWidth.B300,
		borderBottomWidth: 0,
	},
]);

export const PdfViewerContent = style([
	DefaultReset,
	{
		margin: 'auto',
		display: 'inline-block',
		backgroundColor: `var(--mui-palette-background-container)`,
		color: `var(--mui-palette-text-primary)`,
	},
]);
