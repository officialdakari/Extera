import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

export const UrlPreview = style([
	DefaultReset,
	{
		width: toRem(400),
		minHeight: toRem(102),
		backgroundColor: 'var(--mui-palette-background-paper)',
		color: 'var(--mui-palette-text-primary)',
		border: `${config.borderWidth.B300} solid var(--mui-palette-divider)`,
		borderRadius: config.radii.R300,
		overflow: 'hidden',
	},
]);

export const UrlPreviewImg = style([
	DefaultReset,
	{
		width: toRem(100),
		height: toRem(100),
		objectFit: 'cover',
		objectPosition: 'left',
		backgroundPosition: 'start',
		flexShrink: 0,
		overflow: 'hidden',
	},
]);

export const UrlPreviewContent = style([
	DefaultReset,
	{
		padding: config.space.S200,
	},
]);

export const UrlPreviewDescription = style([
	DefaultReset,
	{
		display: '-webkit-box',
		WebkitLineClamp: 2,
		WebkitBoxOrient: 'vertical',
		overflow: 'hidden',
	},
]);
