import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ReplyBend = style({
    flexShrink: 0,
});

export const Reply = style({
    marginBottom: toRem(1),
    minWidth: 0,
    minHeight: config.lineHeight.T300,
    maxHeight: '600px',
    width: '100%',
    selectors: {
        'button&': {
            cursor: 'pointer',
        },
    },
    backgroundColor: color.Background.ContainerLine,
    padding: '5px',
    borderRadius: config.radii.R300,
    borderStyle: 'solid',
    borderLeftWidth: '3px'
    //maskImage: `linear-gradient(to bottom, black calc(100% - 50px), transparent)`
});

export const ReplyContent = style({
    opacity: config.opacity.P300,
    maxWidth: '100%',
    maxHeight: '100px',
    selectors: {
        [`${Reply}:hover &`]: {
            opacity: config.opacity.P500,
        },
    },
    overflow: 'hidden',
    textOverflow: 'ellipsis'
});
