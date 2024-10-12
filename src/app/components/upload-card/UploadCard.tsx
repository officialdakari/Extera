import { Box, Text, percent } from 'folds';
import React, { ReactNode, forwardRef } from 'react';

import * as css from './UploadCard.css';
import { bytesToSize } from '../../utils/common';
import Icon from '@mdi/react';
import { mdiAlert } from '@mdi/js';
import { Alert, LinearProgress } from '@mui/material';
import LinearProgressWithLabel from '../LinearProgressWithLabel';

type UploadCardProps = {
    before?: ReactNode;
    children: ReactNode;
    after?: ReactNode;
    bottom?: ReactNode;
};

export const UploadCard = forwardRef<HTMLDivElement, UploadCardProps & css.UploadCardVariant>(
    ({ before, after, children, bottom, radii }, ref) => (
        <Box className={css.UploadCard({ radii })} direction="Column" gap="200" ref={ref}>
            <Box alignItems="Center" gap="200">
                {before}
                <Box alignItems="Center" grow="Yes" gap="200">
                    {children}
                </Box>
                {after}
            </Box>
            {bottom}
        </Box>
    )
);

type UploadCardProgressProps = {
    sentBytes: number;
    totalBytes: number;
};

export function UploadCardProgress({ sentBytes, totalBytes }: UploadCardProgressProps) {
    return (
        <LinearProgressWithLabel variant='determinate' value={(sentBytes * 100) / (totalBytes)} />
    );
}

type UploadCardErrorProps = {
    children: ReactNode;
};

export function UploadCardError({ children }: UploadCardErrorProps) {
    return (
        <Alert severity='error'>
            {children}
        </Alert>
    );
}
