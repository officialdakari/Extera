import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UploadBoardBase = style([
    DefaultReset,
    {
        position: 'relative',
        pointerEvents: 'none',
        height: 'fit-content'
    },
]);

export const UploadBoardContainer = style([
    DefaultReset
]);

export const UploadBoard = style({
    width: '100%',
    maxHeight: toRem(450),
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'all',
});

export const UploadBoardHeaderContent = style({
    height: '100%',
    padding: `0 ${config.space.S200}`,
});

export const UploadBoardContent = style({
    padding: config.space.S200,
    paddingBottom: 0,
    paddingRight: 0,
});

export const UploadBoardHeader = style({
    padding: config.space.S200
});