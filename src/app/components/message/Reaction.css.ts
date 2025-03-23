import { style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, config, toRem } from 'folds';

export const Reaction = style([
	FocusOutline,
	{
		padding: `${toRem(2)} ${config.space.S200} ${toRem(2)} ${config.space.S100}`,
		backgroundColor: `var(--mui-palette-grey-800)`,
		color: `var(--mui-palette-common-white)`,
		borderRadius: `var(--mui-shape-borderRadius)`,

		selectors: {
			'button&': {
				cursor: 'pointer',
			},
			'&[aria-pressed=true]': {
				backgroundColor: `var(--mui-palette-success-dark)`,
			},
			'&:hover, &:focus-visible': {
				backgroundColor: `var(--mui-palette-action-hover)`,
			},
			'&:active': {
				backgroundColor: `var(--mui-palette-action-focus)`,
			},
			'&[aria-disabled=true], &:disabled': {
				cursor: 'not-allowed',
			},
		},
	},
]);

export const ReactionText = style([
	DefaultReset,
	{
		minWidth: 0,
		maxWidth: toRem(150),
		display: 'inline-flex',
		alignItems: 'center',
		lineHeight: toRem(25),
	},
]);

export const ReactionImg = style([
	DefaultReset,
	{
		height: '1em',
		minWidth: 0,
		maxWidth: toRem(150),
		objectFit: 'contain',
	},
]);
