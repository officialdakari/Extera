import React from 'react';
import classNames from 'classnames';
import {
    Avatar,
    Box,
    Scroll,
    Text,
    as,
    config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './EventReaders.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { openProfileViewer } from '../../../client/action/navigation';
import { UserAvatar } from '../user-avatar';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiAccount, mdiClose } from '@mdi/js';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

export type EventReadersProps = {
    room: Room;
    eventId: string;
    requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
    ({ className, room, eventId, requestClose, ...props }, ref) => {
        const mx = useMatrixClient();
        const latestEventReaders = useRoomEventReaders(room, eventId);

        const getName = (userId: string) =>
            getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

        return (
            <List>
                {latestEventReaders.map((readerId) => {
                    const name = getName(readerId);
                    const avatarUrl = room
                        .getMember(readerId)
                        ?.getAvatarUrl(mx.baseUrl, 100, 100, 'crop', undefined, false);

                    return (
                        <ListItemButton
                            key={readerId}
                            onClick={() => {
                                requestClose();
                                openProfileViewer(readerId, room.roomId);
                            }}
                        >
                            <ListItemIcon>
                                <Avatar size="300">
                                    <UserAvatar
                                        userId={readerId}
                                        src={avatarUrl ?? undefined}
                                        alt={name}
                                        renderFallback={() => <Icon size={1} path={mdiAccount} />}
                                    />
                                </Avatar>
                            </ListItemIcon>
                            <ListItemText>
                                {name}
                            </ListItemText>
                        </ListItemButton>
                    );
                })}
            </List>
        );
    }
);
