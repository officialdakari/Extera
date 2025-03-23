import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, config, toRem } from 'folds';

export const RoomViewFollowing = recipe({
	base: [
		DefaultReset,
		{
			minHeight: toRem(28),
			padding: `0 ${config.space.S400}`,
			width: '100%',
			backgroundColor: 'transparent',
			color: 'var(--mui-palette-text-primary)',
			outline: 'none',
		},
	],
	variants: {
		clickable: {
			true: {
				cursor: 'pointer',
				selectors: {
					'&:hover, &:focus-visible': {
						color: 'var(--mui-palette-primary-main)',
					},
					'&:active': {
						color: 'var(--mui-palette-primary-main)',
					},
				},
			},
		},
	},
});
