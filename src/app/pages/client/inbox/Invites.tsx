import React, { useCallback, useId, useRef, useState } from 'react';
import {
    Avatar,
    Box,
    Scroll,
    Text,
    color,
    config,
} from 'folds';
import { useAtomValue } from 'jotai';
import { Icon as MDIcon } from '@mdi/react';
import FocusTrap from 'focus-trap-react';
import { MatrixError, Room } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useDirectInvites, useRoomInvites, useSpaceInvites } from '../../../state/hooks/inviteList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { mDirectAtom } from '../../../state/mDirectList';
import { SequenceCard } from '../../../components/sequence-card';
import * as roomActions from '../../../../client/action/room';
import {
    getDirectRoomAvatarUrl,
    getMemberDisplayName,
    getRoomAvatarUrl,
    isDirectInvite,
} from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { RoomAvatar } from '../../../components/room-avatar';
import { addRoomIdToMDirect, getMxIdLocalPart, guessDmRoomUserId } from '../../../utils/matrix';
import { Time } from '../../../components/message';
import { useElementSizeObserver } from '../../../hooks/useElementSizeObserver';
import { onEnterOrSpace } from '../../../utils/keyboard';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { useRoomTopic } from '../../../hooks/useRoomMeta';
import { getText, translate } from '../../../../lang';
import { mdiMail } from '@mdi/js';
import { AppBar, Button, CircularProgress, Dialog, IconButton, Toolbar, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import BottomNav from '../BottomNav';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { BackButtonHandler } from '../../../hooks/useBackButton';
import { LoadingButton } from '@mui/lab';

const COMPACT_CARD_WIDTH = 548;

type InviteCardProps = {
    room: Room;
    userId: string;
    direct?: boolean;
    compact?: boolean;
    onNavigate: (roomId: string) => void;
};
function InviteCard({ room, userId, direct, compact, onNavigate }: InviteCardProps) {
    const mx = useMatrixClient();
    const roomName = room.name || room.getCanonicalAlias() || room.roomId;
    const member = room.getMember(userId);
    const memberEvent = member?.events.member;
    const memberTs = memberEvent?.getTs() ?? 0;
    const senderId = memberEvent?.getSender();
    const senderName = senderId
        ? getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId
        : undefined;

    if (roomActions.isIgnored(senderId)) return null;

    const topic = useRoomTopic(room);

    const [viewTopic, setViewTopic] = useState(false);
    const closeTopic = () => setViewTopic(false);
    const openTopic = () => setViewTopic(true);

    const [joinState, join] = useAsyncCallback<void, MatrixError, []>(
        useCallback(async () => {
            const dmUserId = isDirectInvite(room, userId) ? guessDmRoomUserId(room, userId) : undefined;

            await mx.joinRoom(room.roomId);
            if (dmUserId) {
                await addRoomIdToMDirect(mx, room.roomId, dmUserId);
            }
            onNavigate(room.roomId);
        }, [mx, room, userId, onNavigate])
    );
    const [leaveState, leave] = useAsyncCallback<Record<string, never>, MatrixError, []>(
        useCallback(() => mx.leave(room.roomId), [mx, room])
    );
    const [ignoreState, ignore] = useAsyncCallback<void, MatrixError, []>(
        useCallback(async () => {
            await mx.leave(room.roomId);
            await roomActions.ignore([senderId]);
        }, [mx, room, senderId])
    );

    const joining =
        joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;
    const leaving =
        leaveState.status === AsyncStatus.Loading || leaveState.status === AsyncStatus.Success;
    const ignoring =
        ignoreState.status === AsyncStatus.Loading || ignoreState.status === AsyncStatus.Success;

    return (
        <SequenceCard
            variant="SurfaceVariant"
            direction="Column"
            gap="200"
            style={{ padding: config.space.S400, paddingTop: config.space.S200 }}
        >
            <Box gap="200" alignItems="Baseline">
                <Box grow="Yes">
                    <Text size="T200" priority="300">
                        {translate('inbox.invites.by', <b>{senderName}</b>, senderId)}
                    </Text>
                </Box>
                <Box shrink="No">
                    <Time size="T200" ts={memberTs} priority="300" />
                </Box>
            </Box>
            <Box gap="300">
                <Avatar size="300">
                    <RoomAvatar
                        roomId={room.roomId}
                        src={direct ? getDirectRoomAvatarUrl(mx, room, 96) : getRoomAvatarUrl(mx, room, 96)}
                        alt={roomName}
                        renderFallback={() => (
                            <Text as="span" size="H6">
                                {nameInitials(roomName)}
                            </Text>
                        )}
                    />
                </Avatar>
                <Box direction={compact ? 'Column' : 'Row'} grow="Yes" gap="200">
                    <Box grow="Yes" direction="Column" gap="200">
                        <Box direction="Column">
                            <Text size="T300" truncate>
                                <b>{roomName}</b>
                            </Text>
                            {topic && (
                                <Text
                                    size="T200"
                                    onClick={openTopic}
                                    onKeyDown={onEnterOrSpace(openTopic)}
                                    tabIndex={0}
                                    truncate
                                >
                                    {topic}
                                </Text>
                            )}
                            <Dialog open={viewTopic} onClose={closeTopic}>
                                {viewTopic && <BackButtonHandler callback={closeTopic} id='topic-viewer-invites' />}
                                <RoomTopicViewer
                                    name={roomName}
                                    topic={topic || ''}
                                    requestClose={closeTopic}
                                />
                            </Dialog>
                        </Box>
                        {joinState.status === AsyncStatus.Error && (
                            <Text size="T200" style={{ color: color.Critical.Main }}>
                                {joinState.error.message}
                            </Text>
                        )}
                        {leaveState.status === AsyncStatus.Error && (
                            <Text size="T200" style={{ color: color.Critical.Main }}>
                                {leaveState.error.message}
                            </Text>
                        )}
                    </Box>
                    <Box gap="200" shrink="No" alignItems="Center">
                        <LoadingButton
                            onClick={leave}
                            color="secondary"
                            variant='outlined'
                            disabled={joining || leaving || ignoring}
                            loading={leaving}
                        >
                            {getText('btn.decline')}
                        </LoadingButton>
                        <LoadingButton
                            onClick={ignore}
                            color="error"
                            variant='outlined'
                            disabled={joining || leaving || ignoring}
                            loading={ignoring}
                        >
                            {getText('btn.decline_and_ignore')}
                        </LoadingButton>
                        <LoadingButton
                            onClick={join}
                            color="success"
                            variant='contained'
                            disabled={joining || leaving || ignoring}
                            loading={joining}
                        >
                            {getText('btn.accept')}
                        </LoadingButton>
                    </Box>
                </Box>
            </Box>
        </SequenceCard>
    );
}

export function Invites() {
    const mx = useMatrixClient();
    const userId = mx.getUserId()!;
    const mDirects = useAtomValue(mDirectAtom);
    const directInvites = useDirectInvites(mx, allInvitesAtom, mDirects);
    const spaceInvites = useSpaceInvites(mx, allInvitesAtom);
    const roomInvites = useRoomInvites(mx, allInvitesAtom, mDirects);
    const containerRef = useRef<HTMLDivElement>(null);
    const [compact, setCompact] = useState(document.body.clientWidth <= COMPACT_CARD_WIDTH);
    const screenSize = useScreenSize();
    useElementSizeObserver(
        useCallback(() => containerRef.current, []),
        useCallback((width) => setCompact(width <= COMPACT_CARD_WIDTH), [])
    );

    const { navigateRoom, navigateSpace } = useRoomNavigate();

    const renderInvite = (roomId: string, direct: boolean, handleNavigate: (rId: string) => void) => {
        const room = mx.getRoom(roomId);
        if (!room) return null;
        return (
            <InviteCard
                key={roomId}
                room={room}
                userId={userId}
                compact={compact}
                direct={direct}
                onNavigate={handleNavigate}
            />
        );
    };

    return (
        <Page>
            <AppBar color='inherit' enableColorOnDark position='static'>
                <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                    <BackRouteHandler>
                        {(goBack) => (
                            <IconButton
                                onClick={goBack}
                            >
                                <ArrowBack />
                            </IconButton>
                        )}
                    </BackRouteHandler>
                    <Typography component='div' variant='h6' flexGrow={1}>
                        {getText('inbox.invites.title')}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box grow="Yes">
                <Scroll hideTrack visibility="Hover">
                    <PageContent>
                        <PageContentCenter>
                            <Box ref={containerRef} direction="Column" gap="600">
                                {directInvites.length > 0 && (
                                    <Box direction="Column" gap="200">
                                        <Text size="H4">{getText('inbox.invites.dm')}</Text>
                                        <Box direction="Column" gap="100">
                                            {directInvites.map((roomId) => renderInvite(roomId, true, navigateRoom))}
                                        </Box>
                                    </Box>
                                )}
                                {spaceInvites.length > 0 && (
                                    <Box direction="Column" gap="200">
                                        <Text size="H4">{getText('inbox.invites.space')}</Text>
                                        <Box direction="Column" gap="100">
                                            {spaceInvites.map((roomId) => renderInvite(roomId, false, navigateSpace))}
                                        </Box>
                                    </Box>
                                )}
                                {roomInvites.length > 0 && (
                                    <Box direction="Column" gap="200">
                                        <Text size="H4">{getText('inbox.invites.room')}</Text>
                                        <Box direction="Column" gap="100">
                                            {roomInvites.map((roomId) => renderInvite(roomId, false, navigateRoom))}
                                        </Box>
                                    </Box>
                                )}
                                {directInvites.length === 0 &&
                                    spaceInvites.length === 0 &&
                                    roomInvites.length === 0 && (
                                        <div>
                                            <SequenceCard
                                                variant="SurfaceVariant"
                                                style={{ padding: config.space.S400 }}
                                                direction="Column"
                                                gap="200"
                                            >
                                                <Text>{getText('inbox.invites.empty')}</Text>
                                                <Text size="T200">
                                                    {getText('inbox.invites.empty.2')}
                                                </Text>
                                            </SequenceCard>
                                        </div>
                                    )}
                            </Box>
                        </PageContentCenter>
                    </PageContent>
                </Scroll>
            </Box>
        </Page>
    );
}
