import React, { ReactNode } from 'react';
import { Box } from 'folds';
import Draggable from 'react-draggable';

type ClientLayoutProps = {
    nav: ReactNode;
    children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
    return (
        <Box style={{ height: '100%' }}>
            <Box shrink="No">{nav}</Box>
            <Box grow="Yes">{children}</Box>
        </Box>
    );
}
