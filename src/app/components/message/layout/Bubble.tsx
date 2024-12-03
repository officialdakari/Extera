import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';
import classNames from 'classnames';
import { colors, useTheme } from '@mui/material';
import { blue, cyan, purple } from '@mui/material/colors';
import settings from '../../../../client/state/settings';
import { light } from '@mui/material/styles/createPalette';

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
                className={css.BubbleContent({
                    dark: isDark ? (rightAligned ? 'local' : 'remote') : undefined,
                    light: !isDark ? (rightAligned ? 'local' : 'remote') : undefined
                })}
                direction="Column"
            >
                {children}
                {after &&
                    <div dir='ltr' className={css.BubbleAfter}>{after}</div>}
            </Box>
        </Box>
    );
});
