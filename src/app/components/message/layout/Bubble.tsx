import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';
import classNames from 'classnames';
import { useTheme } from '@mui/material';
import { blue, cyan, purple } from '@mui/material/colors';
import settings from '../../../../client/state/settings';

type BubbleLayoutProps = {
    before?: ReactNode;
    after?: ReactNode;
    rightAligned?: boolean;
    transparent?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(({ before, rightAligned, transparent, children, after, ...props }, ref) => {
    const theme = useTheme();
    const isDark = settings.getThemeIndex() === 2;
    return (
        <Box
            justifyContent={rightAligned ? 'End' : undefined}
            gap="300"
            {...props}
            ref={ref}
        >
            <Box className={css.BubbleBefore} shrink="No">
                {before}
            </Box>
            <Box
                className={css.BubbleContent}
                style={{
                    backgroundColor: !transparent
                        ? (rightAligned
                            ? purple[900]
                            : (isDark ? theme.palette.grey[800] : theme.palette.background.paper))
                        : 'transparent',
                    borderRadius: theme.shape.borderRadius
                }}
                direction="Column"
            >
                {children}
                {after &&
                    <div dir='ltr' className={css.BubbleAfter}>{after}</div>}
            </Box>
        </Box>
    );
});
