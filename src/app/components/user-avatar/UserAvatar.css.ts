import { style } from '@vanilla-extract/css';

export const UserAvatar = style({
	backgroundColor: 'var(--mui-palette-background-paper)',
	color: 'var(--mui-palette-text-primary)',
	textTransform: 'capitalize',
	borderRadius: '50%',
	selectors: {
		'&[data-image-loaded="true"]': {
			backgroundColor: 'transparent',
		},
	},
});
