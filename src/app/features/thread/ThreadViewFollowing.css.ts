import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const ThreadViewFollowing = recipe({
    base: [
        DefaultReset,
        {
            minHeight: toRem(28),
            padding: `0 ${config.space.S400}`,
            width: '100%',
            backgroundColor: 'transparent',
            color: color.Surface.OnContainer,
            outline: 'none',
        },
    ],
    variants: {
        clickable: {
            true: {
                cursor: 'pointer',
                selectors: {
                    '&:hover, &:focus-visible': {
                        color: color.Primary.Main,
                    },
                    '&:active': {
                        color: color.Primary.Main,
                    },
                },
            },
        },
    },
});
