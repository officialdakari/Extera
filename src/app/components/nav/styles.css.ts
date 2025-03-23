import { colors } from '@mui/material';
import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, config, toRem } from 'folds';

export const NavCategory = style([
	DefaultReset,
	{
		position: 'relative',
	},
]);

export const NavCategoryHeader = style({
	gap: config.space.S100,
});

export const NavLink = style({
	color: 'inherit',
	minWidth: 0,
	display: 'flex',
	alignItems: 'center',
	cursor: 'pointer',
	flexGrow: 1,
	':hover': {
		textDecoration: 'unset',
	},
	':focus': {
		outline: 'none',
	},
});

const NavItemBase = style({
	width: '100%',
	display: 'flex',
	justifyContent: 'start',
	cursor: 'pointer',
	outline: 'none',
	minHeight: toRem(38),

	selectors: {
		'&:hover, &:focus-visible': {
			//   backgroundColor: ContainerHover,
		},
		'&[data-hover=true]': {
			//   backgroundColor: ContainerHover,
		},
		[`&:has(.${NavLink}:active)`]: {
			//   backgroundColor: ContainerActive,
		},
		'&[aria-selected=true]': {
			//   backgroundColor: ContainerActive,
		},
		[`&:has(.${NavLink}:focus-visible)`]: {
			outline: `${config.borderWidth.B600} solid var(--mui-palette-divider)`,
			outlineOffset: `calc(-1 * ${config.borderWidth.B600})`,
		},
	},
	'@supports': {
		[`not selector(:has(.${NavLink}:focus-visible))`]: {
			':focus-within': {
				outline: `${config.borderWidth.B600} solid var(--mui-palette-divider)`,
				outlineOffset: `calc(-1 * ${config.borderWidth.B600})`,
			},
		},
	},
});

export const NavItem = recipe({
	base: [{
		':hover': {
			// backgroundColor: colors.blueGrey[500],
			borderRadius: '10px',
			// borderTopLeftRadius: '30px',
			// borderBottomLeftRadius: '30px'
		},
		selectors: {
			'&[aria-selected=true]': {
				// backgroundColor: colors.blueGrey[800],
				borderRadius: '10px',
				// borderTopLeftRadius: '30px',
				// borderBottomLeftRadius: '30px'
			}
		}
	}],
	variants: {
		theme: {
			dark: {
				':hover': {
					backgroundColor: colors.blueGrey[500]
				},
				selectors: {
					'&[aria-selected=true]': {
						backgroundColor: colors.blueGrey[800]
					}
				}
			},
			light: {
				':hover': {
					backgroundColor: colors.blue.A100
				},
				selectors: {
					'&[aria-selected=true]': {
						backgroundColor: colors.blue.A200
					}
				}
			}
		}
	}
});

export const NavItemContent = style({
	paddingLeft: config.space.S200,
	paddingRight: config.space.S300,
	height: 'inherit',
	minWidth: 0,
	flexGrow: 1,
	display: 'flex',
	alignItems: 'center',
	minHeight: toRem(36),

	selectors: {
		'&:hover': {
			textDecoration: 'unset',
		},
		[`.${NavItemBase}[data-highlight=true] &`]: {
			fontWeight: config.fontWeight.W600,
		},
	},
});

export const NavItemOptions = style({
	paddingRight: config.space.S200,
});
