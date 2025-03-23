import { keyframes, style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const MembersDrawer = style({
	width: toRem(266),
	maxWidth: toRem(266),
	backgroundColor: 'var(--mui-palette-background-paper)',
});

export const MembersDrawerHeader = style({
	flexShrink: 0,
	padding: `0 ${config.space.S200} 0 ${config.space.S300}`,
	borderBottomWidth: config.borderWidth.B300,
});

export const MemberDrawerContentBase = style({
	position: 'relative',
	overflow: 'auto',
	backgroundColor: 'var(--mui-palette-background-paper)',
});

export const MemberDrawerContent = style({
	padding: `${config.space.S200} 0`,
});

const ScrollBtnAnim = keyframes({
	'0%': {
		transform: `scale(0)`,
	},
	'50%': {
		transform: `scale(0.5)`,
	},
	'100%': {
		transform: `scale(1)`,
	},
});

export const DrawerScrollTop = style({
	position: 'absolute',
	top: config.space.S200,
	left: '50%',
	transform: 'translateX(-50%)',
	zIndex: 1,
	animation: `${ScrollBtnAnim} 100ms`,
});

export const DrawerGroup = style({
	paddingLeft: config.space.S200,
});

export const MembersGroup = style({
	paddingLeft: config.space.S200
});
export const MembersGroupLabel = style({
	padding: config.space.S200,
	selectors: {
		'&:not(:first-child)': {
			paddingTop: config.space.S500,
		},
	},
});

export const DrawerVirtualItem = style({
	position: 'absolute',
	top: 0,
	left: 0,
	width: '100%',
});
