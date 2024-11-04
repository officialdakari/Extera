import React, { MouseEventHandler, ReactNode, useCallback, useEffect, useRef } from 'react';
import {
    Avatar,
    Box,
    as,
    toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { JoinRule, MatrixError, Room } from 'matrix-js-sdk';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { SequenceCard } from '../../components/sequence-card';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { millify } from '../../plugins/millify';
import {
    HierarchyRoomSummaryLoader,
    LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { onEnterOrSpace } from '../../utils/keyboard';
import { Membership, RoomType } from '../../../types/matrix/room';
import * as css from './RoomItem.css';
import * as styleCss from './style.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ErrorCode } from '../../cs-errorcode';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { ItemDraggableTarget, useDraggableItem } from './DnD';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiAlert, mdiArrowRight, mdiPlus } from '@mdi/js';
import { Chip, Dialog, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowForward, Warning } from '@mui/icons-material';
import { BackButtonHandler } from '../../hooks/useBackButton';

type RoomJoinButtonProps = {
    roomId: string;
    via?: string[];
};
function RoomJoinButton({ roomId, via }: RoomJoinButtonProps) {
    const mx = useMatrixClient();

    const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
        useCallback(() => mx.joinRoom(roomId, { viaServers: via }), [mx, roomId, via])
    );

    const canJoin = joinState.status === AsyncStatus.Idle || joinState.status === AsyncStatus.Error;

    return (
        <Box shrink="No" gap="200" alignItems="Center">
            {joinState.status === AsyncStatus.Error && (
                <Tooltip title={joinState.error.data?.error || joinState.error.message}>
                    <Warning aria-label={joinState.error.data?.error || joinState.error.message} color='error' />
                </Tooltip>
            )}
            <Chip
                size='small'
                onClick={join}
                disabled={!canJoin}
                label={getText('btn.join')}
            />
        </Box>
    );
}

function RoomProfileLoading() {
    return (
        <Box grow="Yes" gap="300">
            <Avatar className={styleCss.AvatarPlaceholder} />
            <Box grow="Yes" direction="Column" gap="100">
                <Box gap="200" alignItems="Center">
                    <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(80) }} />
                </Box>
                <Box gap="200" alignItems="Center">
                    <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(40) }} />
                    <Box
                        className={styleCss.LinePlaceholder}
                        shrink="No"
                        style={{
                            maxWidth: toRem(120),
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

type RoomProfileErrorProps = {
    roomId: string;
    error: Error;
    suggested?: boolean;
    via?: string[];
};
function RoomProfileError({ roomId, suggested, error, via }: RoomProfileErrorProps) {
    const privateRoom = error.name === ErrorCode.M_FORBIDDEN;

    return (
        <Box grow="Yes" gap="300">
            <Avatar>
                <RoomAvatar
                    roomId={roomId}
                    src={undefined}
                    alt={roomId}
                    renderFallback={() => (
                        <RoomIcon
                            size="300"
                            joinRule={privateRoom ? JoinRule.Invite : JoinRule.Restricted}
                        />
                    )}
                />
            </Avatar>
            <Box grow="Yes" direction="Column" className={css.ErrorNameContainer}>
                <Box gap="200" alignItems="Center">
                    <Typography>
                        {getText('generic.unknown')}
                    </Typography>
                    {suggested && (
                        <Box shrink="No" alignItems="Center">
                            <Chip size='small' label={getText('space_room.suggested')} />
                        </Box>
                    )}
                </Box>
                <Box gap="200" alignItems="Center">
                    {privateRoom && (
                        <>
                            <Chip label={getText('space_room.private')} size='small' />
                            <Divider orientation='vertical' />
                        </>
                    )}
                    <Typography color='textSecondary' variant='subtitle2'>
                        {roomId}
                    </Typography>
                </Box>
            </Box>
            {!privateRoom && <RoomJoinButton roomId={roomId} via={via} />}
        </Box>
    );
}

type RoomProfileProps = {
    roomId: string;
    name: string;
    topic?: string;
    avatarUrl?: string;
    suggested?: boolean;
    memberCount?: number;
    joinRule?: JoinRule;
    options?: ReactNode;
};
function RoomProfile({
    roomId,
    name,
    topic,
    avatarUrl,
    suggested,
    memberCount,
    joinRule,
    options,
}: RoomProfileProps) {
    return (
        <Box grow="Yes" gap="300">
            <Avatar>
                <RoomAvatar
                    roomId={roomId}
                    src={avatarUrl}
                    alt={name}
                    renderFallback={() => (
                        <RoomIcon size="300" joinRule={joinRule ?? JoinRule.Restricted} />
                    )}
                />
            </Avatar>
            <Box grow="Yes" direction="Column">
                <Box gap="200" alignItems="Center">
                    <Typography variant='h6'>
                        {name}
                    </Typography>
                    {suggested && (
                        <Box shrink="No" alignItems="Center">
                            <Chip
                                color='success'
                                size='small'
                                label={getText('space_room.suggested')}
                            />
                        </Box>
                    )}
                </Box>
                <Box gap="200" alignItems="Center">
                    {memberCount && (
                        <Box shrink="No" gap="200">
                            <Typography color='textSecondary'>{getText('generic.member_count', millify(memberCount))}</Typography>
                        </Box>
                    )}
                    {memberCount && topic && (
                        <Divider orientation='vertical' />
                    )}
                    {topic && (
                        <UseStateProvider initial={false}>
                            {(view, setView) => (
                                <>
                                    <Typography
                                        color='textSecondary'
                                        variant='subtitle2'
                                        onClick={() => setView(true)}
                                        onKeyDown={onEnterOrSpace(() => setView(true))}
                                    >
                                        {topic}
                                    </Typography>
                                    <Dialog open={view} onClose={() => setView(false)}>
                                        <BackButtonHandler id='room-item-topic-viewer' callback={() => setView(false)} />
                                        <RoomTopicViewer
                                            name={name}
                                            topic={topic}
                                            requestClose={() => setView(false)}
                                        />
                                    </Dialog>
                                </>
                            )}
                        </UseStateProvider>
                    )}
                </Box>
            </Box>
            {options}
        </Box>
    );
}

function CallbackOnFoundSpace({
    roomId,
    onSpaceFound,
}: {
    roomId: string;
    onSpaceFound: (roomId: string) => void;
}) {
    useEffect(() => {
        onSpaceFound(roomId);
    }, [roomId, onSpaceFound]);

    return null;
}

type RoomItemCardProps = {
    item: HierarchyItem;
    onSpaceFound: (roomId: string) => void;
    dm?: boolean;
    firstChild?: boolean;
    lastChild?: boolean;
    onOpen: MouseEventHandler<HTMLButtonElement>;
    options?: ReactNode;
    before?: ReactNode;
    after?: ReactNode;
    onDragging: (item?: HierarchyItem) => void;
    canReorder: boolean;
    getRoom: (roomId: string) => Room | undefined;
};
export const RoomItemCard = as<'div', RoomItemCardProps>(
    (
        {
            item,
            onSpaceFound,
            dm,
            firstChild,
            lastChild,
            onOpen,
            options,
            before,
            after,
            onDragging,
            canReorder,
            getRoom,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const { roomId, content } = item;
        const room = getRoom(roomId);
        const targetRef = useRef<HTMLDivElement>(null);
        const targetHandleRef = useRef<HTMLDivElement>(null);
        useDraggableItem(item, targetRef, onDragging, targetHandleRef);

        const joined = room?.getMyMembership() === Membership.Join;

        return (
            <SequenceCard
                className={css.RoomItemCard}
                firstChild={firstChild}
                lastChild={lastChild}
                gap="300"
                alignItems="Center"
                {...props}
                ref={ref}
            >
                {before}
                <Box ref={canReorder ? targetRef : null} grow="Yes">
                    {canReorder && <ItemDraggableTarget ref={targetHandleRef} />}
                    {room ? (
                        <LocalRoomSummaryLoader room={room}>
                            {(localSummary) => (
                                <RoomProfile
                                    roomId={roomId}
                                    name={localSummary.name}
                                    topic={localSummary.topic}
                                    avatarUrl={
                                        dm ? getDirectRoomAvatarUrl(mx, room, 96) : getRoomAvatarUrl(mx, room, 96)
                                    }
                                    memberCount={localSummary.memberCount}
                                    suggested={content.suggested}
                                    joinRule={localSummary.joinRule}
                                    options={
                                        joined ? (
                                            <Box shrink="No" gap="100" alignItems="Center">
                                                <IconButton
                                                    data-room-id={roomId}
                                                    onClick={onOpen}
                                                    aria-label="Open Room"
                                                >
                                                    <ArrowForward />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <RoomJoinButton roomId={roomId} via={content.via} />
                                        )
                                    }
                                />
                            )}
                        </LocalRoomSummaryLoader>
                    ) : (
                        <HierarchyRoomSummaryLoader roomId={roomId}>
                            {(summaryState) => (
                                <>
                                    {summaryState.status === AsyncStatus.Loading && <RoomProfileLoading />}
                                    {summaryState.status === AsyncStatus.Error && (
                                        <RoomProfileError
                                            roomId={roomId}
                                            error={summaryState.error}
                                            suggested={content.suggested}
                                            via={content.via}
                                        />
                                    )}
                                    {summaryState.status === AsyncStatus.Success && (
                                        <>
                                            {summaryState.data.room_type === RoomType.Space && (
                                                <CallbackOnFoundSpace
                                                    roomId={summaryState.data.room_id}
                                                    onSpaceFound={onSpaceFound}
                                                />
                                            )}
                                            <RoomProfile
                                                roomId={roomId}
                                                name={summaryState.data.name || summaryState.data.canonical_alias || roomId}
                                                topic={summaryState.data.topic}
                                                avatarUrl={
                                                    summaryState.data?.avatar_url
                                                        ? mx.mxcUrlToHttp(summaryState.data.avatar_url, 96, 96, 'crop') ??
                                                        undefined
                                                        : undefined
                                                }
                                                memberCount={summaryState.data.num_joined_members}
                                                suggested={content.suggested}
                                                joinRule={summaryState.data.join_rule}
                                                options={<RoomJoinButton roomId={roomId} via={content.via} />}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </HierarchyRoomSummaryLoader>
                    )}
                </Box>
                {options}
                {after}
            </SequenceCard>
        );
    }
);
