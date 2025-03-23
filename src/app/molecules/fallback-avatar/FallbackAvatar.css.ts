import { style } from "@vanilla-extract/css";

export const UserAvatar = style({
	color: 'var(--mui-palette-secondary-main)',
	textTransform: 'capitalize',
	borderRadius: '50%',
	selectors: {
		'&[data-image-loaded="true"]': {
			backgroundColor: 'transparent',
		},
	},
});