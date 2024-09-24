import { style } from "@vanilla-extract/css";
import { color, config } from "folds";

export const WidgetItem = style({
    width: 'auto',
    padding: config.space.S400,
    justifyContent: 'space-between',
    //boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`
});