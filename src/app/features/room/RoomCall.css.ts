import { style } from "@vanilla-extract/css";
import { config, DefaultReset } from "folds";

export const RoomCallBox = style({
	width: 'auto',
	margin: '10px',
	color: 'var(--mui-palette-text-primary)',
	padding: config.space.S400,
	backgroundColor: 'var(--mui-palette-background-paper)',
	gap: '20px'
});

export const UsersDiv = style([
	DefaultReset,
	{
		width: '100%',
		height: 'fit-content',
		justifyContent: 'center',
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: '5%',
		gap: '10px'
	}
]);

export const UserAvatarContainer = style([
	DefaultReset,
	{
		height: 'auto',
		width: '96px'
	}
]);

export const CallControlsContainer = style({
	justifyContent: 'center',
	alignSelf: 'center',
	gap: '10px'
});

export const UserAvatarBox = style({
	minWidth: '100px',
	minHeight: '100px',
	borderRadius: config.radii.R300,
	backgroundColor: 'var(--mui-palette-background-paper)',
	color: 'var(--mui-palette-text-primary)',
	boxShadow: `inset 0 0 0 ${config.borderWidth.B300} var(--mui-palette-divider)`,
	alignItems: 'center',
	justifyContent: 'center',
	display: 'flex'
});

export const UserAvatar = style({
	alignSelf: 'center',
	alignContent: 'self',
	justifyContent: 'center'
});

export const VideoFeed = style({
	maxWidth: '400px',
	maxHeight: '400px',
	borderRadius: config.radii.R300
});