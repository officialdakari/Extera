import { style } from "@vanilla-extract/css";
import { color, config, DefaultReset } from "folds";

export const RoomCallBox = style({
    width: 'auto',
    minHeight: '200px',
    margin: '10px',
    //backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    //boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
    //borderRadius: config.radii.R400,
    padding: config.space.S400,
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
    width: 'fit-content',
    alignSelf: 'center',
    gap: '10px'
});

export const UserAvatarBox = style({
    minWidth: '100px',
    minHeight: '100px',
    borderRadius: config.radii.R300,
    backgroundColor: color.Background.Container,
    color: color.SurfaceVariant.OnContainer,
    boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
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
    maxHeight: '400px'
});