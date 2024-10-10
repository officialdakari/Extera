import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';
import classNames from 'classnames';

type BubbleLayoutProps = {
    before?: ReactNode;
    after?: ReactNode;
    rightAligned?: boolean;
    transparent?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(({ before, rightAligned, transparent, children, after, ...props }, ref) => (
    <Box justifyContent={rightAligned ? 'End' : undefined} gap="300" {...props} ref={ref}>
        <Box className={css.BubbleBefore} shrink="No">
            {before}
        </Box>
        <Box className={classNames(rightAligned ? css.BubbleContentRightAligned : css.BubbleContent, transparent && css.BubbleContentTransparent)} direction="Column">
            {children}
            {after &&
                <div className={css.BubbleAfter}>{after}</div>}
        </Box>
    </Box>
));
