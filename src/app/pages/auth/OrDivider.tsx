import React from 'react';
import { Box, Line, Text } from 'folds';
import { getText } from '../../../lang';

export function OrDivider() {
    return (
        <Box gap="400" alignItems="Center">
            <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
            <Text>{getText('generic.OR')}</Text>
            <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
        </Box>
    );
}
