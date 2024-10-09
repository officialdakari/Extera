import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const HeaderTopic = style({
    ':hover': {
        cursor: 'pointer',
        opacity: config.opacity.P500,
        textDecoration: 'underline',
    },
});

export const PinListFooter = style({
    borderTopWidth: config.borderWidth.B300,
    borderBottomWidth: 0,
});