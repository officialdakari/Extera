import React, { ComponentProps, MutableRefObject, PropsWithChildren, ReactNode, RefObject } from 'react';
import { AsProp, Box, Header, Line, Scroll, Text, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './style.css';
import { ScreenSize, useScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useTheme } from '@mui/material';
import { AnimatePresence, HTMLMotionProps, Variants, motion } from 'framer-motion';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import BottomNav from '../../pages/client/BottomNav';
import { MotionBox } from '../../atoms/motion/Animated';

type PageRootProps = {
    nav: ReactNode;
    children: ReactNode;
};

export function PageRoot({ nav, children }: PageRootProps) {
    const screenSize = useScreenSizeContext();

    return (
        <Box grow="Yes" className={ContainerColor({ variant: 'Background' })}>
            {nav}
            {screenSize !== ScreenSize.Mobile && (
                <Line variant="Background" size="300" direction="Vertical" />
            )}
            {children}
        </Box>
    );
}

type ClientDrawerLayoutProps = {
    children: ReactNode;
    header?: ReactNode;
};
export function PageNav({ children, header, ...props }: ClientDrawerLayoutProps & HTMLMotionProps<'div'>) {
    const screenSize = useScreenSizeContext();
    const isMobile = screenSize === ScreenSize.Mobile;
    const theme = useTheme();

    return (
        <Box
            grow={isMobile ? 'Yes' : undefined}
            className={css.PageNav}
            shrink={isMobile ? 'Yes' : 'No'}
            style={{ backgroundColor: theme.palette.background.default }}
        >
            <Box grow="Yes" direction="Column">
                {header}
                <MobileAnimatedLayout
                    initial='exit'
                    style={{ height: '100%' }}
                    {...props}
                >
                    {children}
                </MobileAnimatedLayout>
                <BottomNav />
            </Box>
        </Box>
    );
}

export const PageNavHeader = as<'header'>(({ className, ...props }, ref) => (
    <Header
        className={classNames(css.PageNavHeader, className)}
        variant="Background"
        size="600"
        {...props}
        ref={ref}
    />
));

export function PageNavContent({
    scrollRef,
    children,
}: {
    children: ReactNode;
    scrollRef?: MutableRefObject<HTMLDivElement | null>;
}) {
    const theme = useTheme();
    return (
        <Box grow="Yes" direction="Column">
            <Scroll
                style={{ backgroundColor: theme.palette.background.default }}
                ref={scrollRef}
                direction="Vertical"
                size="300"
                hideTrack
                visibility="Hover"
            >
                <div className={css.PageNavContent}>{children}</div>
            </Scroll>
        </Box>
    );
}

const PageAnimationVariants: Variants = {
    initial: {
        translateX: '20px',
        opacity: 0.3,
        transition: {
            ease: 'linear'
        },
    },
    final: {
        translateX: 0,
        opacity: 1,
        transition: {
            ease: 'linear'
        },
    },
    exit: {
        translateX: '-20px',
        opacity: 0.3,
        transition: {
            ease: 'linear'
        },
    }
};

export function AnimatedLayout(props: PropsWithChildren & HTMLMotionProps<'div'>) {
    return (
        <motion.div
            initial='initial'
            animate='final'
            exit='exit'
            variants={PageAnimationVariants}
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
            layoutScroll
            {...props}
        />
    );
}

export function AnimatedNode(props: PropsWithChildren & HTMLMotionProps<'div'>) {
    return (
        <motion.div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
            {...props}
        />
    );
}

export function MobileAnimatedLayout(props: PropsWithChildren & HTMLMotionProps<'div'>) {
    const screenSize = useScreenSize();
    if (screenSize === ScreenSize.Mobile) {
        return (
            <MotionBox
                initial='initial'
                animate='final'
                exit='exit'
                variants={PageAnimationVariants}
                direction='Column'
                {...props}
            />
        );
    }
    return props.children;
}

export const Page = as<'div'>(({ className, children, ...props }, ref) => {
    const theme = useTheme();
    return (
        <Box
            grow="Yes"
            direction="Column"
            style={{ backgroundColor: theme.palette.background.default }}
            {...props}
            ref={ref}
        >
            <AnimatePresence>
                <motion.div
                    initial='initial'
                    animate='final'
                    exit='exit'
                    variants={PageAnimationVariants}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                    layoutScroll
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </Box>
    );
});

export const PageHeader = as<'div'>(({ className, ...props }, ref) => (
    <Header
        as="header"
        size="600"
        className={classNames(css.PageHeader, className)}
        {...props}
        ref={ref}
    />
));

export const PageContent = as<'div'>(({ className, ...props }, ref) => (
    <div className={classNames(css.PageContent, className)} {...props} ref={ref} />
));

export const PageHeroSection = as<'div', ComponentProps<typeof Box>>(
    ({ className, ...props }, ref) => (
        <Box
            direction="Column"
            className={classNames(css.PageHeroSection, className)}
            {...props}
            ref={ref}
        />
    )
);

export function PageHero({
    icon,
    title,
    subTitle,
    children,
}: {
    icon: ReactNode;
    title: ReactNode;
    subTitle: ReactNode;
    children?: ReactNode;
}) {
    return (
        <Box direction="Column" gap="400">
            <Box direction="Column" alignItems="Center" gap="200">
                {icon}
            </Box>
            <Box as="h2" direction="Column" gap="200" alignItems="Center">
                <Text align="Center" size="H2">
                    {title}
                </Text>
                <Text align="Center" priority="400">
                    {subTitle}
                </Text>
            </Box>
            {children}
        </Box>
    );
}

export const PageContentCenter = as<'div'>(({ className, ...props }, ref) => (
    <div className={classNames(css.PageContentCenter, className)} {...props} ref={ref} />
));
