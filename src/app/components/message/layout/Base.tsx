import React from 'react';
import { Text, as } from 'folds';
import classNames from 'classnames';
import * as css from './layout.css';
import { HTMLMotionProps, motion } from 'framer-motion';
import UserSelect from '../../../atoms/user-select/UserSelect';

type AnimationProps = {
    replySwipeAnimation?: boolean;
};

export const MessageBase = as<'div', css.MessageBaseVariants & AnimationProps>(
    ({ className, highlight, selected, collapse, autoCollapse, space, replySwipeAnimation, ...props }, ref) => (
        <motion.div
            variants={css.MessageBaseAnimationVariants}
            initial='initial'
            animate={replySwipeAnimation ? 'replySwipe' : undefined}
        >
            <div
                className={classNames(
                    css.MessageBase({ highlight, selected, collapse, autoCollapse, space }),
                    className
                )}
                {...props}
                ref={ref}
            />
        </motion.div>
    )
);

export const AvatarBase = as<'span'>(({ className, ...props }, ref) => (
    <span className={classNames(css.AvatarBase, className)} {...props} ref={ref} />
));

export const Username = as<'span'>(({ as: AsUsername = 'span', className, ...props }, ref) => (
    <AsUsername className={classNames(css.Username, className)} {...props} ref={ref} />
));

export const MessageTextBody = as<'div', css.MessageTextBodyVariants & { notice?: boolean }>(
    ({ as: asComp = 'div', className, preWrap, jumboEmoji, emote, notice, ...props }, ref) => (
        <Text
            as={asComp}
            size="T400"
            priority={notice ? '300' : '400'}
            className={classNames(css.MessageTextBody({ preWrap, jumboEmoji, emote }), className)}
            {...props}
            ref={ref}
        />
    )
);
