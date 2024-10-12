import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { RadiiVariant, color, config } from 'folds';

export const UploadCard = recipe({
    base: {
        padding: config.space.S300,
        flexShrink: 0
    },
    variants: {
        radii: RadiiVariant,
    },
    defaultVariants: {
        radii: '400',
    },
});

export type UploadCardVariant = RecipeVariants<typeof UploadCard>;

export const UploadCardError = style({
    padding: `0 ${config.space.S100}`,
});
