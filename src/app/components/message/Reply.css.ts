import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ReplyBend = style({
	flexShrink: 0,
});

export const Reply = style({
	marginBottom: toRem(1),
	minWidth: 0,
	minHeight: config.lineHeight.T300,
	maxHeight: '600px',
	width: '100%',
	selectors: {
		'button&': {
			cursor: 'pointer',
		},
	},
	// backgroundColor: `var(--mui-palette-divider)`,
	padding: '5px',
	// borderRadius: `var(--mui-shape-borderRadius)`,
	borderStyle: 'solid',
	borderLeftWidth: '3px',
});

export const ReplyContent = style({
	opacity: config.opacity.P300,
	maxWidth: '100%',
	maxHeight: '100px',
	selectors: {
		[`${Reply}:hover &`]: {
			opacity: `var(--mui-palette-action-hover)`,
		},
	},
	overflow: 'hidden',
	textOverflow: 'ellipsis'
});
