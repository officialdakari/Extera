import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const CardGrid = style({
    display: 'grid',
    gap: config.space.S400,
    gridTemplateColumns: 'repeat(3, 1fr)'
});

export const RoomCardBase = style([
    DefaultReset,
    {
        padding: config.space.S500,
        borderRadius: config.radii.R500,
    },
]);

export const RoomCardTopic = style({
    minHeight: `calc(3 * ${config.lineHeight.T200})`,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    cursor: 'pointer',

    ':hover': {
        textDecoration: 'underline',
    },
});

export const ActionButton = style({
    flex: '1 1 0',
    minWidth: 1,
});
