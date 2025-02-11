import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomHistoryVisibility.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';
import { getText } from '../../../lang';
import { ListItem, ListItemIcon, ListItemText, Radio } from '@mui/material';
import Icon from '@mdi/react';

const visibility = {
    WORLD_READABLE: 'world_readable',
    SHARED: 'shared',
    INVITED: 'invited',
    JOINED: 'joined',
};

const items = [{
    iconSrc: null,
    text: getText('history_visibility.anyone'),
    type: visibility.WORLD_READABLE,
}, {
    iconSrc: null,
    text: getText('history_visibility.members'),
    type: visibility.SHARED,
}, {
    iconSrc: null,
    text: getText('history_visibility.invited'),
    type: visibility.INVITED,
}, {
    iconSrc: null,
    text: getText('history_visibility.joined'),
    type: visibility.JOINED,
}];

function setHistoryVisibility(roomId, type) {
    const mx = initMatrix.matrixClient;

    return mx.sendStateEvent(
        roomId, 'm.room.history_visibility',
        {
            history_visibility: type,
        },
    );
}

function useVisibility(roomId) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);

    const [activeType, setActiveType] = useState(room.getHistoryVisibility());
    useEffect(() => {
        setActiveType(room.getHistoryVisibility());
    }, [roomId]);

    const setVisibility = useCallback((item) => {
        if (item.type === activeType.type) return;
        setActiveType(item.type);
        setHistoryVisibility(roomId, item.type);
    }, [activeType, roomId]);

    return [activeType, setVisibility];
}

function RoomHistoryVisibility({ roomId }) {
    const [activeType, setVisibility] = useVisibility(roomId);
    const mx = initMatrix.matrixClient;
    const userId = mx.getUserId();
    const room = mx.getRoom(roomId);
    const { currentState } = room;

    const canChange = currentState.maySendStateEvent('m.room.history_visibility', userId);

    return (
        <div className="room-history-visibility">
            {
                items.map((item) => (
                    <ListItem
                        key={item.type}
                    >
                        <ListItemText>
                            {item.text}
                        </ListItemText>
                        <Radio disabled={(!canChange)} onClick={() => setVisibility(item)} checked={activeType === item.type} />
                    </ListItem>
                ))
            }
            <Text variant="b3">{getText('history_visibility.tip')}</Text>
        </div>
    );
}

RoomHistoryVisibility.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomHistoryVisibility;
