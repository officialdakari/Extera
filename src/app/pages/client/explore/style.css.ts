import { style } from '@vanilla-extract/css';
import { config } from 'folds';
import { ContainerColor } from '../../../styles/ContainerColor.css';

export const RoomsInfoCard = style([
	ContainerColor({ variant: 'surface' }),
	{
		padding: `${config.space.S700} ${config.space.S300}`,
		borderRadius: config.radii.R400,
	},
]);

export const PublicRoomsError = style([
	ContainerColor({ variant: 'error' }),
	{
		padding: config.space.S300,
		borderRadius: config.radii.R400,
	},
]);
