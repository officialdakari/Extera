import React from 'react';
import { Box, color, Text } from 'folds';
import Icon from '@mdi/react';
import { mdiAlert } from '@mdi/js';

export function FieldError({ message }: { message: string }) {
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
      <Icon size={1} path={mdiAlert} />
      <Text size="T200">
        <b>{message}</b>
      </Text>
    </Box>
  );
}
