import React from 'react';
import PropTypes from 'prop-types';
import './PowerLevelSelector.scss';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

import { getText } from '../../../lang';
import { IconButton, Paper, TextField, useTheme } from '@mui/material';
import { Check } from '@mui/icons-material';

function PowerLevelSelector({
    value, max, onSelect,
}) {
    const handleSubmit = (e) => {
        const powerLevel = e.target.elements['power-level']?.value;
        if (!powerLevel) return;
        onSelect(Number(powerLevel));
    };

    const theme = useTheme();

    return (
        <Paper sx={{ p: theme.spacing(1) }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
                <TextField
                    size='small'
                    inputMode='decimal'
                    slotProps={
                        {
                            htmlInput: {
                                max
                            }
                        }
                    }
                    name='power-level'
                    label='Power level'
                    autoComplete='off'
                    required
                    defaultValue={Number(value)}
                />
                <IconButton color="primary" type="submit"><Check /></IconButton>
            </form>
            {max >= 100 && <MenuItem variant={value === 100 ? 'positive' : 'surface'} onClick={() => onSelect(100)}>{getText('power_level.admin')}</MenuItem>}
            {max >= 50 && <MenuItem variant={value === 50 ? 'positive' : 'surface'} onClick={() => onSelect(50)}>{getText('power_level.mod')}</MenuItem>}
            {max >= 0 && <MenuItem variant={value === 0 ? 'positive' : 'surface'} onClick={() => onSelect(0)}>{getText('power_level.member')}</MenuItem>}
        </Paper>
    );
}

PowerLevelSelector.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default PowerLevelSelector;
