import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';

export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text as="a" size="T300" href="https://extera.officialdakari.ru" target="_blank" rel="noreferrer">
        About
      </Text>
      <Text
        as="a"
        size="T300"
        href="https://git.cycloneteam.space/OfficialDakari/Extera"
        target="_blank"
        rel="noreferrer"
      >
        v3.2.0
      </Text>
      <Text as="a" size="T300" href="https://matrix.to/#/#basement:officialdakari.ru" target="_blank" rel="noreferrer">
        Matrix Room
      </Text>
      <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
        Powered by Matrix
      </Text>
    </Box>
  );
}
