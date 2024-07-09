import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const RelativeBase = style([
    DefaultReset,
    {
        position: 'relative',
        width: '100%',
        height: '100%',
    },
]);

export const PollAnswers = style({
    padding: config.space.S100,
});

export const PollAnswerItemText = style({
    flexGrow: 1,
});

export const PollAnswerItemVoted = style({
    fontWeight: 'bold'
});

export const AbsoluteContainer = style([
    DefaultReset,
    {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
]);

export const AbsoluteFooter = style([
    DefaultReset,
    {
        position: 'absolute',
        bottom: config.space.S100,
        left: config.space.S100,
        right: config.space.S100,
    },
]);

export const ModalWide = style({
    minWidth: '85vw',
    minHeight: '90vh',
});
