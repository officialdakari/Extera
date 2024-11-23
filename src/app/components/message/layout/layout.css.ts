import { createVar, keyframes, style, styleVariants } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';
import { HTMLMotionProps, Variants } from 'framer-motion';

export const StickySection = style({
    position: 'sticky',
    top: config.space.S100,
});

const SpacingVar = createVar();
const SpacingVariant = styleVariants({
    '0': {
        vars: {
            [SpacingVar]: config.space.S0,
        },
    },
    '100': {
        vars: {
            [SpacingVar]: config.space.S100,
        },
    },
    '200': {
        vars: {
            [SpacingVar]: config.space.S200,
        },
    },
    '300': {
        vars: {
            [SpacingVar]: config.space.S300,
        },
    },
    '400': {
        vars: {
            [SpacingVar]: config.space.S400,
        },
    },
    '500': {
        vars: {
            [SpacingVar]: config.space.S500,
        },
    },
});

// Who shortened "animation" like that {:orehus:mxc://officialdakari.ru/VrjQRgGeQyzPcFQxkDroeQJZ:}
// ok I wont touch it
const highlightAnime = keyframes({
    '0%': {
        backgroundColor: color.Primary.Container,
    },
    '25%': {
        backgroundColor: color.Primary.ContainerActive,
    },
    '50%': {
        backgroundColor: color.Primary.Container,
    },
    '75%': {
        backgroundColor: color.Primary.ContainerActive,
    },
    '100%': {
        backgroundColor: color.Primary.Container,
    },
});

const HighlightVariant = styleVariants({
    true: {
        animation: `${highlightAnime} 2000ms ease-in-out`,
        animationIterationCount: 'infinite',
    },
});

const SelectedVariant = styleVariants({
    true: {
        backgroundColor: color.Surface.ContainerActive,
    },
});

const AutoCollapse = style({
    selectors: {
        [`&+&`]: {
            marginTop: 0,
        },
    },
});

export const MessageBaseAnimationVariants: Variants = {
    initial: {
        translateX: 0
    },
    replySwipe: {
        translateX: '-30px',
        translateY: '-2px',
        scale: 1.1,
    }
};

export const MessageBase = recipe({
    base: [
        DefaultReset,
        {
            marginTop: SpacingVar,
            padding: `${config.space.S100} ${config.space.S200} ${config.space.S100} ${config.space.S400}`,
            borderRadius: `0 ${config.radii.R400} ${config.radii.R400} 0`,
        },
    ],
    variants: {
        space: SpacingVariant,
        collapse: {
            true: {
                marginTop: 0,
            },
        },
        autoCollapse: {
            true: AutoCollapse,
        },
        highlight: HighlightVariant,
        selected: SelectedVariant,
    },
    defaultVariants: {
        space: '400',
    },
});

export type MessageBaseVariants = RecipeVariants<typeof MessageBase>;

export const CompactHeader = style([
    DefaultReset,
    StickySection,
    {
        maxWidth: toRem(170),
        width: '100%',
    },
]);

export const AvatarBase = style({
    paddingTop: toRem(4),
    transition: 'transform 200ms cubic-bezier(0, 0.8, 0.67, 0.97)',
    alignSelf: 'start',

    selectors: {
        '&:hover': {
            transform: `translateY(${toRem(-4)})`,
        },
    },
});

export const ModernBefore = style({
    minWidth: toRem(36),
});

export const BubbleBefore = style([ModernBefore]);

export const BubbleContent = style({
    maxWidth: '75%',
    padding: config.space.S200,
    position: 'relative',
});

export const BubbleContentTransparent = style({
    background: 'transparent'
});

export const BubbleAfter = style({
    //@ts-ignore
    '> time': {
        position: 'relative',
        bottom: 'auto !important',
        float: 'right',
        lineHeight: 1.35,
        marginLeft: '.4375rem',
        flexGrow: 0,
    },
    width: 'min-content',
    alignSelf: 'end',
    flexGrow: 0,
    right: 0,
    display: 'flex',
    padding: '0 0',
    float: 'right',
    position: 'relative'
});


export const Username = style({
    display: 'flex',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    selectors: {
        'button&': {
            cursor: 'pointer',
        },
        'button&:hover, button&:focus-visible': {
            textDecoration: 'underline',
        },
    },
});

export const MessageTextBody = recipe({
    base: {
        wordBreak: 'break-word',
        userSelect: 'text'
    },
    variants: {
        preWrap: {
            true: {
                whiteSpace: 'pre-wrap',
            },
        },
        jumboEmoji: {
            true: {
                fontSize: '1.504em',
                lineHeight: '1.4962em',
            },
        },
        emote: {
            true: {
                fontStyle: 'italic',
            },
        },
    },
});

export type MessageTextBodyVariants = RecipeVariants<typeof MessageTextBody>;
