import { mdiPencil, mdiPlus } from '@mdi/js';
import Icon from '@mdi/react';
import { Fab, Zoom } from '@mui/material';
import { Box, OverlayBackdrop } from 'folds';
import React, { useState } from 'react';
import { openCreateRoom } from '../../../client/action/navigation';

import * as css from './FAB.css';

export default function FAB() {
    const [maximized, setMaximized] = useState(false);
    return (
        <Box alignItems='Center' direction='Column' display='Flex' gap='300' style={{ zIndex: 50, position: 'absolute', bottom: '20px', right: '20px', width: 'inherit' }}>
            {maximized && (
                <Zoom
                    in
                    timeout={300}
                    unmountOnExit
                >
                    <Fab size='small' onClick={() => openCreateRoom()} color='default' aria-label='Create room'>
                        <Icon path={mdiPlus} size={1} />
                    </Fab>
                </Zoom>
            )}
            {maximized && (
                <div className={css.AbsoluteContainer}>
                    <OverlayBackdrop />
                </div>
            )}
            <Fab onClick={() => setMaximized(!maximized)} color='primary' aria-label='New chat'>
                <Icon path={mdiPencil} size={1} />
            </Fab>
        </Box>
    );
}