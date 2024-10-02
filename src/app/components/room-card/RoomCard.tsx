import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import {
    Avatar,
    Badge,
    Box,
    Text,
    as,
    color,
    config,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import * as css from './style.css';
import { RoomAvatar } from '../room-avatar';
import { getMxIdLocalPart } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { onEnterOrSpace } from '../../utils/keyboard';
import { RoomType, StateEvent } from '../../../types/matrix/room';
import { useJoinedRoomId } from '../../hooks/useJoinedRoomId';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { getRoomAvatarUrl, getStateEvent } from '../../utils/room';
import { useStateEventCallback } from '../../hooks/useStateEventCallback';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiAccount } from '@mdi/js';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, useTheme } from '@mui/material';
import { LoadingButton } from '@mui/lab';

type GridColumnCount = '1' | '2' | '3';
const getGridColumnCount = (gridWidth: number): GridColumnCount => {
    if (gridWidth <= 498) return '1';
    if (gridWidth <= 748) return '2';
    return '3';
};

const setGridColumnCount = (grid: HTMLElement, count: GridColumnCount): void => {
    grid.style.setProperty('grid-template-columns', `repeat(${count}, 1fr)`);
};

export function RoomCardGrid({ children }: { children: ReactNode }) {
    const gridRef = useRef<HTMLDivElement>(null);

    useElementSizeObserver(
        useCallback(() => gridRef.current, []),
        useCallback((width, _, target) => setGridColumnCount(target, getGridColumnCount(width)), [])
    );

    return (
        <Box className={css.CardGrid} direction="Row" gap="400" wrap="Wrap" ref={gridRef}>
            {children}
        </Box>
    );
}

export const RoomCardBase = as<'div'>(({ className, ...props }, ref) => {
    const theme = useTheme();
    return (
        <Paper
            sx={{
                flexDirection: 'column',
                gap: theme.spacing(2),
                display: 'flex',
                padding: theme.spacing(3),
                borderRadius: theme.shape.borderRadius
            }}
            {...props}
            ref={ref}
        />
    );
});

export const RoomCardName = as<'h6'>(({ ...props }, ref) => (
    <Text as="h6" size="H6" truncate {...props} ref={ref} />
));

export const RoomCardTopic = as<'p'>(({ className, ...props }, ref) => (
    <Text
        as="p"
        size="T200"
        className={classNames(css.RoomCardTopic, className)}
        {...props}
        priority="400"
        ref={ref}
    />
));

