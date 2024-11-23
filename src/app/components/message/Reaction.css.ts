import { colors } from '@mui/material';
import { createVar, style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, config, toRem } from 'folds';

export const Reaction = style([
    FocusOutline,
    {
        padding: `${toRem(2)} ${config.space.S200} ${toRem(2)} ${config.space.S100}`,
        backgroundColor: colors.grey[800],
        color: colors.common.white,
        borderRadius: config.radii.Pill,

        selectors: {
            'button&': {
                cursor: 'pointer',
            },
            '&[aria-pressed=true]': {
                backgroundColor: colors.green[500],
            },
            '&:hover, &:focus-visible': {
                backgroundColor: colors.grey[700],
            },
            '&:active': {
                backgroundColor: colors.grey[700],
            },
            '&[aria-disabled=true], &:disabled': {
                cursor: 'not-allowed',
            },
        },
    },
]);

export const ReactionText = style([
    DefaultReset,
    {
        minWidth: 0,
        maxWidth: toRem(150),
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: toRem(25),
    },
]);

export const ReactionImg = style([
    DefaultReset,
    {
        height: '1em',
        minWidth: 0,
        maxWidth: toRem(150),
        objectFit: 'contain',
    },
]);
