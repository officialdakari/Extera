import { mdiPencil, mdiPlus } from '@mdi/js';
import Icon from '@mdi/react';
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import { Add, ArrowForward, ArrowUpward, Edit, PersonAdd, PlusOne } from '@mui/icons-material';
import React, { useState } from 'react';
import { openCreateRoom, openInviteUser, openJoinAlias } from '../../../client/action/navigation';

import * as css from './FAB.css';
import { getText } from '../../../lang';

export default function FAB() {
    return (
        <SpeedDial
            ariaLabel='new chat'
            sx={{ position: 'absolute', bottom: 70, right: 16 }}

            icon={<SpeedDialIcon icon={<Edit />} openIcon={<ArrowUpward />} />}
        >
            <SpeedDialAction
                key='createRoom'
                icon={<Add />}
                tooltipTitle={getText('tooltip.new_room')}
                tooltipOpen
                onClick={() => openCreateRoom()}
            />
            <SpeedDialAction
                key='createRoom'
                icon={<ArrowForward />}
                tooltipTitle={getText('tooltip.join_room')}
                tooltipOpen
                onClick={() => openJoinAlias()}
            />
            <SpeedDialAction
                key='createRoom'
                icon={<PersonAdd />}
                tooltipTitle={getText('tooltip.new_dm')}
                tooltipOpen
                onClick={() => openInviteUser()}
            />
        </SpeedDial>
    );
}