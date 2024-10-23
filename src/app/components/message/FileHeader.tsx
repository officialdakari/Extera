import { Box, Text, as, toRem } from 'folds';
import React from 'react';
import { mimeTypeToExt } from '../../utils/mimeTypes';
import { Chip, Typography } from '@mui/material';

const badgeStyles = { maxWidth: toRem(100) };

export type FileHeaderProps = {
    body: string;
    mimeType: string;
};
export const FileHeader = as<'div', FileHeaderProps>(({ body, mimeType, ...props }, ref) => (
    <Box alignItems="Center" gap="200" grow="Yes" {...props} ref={ref}>
        <Chip sx={{ maxWidth: '100px' }} label={mimeTypeToExt(mimeType)} size='small' />
        <Typography>
            {body}
        </Typography>
    </Box>
));
