import { style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, config, toRem } from 'folds';

export const FullWidth = style({
	width: `100%`,
	height: toRem(450),
	overflow: 'hidden',
});

export const Base = style({
	maxWidth: toRem(432),
	width: `calc(100vw - 2 * ${config.space.S400})`,
	height: toRem(450),
	border: `${config.borderWidth.B300} solid var(--mui-palette-divider)`,
	borderRadius: `var(--mui-shape-borderRadius)`,
	boxShadow: `var(--mui-shadows-2)`,
	overflow: 'hidden',
});

export const Sidebar = style({
	width: toRem(54),
	position: 'relative',
});

export const SidebarContent = style({
	padding: `${config.space.S200} 0`,
});

export const SidebarStack = style({
	width: '100%',
});

export const NativeEmojiSidebarStack = style({
	position: 'sticky',
	bottom: '-67%',
	zIndex: 1,
});

export const SidebarDivider = style({
	width: toRem(18),
});

export const Header = style({
	padding: config.space.S300,
	paddingBottom: 0,
});

export const EmojiBoardTab = style({
	cursor: 'pointer',
});

export const Footer = style({
	padding: config.space.S200,
	margin: config.space.S300,
	marginTop: 0,
	minHeight: toRem(40),

	borderRadius: `var(--mui-shape-borderRadius)`,
});

export const EmojiGroup = style({
	padding: `${config.space.S300} 0`,
});

export const EmojiGroupLabel = style({
	position: 'sticky',
	top: config.space.S200,
	zIndex: 1,

	margin: 'auto',
	padding: `${config.space.S100} ${config.space.S200}`,
	borderRadius: config.radii.Pill,
});

export const EmojiGroupContent = style([
	DefaultReset,
	{
		padding: `0 ${config.space.S200}`,
	},
]);

export const EmojiPreview = style([
	DefaultReset,
	{
		width: toRem(32),
		height: toRem(32),
		fontSize: toRem(32),
		lineHeight: toRem(32),
	},
]);

export const EmojiItem = style([
	DefaultReset,
	FocusOutline,
	{
		width: toRem(48),
		height: toRem(48),
		fontSize: toRem(32),
		lineHeight: toRem(32),
		borderRadius: `var(--mui-shape-borderRadius)`,
		cursor: 'pointer',
	},
]);

export const StickerItem = style([
	EmojiItem,
	{
		width: toRem(112),
		height: toRem(112),
	},
]);

export const CustomEmojiImg = style([
	DefaultReset,
	{
		width: toRem(32),
		height: toRem(32),
		objectFit: 'contain',
	},
]);

export const StickerImg = style([
	DefaultReset,
	{
		width: toRem(96),
		height: toRem(96),
		objectFit: 'contain',
	},
]);
