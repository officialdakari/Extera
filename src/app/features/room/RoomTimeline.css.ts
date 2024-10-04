import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, config } from 'folds';

export const TimelineFloat = recipe({
    base: [
        DefaultReset,
        {
            position: 'absolute',
            right: '20px',
            zIndex: 1,
            minWidth: 'max-content',
        },
    ],
    variants: {
        position: {
            Top: {
                top: config.space.S400,
            },
            Bottom: {
                bottom: config.space.S400,
            },
        },
    },
    defaultVariants: {
        position: 'Top',
    },
});

export type TimelineFloatVariants = RecipeVariants<typeof TimelineFloat>;
