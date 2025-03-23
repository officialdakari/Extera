import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const RoomInputPlaceholder = style({
	minHeight: toRem(48),
	backgroundColor: 'var(--mui-palette-background-paper)',
	color: 'var(--mui-palette-text-primary)',
	boxShadow: `inset 0 0 0 ${config.borderWidth.B300} var(--mui-palette-divider)`,
	borderRadius: config.radii.R400,
});

export const RoomInputPlaceholderND = style({
	minHeight: toRem(48)
}); 