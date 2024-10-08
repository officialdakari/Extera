import React from 'react';
import { Box, Button, Text } from "folds";
import { getText } from '../../../lang';

import * as css from './WidgetItem.css';

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
            <Box direction='Column'>
                <Text priority='400' size='H3'>
                    {name ?? 'Widget'}
                </Text>
                <Text priority='400' size='B400'>
                    {type}
                </Text>
            </Box>
            <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant='Primary' onClick={onClick}>
                    {getText('btn.widget.open')}
                </Button>
                {onRemove && (
                    <Button variant='Critical' onClick={onRemove}>
                        {getText('btn.widget.remove')}
                    </Button>
                )}
            </div>
        </Box>
    );
}