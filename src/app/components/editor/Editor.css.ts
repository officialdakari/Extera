import { style } from '@vanilla-extract/css';
import { config, DefaultReset, toRem } from 'folds';

export const Editor = style([
	DefaultReset,
	{
		// backgroundColor: color.SurfaceVariant.Container,
		// color: color.SurfaceVariant.OnContainer,
		boxShadow: `inset 0 0 0 ${config.borderWidth.B300} var(--mui-palette-divider)`,
		overflow: 'hidden',
		backgroundColor: `var(--mui-palette-background-paper)`,
		color: `var(--mui-palette-text-primary)`,
		borderRadius: `var(--mui-shape-borderRadius)`,
		borderColor: `var(--mui-palette-divider)`,
	},
]);

export const EditorNew = style([
	DefaultReset,
	{
		// backgroundColor: color.SurfaceVariant.Container,
		// color: color.SurfaceVariant.OnContainer,
		overflow: 'hidden',
	},
]);

export const EditorOptions = style([
	DefaultReset,
	{
		padding: config.space.S200,
		justifyContent: 'end',
		alignSelf: 'end',
	},
]);

export const EditorTextareaScroll = style({
	alignSelf: 'center',
	background: 'transparent'
});

export const EditorTextarea = style([
	DefaultReset,
	{
		flexGrow: 1,
		border: 'none !important',
		resize: 'none',
		width: '100%',
		height: 'min-content',
		padding: `${toRem(13)} ${toRem(1)}`,
		selectors: {
			[`${EditorTextareaScroll}:first-child &`]: {
				paddingLeft: toRem(13),
			},
			[`${EditorTextareaScroll}:last-child &`]: {
				paddingRight: toRem(13),
			},
			'&:focus': {
				outline: 'none',
			},
		},
	},
]);

export const EditorPlaceholder = style([
	DefaultReset,
	{
		position: 'absolute',
		zIndex: 1,
		width: '100%',
		opacity: config.opacity.Placeholder,
		pointerEvents: 'none',
		userSelect: 'none',

		selectors: {
			'&:not(:first-child)': {
				display: 'none',
			},
		},
	},
]);

export const EditorToolbarBase = style({
	padding: `0 ${config.borderWidth.B300}`,
});

export const EditorToolbar = style({
	padding: config.space.S100,
});

export const MarkdownBtnBox = style({
	paddingRight: config.space.S100,
});
