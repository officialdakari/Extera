import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type BubbleLayoutProps = {
    before?: ReactNode;
    after?: ReactNode;
    rightAligned?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(({ before, rightAligned, children, after, ...props }, ref) => (
    <Box justifyContent={rightAligned ? 'End' : undefined} gap="300" {...props} ref={ref}>
        <Box className={css.BubbleBefore} shrink="No">
            {before}
        </Box>
        <Box className={rightAligned ? css.BubbleContentRightAligned : css.BubbleContent} direction="Column">
            {children}
            {after &&
                <div className={css.BubbleAfter}>{after}</div>}
        </Box>
    </Box>
));
