import React, { useCallback } from 'react';
import { Box, color } from 'folds';

import * as css from './RoomTombstone.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { genRoomVia } from '../../../util/matrixUtil';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { Membership } from '../../../types/matrix/room';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getText } from '../../../lang';
import { Alert, Button, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ErrorOutline } from '@mui/icons-material';

type RoomTombstoneProps = { roomId: string; body?: string; replacementRoomId: string; newDesign?: boolean; };
export function RoomTombstone({ roomId, body, replacementRoomId, newDesign }: RoomTombstoneProps) {
    const mx = useMatrixClient();
    const { navigateRoom } = useRoomNavigate();

    const [joinState, handleJoin] = useAsyncCallback(
        useCallback(() => {
            const currentRoom = mx.getRoom(roomId);
            const via = currentRoom ? genRoomVia(currentRoom) : [];
            return mx.joinRoom(replacementRoomId, {
                viaServers: via,
            });
        }, [mx, roomId, replacementRoomId])
    );
    const replacementRoom = mx.getRoom(replacementRoomId);

    const handleOpen = () => {
        if (replacementRoom) navigateRoom(replacementRoom.roomId);
        if (joinState.status === AsyncStatus.Success) navigateRoom(joinState.data.roomId);
    };

    return (
        <RoomInputPlaceholder newDesign={newDesign} alignItems="Center" gap="600" className={css.RoomTombstone}>
            <ErrorOutline />
            <Typography flexGrow={1}>
                {body || getText('room_tombstone.default_reason')}
            </Typography>
            {/* <Box direction="Column" grow="Yes">
                <Text size="T400">{body || getText('romb_tombstone.default_reason')}</Text>
                {joinState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T200">
                        {(joinState.error as any)?.message ?? getText('error.tombstone.join_failed')}
                    </Text>
                )}
            </Box>
             */}
            {replacementRoom?.getMyMembership() === Membership.Join ||
                joinState.status === AsyncStatus.Success ? (
                <Button onClick={handleOpen}>
                    {getText('btn.room_tombstone.new_room')}
                </Button>
            ) : (
                <LoadingButton
                    onClick={handleJoin}
                    loading={joinState.status === AsyncStatus.Loading}
                >
                    {getText('btn.room_tombstone.join_room')}
                </LoadingButton>
            )}
        </RoomInputPlaceholder>
    );
}
