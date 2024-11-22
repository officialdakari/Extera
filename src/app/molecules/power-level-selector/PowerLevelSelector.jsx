import React from 'react';
import PropTypes from 'prop-types';
import './PowerLevelSelector.scss';

import { getText } from '../../../lang';
import { IconButton, MenuItem, Paper, TextField, useTheme } from '@mui/material';
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
        <Paper sx={{ p: theme.spacing(1), boxShadow: 'none' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
                <TextField
                    size='small'
                    inputMode='decimal'
                    type='number'
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
                    sx={{ flexGrow: 1 }}
                    defaultValue={Number(value)}
                />
                <IconButton color="primary" type="submit"><Check /></IconButton>
            </form>
            {max >= 100 && <MenuItem selected={value === 100} onClick={() => onSelect(100)}>{getText('power_level.admin')}</MenuItem>}
            {max >= 50 && <MenuItem selected={value === 50} onClick={() => onSelect(50)}>{getText('power_level.mod')}</MenuItem>}
            {max >= 0 && <MenuItem selected={value === 0} onClick={() => onSelect(0)}>{getText('power_level.member')}</MenuItem>}
        </Paper>
    );
}

PowerLevelSelector.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default PowerLevelSelector;
