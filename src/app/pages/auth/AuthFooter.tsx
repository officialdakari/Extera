import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';
import cons from '../../../client/state/cons';
import { getText } from '../../../lang';

export function AuthFooter() {
    return (
        <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
            <Text as="a" size="T300" href="https://extera.officialdakari.ru" target="_blank" rel="noreferrer">
                {getText('footer.about')}
            </Text>
            <Text
                as="a"
                size="T300"
                href="https://github.com/OfficialDakari/Extera"
                target="_blank"
                rel="noreferrer"
            >
                {cons.version}
            </Text>
            <Text as="a" size="T300" href="https://matrix.to/#/#extera:officialdakari.ru" target="_blank" rel="noreferrer">
                {getText('footer.mx_room')}
            </Text>
            <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
                {getText('footer.mx_powered')}
            </Text>
        </Box>
    );
}
