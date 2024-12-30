import React, { useCallback } from 'react';
import { Avatar, Box, Text, as } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { openInviteUser } from '../../../client/action/navigation';
import { IRoomCreateContent, Membership, StateEvent } from '../../../types/matrix/room';
import { getMemberDisplayName, getStateEvent } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { RoomAvatar } from '../room-avatar';
import { nameInitials } from '../../utils/common';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { mDirectAtom } from '../../state/mDirectList';
import { sendExteraProfile } from '../../../client/action/room';
import { getText, translate } from '../../../lang';
import { Button } from '@mui/material';
import { LoadingButton } from '@mui/lab';

export type RoomIntroProps = {
    room: Room;
};

export const RoomIntro = as<'div', RoomIntroProps>(({ room, ...props }, ref) => {
    const mx = useMatrixClient();
    const { navigateRoom } = useRoomNavigate();
    const mDirects = useAtomValue(mDirectAtom);

    const createEvent = getStateEvent(room, StateEvent.RoomCreate);
    const avatarMxc = useRoomAvatar(room, mDirects.has(room.roomId));
    const name = useRoomName(room);
    const topic = useRoomTopic(room);
    const avatarHttpUrl = avatarMxc ? mxcUrlToHttp(mx, avatarMxc) : undefined;

    const createContent = createEvent?.getContent<IRoomCreateContent>();
    const ts = createEvent?.getTs();
    const creatorId = createEvent?.getSender();
    const creatorName =
        creatorId && (getMemberDisplayName(room, creatorId) ?? getMxIdLocalPart(creatorId));
    const prevRoomId = createContent?.predecessor?.room_id;

    const [prevRoomState, joinPrevRoom] = useAsyncCallback(
        useCallback(async (roomId: string) => {
            await mx.joinRoom(roomId);
            await sendExteraProfile(roomId);
        }, [mx])
    );

    return (
        <Box direction="Column" grow="Yes" gap="500" {...props} ref={ref}>
            <Box>
                <Avatar size="500">
                    <RoomAvatar
                        roomId={room.roomId}
                        src={avatarHttpUrl ?? undefined}
                        alt={name}
                        renderFallback={() => <Text size="H2">{nameInitials(name)}</Text>}
                    />
                </Avatar>
            </Box>
            <Box direction="Column" gap="300">
                <Box direction="Column" gap="100">
                    <Text size="H3" priority="500">
                        {name}
                    </Text>
                    <Text size="T400" priority="400">
                        {typeof topic === 'string' ? topic : getText('room_intro.1')}
                    </Text>
                    {creatorName && ts && (
                        <Text size="T200" priority="300">
                            {translate('room_intro.2', <b>@{creatorName}</b>, `${timeDayMonthYear(ts)} ${timeHourMinute(ts)}`)}
                        </Text>
                    )}
                </Box>
                <Box gap="200" wrap="Wrap">
                    <Button
                        onClick={() => openInviteUser(room.roomId)}
                        variant="contained"
                        color='primary'
                        size='small'
                    >
                        {getText('btn.invite')}
                    </Button>
                    {typeof prevRoomId === 'string' &&
                        (mx.getRoom(prevRoomId)?.getMyMembership() === Membership.Join ? (
                            <Button
                                onClick={() => navigateRoom(prevRoomId)}
                                variant="contained"
                                color='success'
                                size='small'
                            >
                                {getText('btn.old_room.open')}
                            </Button>
                        ) : (
                            <LoadingButton
                                onClick={() => joinPrevRoom(prevRoomId)}
                                color="secondary"
                                loading={prevRoomState.status === AsyncStatus.Loading}
                                size='small'
                            >
                                {getText('btn.old_room.join')}
                            </LoadingButton>
                        ))}
                </Box>
            </Box>
        </Box>
    );
});
