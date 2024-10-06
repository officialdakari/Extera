import { style } from "@vanilla-extract/css";
import { color } from "folds";

export const UserAvatar = style({
    color: color.Secondary.OnContainer,
    textTransform: 'capitalize',
    borderRadius: '50%',
    selectors: {
        '&[data-image-loaded="true"]': {
            backgroundColor: 'transparent',
        },
    },
});