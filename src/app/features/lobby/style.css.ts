import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const AvatarPlaceholder = style({
	backgroundColor: 'var(--mui-palette-background-paper)',
});

export const LinePlaceholder = style([
	DefaultReset,
	{
		width: '100%',
		height: config.lineHeight.T200,
		borderRadius: config.radii.R300,
		backgroundColor: 'var(--mui-palette-background-paper)',
	},
]);
