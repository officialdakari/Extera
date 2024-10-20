import React from 'react';
import { Box } from 'folds';
import { Chip, Divider } from '@mui/material';
import { getText } from '../../../lang';

export function OrDivider() {
    return (
        <Box grow='Yes' gap="400" alignItems="Center" style={{ width: '100%' }}>
            <Divider style={{ width: '100%' }}>
                <Chip label={getText('generic.OR')} size="small" />
            </Divider>
        </Box>
    );
}