function ErrorDialog({
    title,
    message,
    children,
}: {
    title: string;
    message: string;
    children: (openError: () => void) => ReactNode;
}) {
    const [viewError, setViewError] = useState(false);
    const closeError = () => setViewError(false);
    const openError = () => setViewError(true);

    return (
        <>
            {children(openError)}
            <Dialog open={viewError} onClose={closeError}>
                <DialogTitle>
                    {title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeError}>
                        {getText('btn.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

type RoomCardProps = {
    roomIdOrAlias: string;
    allRooms: string[];
    avatarUrl?: string;
    name?: string;
    topic?: string;
    memberCount?: number;
    roomType?: string;
    onView?: (roomId: string) => void;
    renderTopicViewer: (name: string, topic: string, requestClose: () => void) => ReactNode;
};

export const RoomCard = as<'div', RoomCardProps>(
    (
        {
            roomIdOrAlias,
            allRooms,
            avatarUrl,
            name,
            topic,
            memberCount,
            roomType,
            onView,
            renderTopicViewer,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const joinedRoomId = useJoinedRoomId(allRooms, roomIdOrAlias);
        const joinedRoom = mx.getRoom(joinedRoomId);
        const [topicEvent, setTopicEvent] = useState(() =>
            joinedRoom ? getStateEvent(joinedRoom, StateEvent.RoomTopic) : undefined
        );

        const fallbackName = getMxIdLocalPart(roomIdOrAlias) ?? roomIdOrAlias;
        const fallbackTopic = roomIdOrAlias;

        const avatar = joinedRoom
            ? getRoomAvatarUrl(mx, joinedRoom, 96)
            : avatarUrl && mx.mxcUrlToHttp(avatarUrl, 96, 96, 'crop');

        const roomName = joinedRoom?.name || name || fallbackName;
        const roomTopic =
            (topicEvent?.getContent().topic as string) || undefined || topic || fallbackTopic;
        const joinedMemberCount = joinedRoom?.getJoinedMemberCount() ?? memberCount;

        useStateEventCallback(
            mx,
            useCallback(
                (event) => {
                    if (
                        joinedRoom &&
                        event.getRoomId() === joinedRoom.roomId &&
                        event.getType() === StateEvent.RoomTopic
                    ) {
                        setTopicEvent(getStateEvent(joinedRoom, StateEvent.RoomTopic));
                    }
                },
                [joinedRoom]
            )
        );

        const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
            useCallback(() => {
                return mx.joinRoom(roomIdOrAlias);
            }, [mx, roomIdOrAlias])
        );
        const joining =
            joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

        const [viewTopic, setViewTopic] = useState(false);
        const closeTopic = () => setViewTopic(false);
        const openTopic = () => setViewTopic(true);

        return (
            <RoomCardBase {...props} ref={ref}>
                <Box gap="200" justifyContent="SpaceBetween">
                    <Avatar size="500">
                        <RoomAvatar
                            roomId={roomIdOrAlias}
                            src={avatar ?? undefined}
                            alt={roomIdOrAlias}
                            renderFallback={() => (
                                <Text as="span" size="H3">
                                    {nameInitials(roomName)}
                                </Text>
                            )}
                        />
                    </Avatar>
                    {(roomType === RoomType.Space || joinedRoom?.isSpaceRoom()) && (
                        <Badge variant="Secondary" fill="Soft" outlined>
                            <Text size="L400">{getText('generic.space')}</Text>
                        </Badge>
                    )}
                </Box>
                <Box grow="Yes" direction="Column" gap="100">
                    <RoomCardName>{roomName}</RoomCardName>
                    <RoomCardTopic onClick={openTopic} onKeyDown={onEnterOrSpace(openTopic)} tabIndex={0}>
                        {roomTopic}
                    </RoomCardTopic>

                    <Dialog open={viewTopic} onClose={closeTopic}>
                        {renderTopicViewer(roomName, roomTopic, closeTopic)}
                    </Dialog>
                </Box>
                {typeof joinedMemberCount === 'number' && (
                    <Box gap="100">
                        <Icon size={1} path={mdiAccount} />
                        <Text size="T200">{getText('generic.member_count', millify(joinedMemberCount))}</Text>
                    </Box>
                )}
                {typeof joinedRoomId === 'string' && (
                    <Button
                        onClick={onView ? () => onView(joinedRoomId) : undefined}
                        variant="outlined"
                    >
                        {getText('btn.view')}
                    </Button>
                )}
                {typeof joinedRoomId !== 'string' && joinState.status !== AsyncStatus.Error && (
                    <LoadingButton
                        onClick={join}
                        variant='contained'
                        loading={joining}
                    >
                        {getText(joining ? 'room_card.joining' : 'btn.join')}
                    </LoadingButton>
                )}
                {typeof joinedRoomId !== 'string' && joinState.status === AsyncStatus.Error && (
                    <Box gap="200">
                        <Button
                            onClick={join}
                            color="error"
                            variant='contained'
                        >
                            {getText('btn.retry')}
                        </Button>
                        <ErrorDialog
                            title="Join Error"
                            message={joinState.error.message || getText('error.join.unknown')}
                        >
                            {(openError) => (
                                <Button
                                    onClick={openError}
                                    variant="outlined"
                                    color='error'
                                >
                                    {getText('btn.error_details')}
                                </Button>
                            )}
                        </ErrorDialog>
                    </Box>
                )}
            </RoomCardBase>
        );
    }
);
