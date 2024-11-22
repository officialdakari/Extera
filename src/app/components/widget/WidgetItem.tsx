import React from 'react';
import { Box, Text } from "folds";
import { getText } from '../../../lang';

import * as css from './WidgetItem.css';
import { Button, ButtonGroup, IconButton, Tooltip } from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';

type WidgetItemProps = {
    name?: string;
    url: string;
    type: string;
    onClick?: () => void;
    onRemove?: () => void;
};

export function WidgetItem({ name, type, url, onClick, onRemove }: WidgetItemProps) {
    return (
        <Box className={css.WidgetItem} direction='Row'>
            <Box direction='Column' grow='Yes'>
                <Text priority='400' size='H3'>
                    {name ?? 'Widget'}
                </Text>
                <Text priority='400' size='B400'>
                    {type}
                </Text>
            </Box>
            <Tooltip title={getText('btn.widget.open')}>
                <IconButton
                    color='inherit'
                    onClick={onClick}
                >
                    <OpenInNew />
                </IconButton>
            </Tooltip>
            {onRemove && (
                <Tooltip title={getText('btn.widget.remove')}>
                    <IconButton
                        color='error'
                        onClick={onRemove}
                    >
                        <Close />
                    </IconButton>
                </Tooltip>
            )}
            {/* <ButtonGroup>
                <Button variant='contained' color='primary' onClick={onClick}>
                    {getText('btn.widget.open')}
                </Button>
                {onRemove && (
                    <Button variant='outlined' color='error' onClick={onRemove}>
                        {getText('btn.widget.remove')}
                    </Button>
                )}
            </ButtonGroup> */}
        </Box>
    );
}