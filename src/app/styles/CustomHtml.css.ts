import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, config, DefaultReset, toRem } from 'folds';

export const MarginSpaced = style({
	marginBottom: config.space.S200,
	marginTop: config.space.S200,
	selectors: {
		'&:first-child': {
			marginTop: 0,
		},
		'&:last-child': {
			marginBottom: 0,
		},
	},
});

export const Paragraph = style([DefaultReset]);

export const Heading = style([
	DefaultReset,
	MarginSpaced,
	{
		marginTop: config.space.S400,
		selectors: {
			'&:first-child': {
				marginTop: 0,
			},
		},
	},
]);

export const BlockQuote = style([
	DefaultReset,
	MarginSpaced,
	{
		paddingLeft: config.space.S200,
		borderLeft: `${config.borderWidth.B700} solid var(--mui-palette-divider)`,
		padding: '5px',
		borderRadius: config.radii.R300,
		borderStyle: 'solid',
		borderLeftWidth: '3px',
		borderColor: 'Highlight'
	},
]);

const BaseCode = style({
	fontFamily: 'monospace',
	color: 'var(--mui-palette-text-primary)',
	background: 'var(--mui-palette-background-paper)',
	border: `${config.borderWidth.B300} solid var(--mui-palette-divider)`,
	borderRadius: config.radii.R300,
});

export const Code = style([
	DefaultReset,
	BaseCode,
	{
		padding: `0 ${config.space.S100}`,
	},
]);

export const Spoiler = recipe({
	base: [
		DefaultReset,
		{
			// padding: `0 ${config.space.S100}`,
			// backgroundColor: color.SurfaceVariant.ContainerLine,
			// borderRadius: config.radii.R300,
			selectors: {
				'&[aria-pressed=true]': {
					filter: 'blur(4px)',
				},
			},
		},
	],
	variants: {
		active: {
			true: {
				filter: 'blur(4px)',
			},
		},
	},
});

export const CodeBlock = style([
	DefaultReset,
	BaseCode,
	MarginSpaced,
	{
		fontStyle: 'normal',
	},
]);
export const CodeBlockInternal = style({
	padding: `${config.space.S200} ${config.space.S200} 0`,
});

export const List = style([
	DefaultReset,
	MarginSpaced,
	{
		padding: `0 ${config.space.S100}`,
		paddingLeft: config.space.S600,
	},
]);

export const Img = style([
	DefaultReset,
	MarginSpaced,
	{
		maxWidth: toRem(296),
		borderRadius: config.radii.R300,
	},
]);

export const InlineChromiumBugfix = style({
	fontSize: 0,
	lineHeight: 0,
});

export const Mention = recipe({
	base: [
		DefaultReset,
		{
			backgroundColor: 'rgba(var(--mui-palette-primary-mainChannel) / 1)',
			borderRadius: 'var(--mui-shape-borderRadius)',
			color: 'var(--mui-palette-primary-contrastText)',
			padding: `0 ${config.space.S100}`,
		},
	],
	variants: {
		highlight: {
			true: {
				backgroundColor: 'rgba(var(--mui-palette-warning-mainChannel) / 1)',
				color: 'var(--mui-palette-warning-contrastText)',
			},
		},
	},
});

export const Command = recipe({
	base: [
		DefaultReset,
		{
			padding: `0 ${toRem(2)}`,
			borderRadius: config.radii.R300,
			fontWeight: config.fontWeight.W500,
		},
	],
	variants: {
		focus: {
			true: {
				boxShadow: `0 0 0 ${config.borderWidth.B300} ${color.Warning.OnContainer}`,
			},
		},
		active: {
			true: {
				backgroundColor: color.Warning.Container,
				color: color.Warning.OnContainer,
				boxShadow: `0 0 0 ${config.borderWidth.B300} ${color.Warning.ContainerLine}`,
			},
		},
	},
});

export const EmoticonBase = style([
	DefaultReset,
	{
		display: 'inline-block',
		padding: '0.05rem',
		height: '1em',
		verticalAlign: 'middle',
	},
]);

export const Emoticon = recipe({
	base: [
		DefaultReset,
		{
			display: 'inline-flex',
			justifyContent: 'center',
			alignItems: 'center',

			height: '1em',
			minWidth: '1em',
			fontSize: '1.33em',
			lineHeight: '1em',
			verticalAlign: 'middle',
			position: 'relative',
			top: '-0.35em',
			borderRadius: config.radii.R300,
		},
	],
});

export const EmoticonImg = style([
	DefaultReset,
	{
		height: '1em',
		cursor: 'default',
	},
]);

export const highlightText = style([
	DefaultReset,
	{
		backgroundColor: 'yellow',
		color: 'black',
	},
]);
