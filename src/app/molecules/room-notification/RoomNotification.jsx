import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomNotification.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';

import Text from '../../atoms/text/Text';

import { getNotificationType } from '../../utils/room';
import { getText } from '../../../lang';
import { mdiBell, mdiBellAlert, mdiBellOff, mdiBellRing } from '@mdi/js';
import { Accordion, AccordionDetails, AccordionSummary, List, ListItem, ListItemIcon, ListItemText, ListSubheader, Radio } from '@mui/material';
import Icon from '@mdi/react';
import { ExpandMore } from '@mui/icons-material';

const items = [
    {
        iconSrc: mdiBell,
        text: getText('room_notifications.global'),
        type: cons.notifs.DEFAULT,
    },
    {
        iconSrc: mdiBellRing,
        text: getText('room_notifications.all'),
        type: cons.notifs.ALL_MESSAGES,
    },
    {
        iconSrc: mdiBellAlert,
        text: getText('room_notifications.mentions'),
        type: cons.notifs.MENTIONS_AND_KEYWORDS,
    },
    {
        iconSrc: mdiBellOff,
        text: getText('room_notifications.mute'),
        type: cons.notifs.MUTE,
    },
];

function setRoomNotifType(roomId, newType) {
    const mx = initMatrix.matrixClient;
    let roomPushRule;
    try {
        roomPushRule = mx.getRoomPushRule('global', roomId);
    } catch {
        roomPushRule = undefined;
    }
    const promises = [];

    if (newType === cons.notifs.MUTE) {
        if (roomPushRule) {
            promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
        }
        promises.push(
            mx.addPushRule('global', 'override', roomId, {
                conditions: [
                    {
                        kind: 'event_match',
                        key: 'room_id',
                        pattern: roomId,
                    },
                ],
                actions: ['dont_notify'],
            })
        );
        return promises;
    }

    const oldState = getNotificationType(mx, roomId);
    if (oldState === cons.notifs.MUTE) {
        promises.push(mx.deletePushRule('global', 'override', roomId));
    }

    if (newType === cons.notifs.DEFAULT) {
        if (roomPushRule) {
            promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
        }
        return Promise.all(promises);
    }

    if (newType === cons.notifs.MENTIONS_AND_KEYWORDS) {
        promises.push(
            mx.addPushRule('global', 'room', roomId, {
                actions: ['dont_notify'],
            })
        );
        promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));
        return Promise.all(promises);
    }

    // cons.notifs.ALL_MESSAGES
    promises.push(
        mx.addPushRule('global', 'room', roomId, {
            actions: [
                'notify',
                {
                    set_tweak: 'sound',
                    value: 'default',
                },
            ],
        })
    );

    promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));

    return Promise.all(promises);
}

function useNotifications(roomId) {
    const mx = initMatrix.matrixClient;
    const [activeType, setActiveType] = useState(getNotificationType(mx, roomId));
    useEffect(() => {
        setActiveType(getNotificationType(mx, roomId));
    }, [mx, roomId]);

    const setNotification = useCallback(
        (item) => {
            if (item.type === activeType.type) return;
            setActiveType(item.type);
            setRoomNotifType(roomId, item.type);
        },
        [activeType, roomId]
    );
    return [activeType, setNotification];
}

function RoomNotification({ roomId }) {
    const [activeType, setNotification] = useNotifications(roomId);

    return (
        <List>
            {items.map((item) => (
                <ListItem
                    key={item.type}
                    secondaryAction={<Radio onClick={() => setNotification(item)} checked={activeType === item.type} />}
                >
                    <ListItemIcon>
                        <Icon size={1} path={item.iconSrc} />
                    </ListItemIcon>
                    <ListItemText>
                        {item.text}
                    </ListItemText>
                </ListItem>
            ))}
        </List>
    );
}

RoomNotification.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomNotification;
export { useNotifications };
