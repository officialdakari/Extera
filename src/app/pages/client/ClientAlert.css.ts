import { style } from "@vanilla-extract/css";
import { color } from "folds";

export const ClientAlert = style({
    backgroundColor: color.Success.Container,
    color: color.Success.OnContainer,
    justifyContent: 'center',
    display: 'flex',
    position: 'absolute',
    width: '100%',
    zIndex: '999'
});