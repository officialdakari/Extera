import { Box, Text, as, toRem } from 'folds';
import React from 'react';
import { mimeTypeToExt } from '../../utils/mimeTypes';
import { Chip } from '@mui/material';

const badgeStyles = { maxWidth: toRem(100) };

export type FileHeaderProps = {
    body: string;
    mimeType: string;
};
export const FileHeader = as<'div', FileHeaderProps>(({ body, mimeType, ...props }, ref) => (
    <Box alignItems="Center" gap="200" grow="Yes" {...props} ref={ref}>
        <Chip label={mimeTypeToExt(mimeType)} size='small' />
        <Text size="T300" truncate>
            {body}
        </Text>
    </Box>
));
