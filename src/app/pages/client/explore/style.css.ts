import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const RoomsInfoCard = style({
	padding: `${config.space.S700} ${config.space.S300}`,
	borderRadius: config.radii.R400,
	backgroundColor: 'var(--mui-palette-background-paper)',
});

export const PublicRoomsError = style({
	backgroundColor: 'var(--mui-palette-background-paper)',
	borderColor: 'var(--mui-palette-divider)',
	outlineColor: 'var(--mui-palette-divider)',
	color: 'var(--mui-palette-error-main)',
	padding: config.space.S300,
	borderRadius: config.radii.R400,
});
