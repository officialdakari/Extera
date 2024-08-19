import { style } from "@vanilla-extract/css";
import { color, config } from "folds";

export const WidgetItem = style({
    width: 'auto',
    margin: '10px',
    color: color.SurfaceVariant.OnContainer,
    padding: config.space.S400,
    justifyContent: 'space-between',
    backgroundColor: color.SurfaceVariant.Container,
    boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
    borderRadius: config.radii.R400
});