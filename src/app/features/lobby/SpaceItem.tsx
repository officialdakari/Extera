import React, { MouseEventHandler, ReactNode, useCallback, useRef, useState } from 'react';
import {
    Box,
    Avatar,
    as,
    toRem,
    Chip,
    Text,
    Badge,
} from 'folds';
import classNames from 'classnames';
import { MatrixError, Room } from 'matrix-js-sdk';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import {
    HierarchyRoomSummaryLoader,
    LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { getRoomAvatarUrl } from '../../utils/room';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import * as css from './SpaceItem.css';
import * as styleCss from './style.css';
import { ErrorCode } from '../../cs-errorcode';
import { useDraggableItem } from './DnD';
import { openCreateRoom, openSpaceAddExisting } from '../../../client/action/navigation';
import { getText } from '../../../lang';
import { mdiChevronDown, mdiChevronRight, mdiPlus } from '@mdi/js';
import Icon from '@mdi/react';
import { Button, CircularProgress, ListItemText, Menu, MenuItem } from '@mui/material';
import { Add } from '@mui/icons-material';
import { mxcUrlToHttp } from '../../utils/matrix';

function SpaceProfileLoading() {
    return (
        <Box gap="200" alignItems="Center">
            <Box grow="Yes" gap="200" alignItems="Center" className={css.HeaderChipPlaceholder}>
                <Avatar className={styleCss.AvatarPlaceholder} size="200" radii="300" />
                <Box
                    className={styleCss.LinePlaceholder}
                    shrink="No"
                    style={{ width: '100vw', maxWidth: toRem(120) }}
                />
            </Box>
        </Box>
    );
}

type UnknownPrivateSpaceProfileProps = {
    roomId: string;
    name?: string;
    avatarUrl?: string;
    suggested?: boolean;
};
function UnknownPrivateSpaceProfile({
    roomId,
    name,
    avatarUrl,
    suggested,
}: UnknownPrivateSpaceProfileProps) {
    return (
        <Chip
            as="span"
            className={css.HeaderChip}
            variant="Surface"
            size="500"
            before={
                <Avatar size="200" radii="300">
                    <RoomAvatar
                        roomId={roomId}
                        src={avatarUrl}
                        alt={name}
                        renderFallback={() => (
                            <Text as="span" size="H6">
                                {nameInitials(name)}
                            </Text>
                        )}
                    />
                </Avatar>
            }
        >
            <Box alignItems="Center" gap="200">
                <Text size="H4" truncate>
                    {name || 'Unknown'}
                </Text>

                <Badge variant="Secondary" fill="Soft" radii="Pill" outlined>
                    <Text size="L400">{getText('space_item.private')}</Text>
                </Badge>
                {suggested && (
                    <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                        <Text size="L400">{getText('space_item.suggested')}</Text>
                    </Badge>
                )}
            </Box>
        </Chip>
    );
}

type UnknownSpaceProfileProps = {
    roomId: string;
    via?: string[];
    name?: string;
    avatarUrl?: string;
    suggested?: boolean;
};
function UnknownSpaceProfile({
    roomId,
    via,
    name,
    avatarUrl,
    suggested,
}: UnknownSpaceProfileProps) {
    const mx = useMatrixClient();

    const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
        useCallback(() => mx.joinRoom(roomId, { viaServers: via }), [mx, roomId, via])
    );

    const canJoin = joinState.status === AsyncStatus.Idle || joinState.status === AsyncStatus.Error;
    return (
        <Chip
            className={css.HeaderChip}
            variant="Surface"
            size="500"
            onClick={join}
            disabled={!canJoin}
            before={
                <Avatar size="200" radii="300">
                    <RoomAvatar
                        roomId={roomId}
                        src={avatarUrl}
                        alt={name}
                        renderFallback={() => (
                            <Text as="span" size="H6">
                                {nameInitials(name)}
                            </Text>
                        )}
                    />
                </Avatar>
            }
            after={
                canJoin ? <Icon size={0.8} path={mdiPlus} /> : <CircularProgress />
            }
        >
            <Box alignItems="Center" gap="200">
                <Text size="H4" truncate>
                    {name || getText('generic.unknown')}
                </Text>
                {suggested && (
                    <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                        <Text size="L400">{getText('space_item.suggested')}</Text>
                    </Badge>
                )}
                {joinState.status === AsyncStatus.Error && (
                    <Badge variant="Critical" fill="Soft" radii="Pill" outlined>
                        <Text size="L400" truncate>
                            {joinState.error.name}
                        </Text>
                    </Badge>
                )}
            </Box>
        </Chip>
    );
}

type SpaceProfileProps = {
    roomId: string;
    name: string;
    avatarUrl?: string;
    suggested?: boolean;
    closed: boolean;
    categoryId: string;
    handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function SpaceProfile({
    roomId,
    name,
    avatarUrl,
    suggested,
    closed,
    categoryId,
    handleClose,
}: SpaceProfileProps) {
    return (
        <Chip
            data-category-id={categoryId}
            onClick={handleClose}
            className={css.HeaderChip}
            variant="Surface"
            size="500"
            before={
                <Avatar size="200" radii="300">
                    <RoomAvatar
                        roomId={roomId}
                        src={avatarUrl}
                        alt={name}
                        renderFallback={() => (
                            <Text as="span" size="H6">
                                {nameInitials(name)}
                            </Text>
                        )}
                    />
                </Avatar>
            }
            after={<Icon size={0.8} path={closed ? mdiChevronRight : mdiChevronDown} />}
        >
            <Box alignItems="Center" gap="200">
                <Text size="H4" truncate>
                    {name}
                </Text>
                {suggested && (
                    <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                        <Text size="L400">{getText('space_item.suggested')}</Text>
                    </Badge>
                )}
            </Box>
        </Chip>
    );
}

type RootSpaceProfileProps = {
    closed: boolean;
    categoryId: string;
    handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function RootSpaceProfile({ closed, categoryId, handleClose }: RootSpaceProfileProps) {
    return (
        <Chip
            data-category-id={categoryId}
            onClick={handleClose}
            className={css.HeaderChip}
            size="500"
            after={<Icon size={0.8} path={closed ? mdiChevronRight : mdiChevronDown} />}
        >
            <Box alignItems="Center" gap="200">
                <Text size="H4" truncate>
                    {getText('space_item.rooms')}
                </Text>
            </Box>
        </Chip>
    );
}

function AddRoomButton({ item }: { item: HierarchyItem }) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement>();

    const handleAddRoom: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setAnchorEl(evt.currentTarget);
    };

    const handleCreateRoom = () => {
        openCreateRoom(false, item.roomId as any);
        setAnchorEl(undefined);
    };

    const handleAddExisting = () => {
        openSpaceAddExisting(item.roomId);
        setAnchorEl(undefined);
    };

    return (
        <>
            <Button
                aria-pressed={!!anchorEl}
                onClick={handleAddRoom}
                startIcon={<Add />}
            >
                {getText('btn.space.add_room')}
            </Button>
            <Menu
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(undefined)}
            >
                <MenuItem
                    onClick={handleCreateRoom}
                >
                    <ListItemText>{getText('btn.space.new_room')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleAddExisting}>
                    <ListItemText>{getText('btn.space.existing_room')}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

function AddSpaceButton({ item }: { item: HierarchyItem }) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement>();

    const handleAddSpace: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setAnchorEl(evt.currentTarget);
    };

    const handleCreateSpace = () => {
        openCreateRoom(true, item.roomId as any);
        setAnchorEl(undefined);
    };

    const handleAddExisting = () => {
        openSpaceAddExisting(item.roomId, true);
        setAnchorEl(undefined);
    };
    return (
        <>
            <Button
                aria-pressed={!!anchorEl}
                onClick={handleAddSpace}
                startIcon={<Add />}
            >
                {getText('btn.space.add_space')}
            </Button>
            <Menu
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(undefined)}
            >
                <MenuItem
                    onClick={handleCreateSpace}
                >
                    <ListItemText>{getText('btn.space.new_space')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleAddExisting}>
                    <ListItemText>{getText('btn.space.existing_space')}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

type SpaceItemCardProps = {
    item: HierarchyItem;
    joined?: boolean;
    categoryId: string;
    closed: boolean;
    handleClose?: MouseEventHandler<HTMLButtonElement>;
    options?: ReactNode;
    before?: ReactNode;
    after?: ReactNode;
    canEditChild: boolean;
    canReorder: boolean;
    onDragging: (item?: HierarchyItem) => void;
    getRoom: (roomId: string) => Room | undefined;
};
export const SpaceItemCard = as<'div', SpaceItemCardProps>(
    (
        {
            className,
            joined,
            closed,
            categoryId,
            item,
            handleClose,
            options,
            before,
            after,
            canEditChild,
            canReorder,
            onDragging,
            getRoom,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const { roomId, content } = item;
        const space = getRoom(roomId);
        const targetRef = useRef<HTMLDivElement>(null);
        useDraggableItem(item, targetRef, onDragging);

        return (
            <Box
                shrink="No"
                alignItems="Center"
                gap="200"
                className={classNames(css.SpaceItemCard({ outlined: !joined || closed }), className)}
                {...props}
                ref={ref}
            >
                {before}
                <Box grow="Yes" gap="100" alignItems="Inherit" justifyContent="SpaceBetween">
                    <Box ref={canReorder ? targetRef : null}>
                        {space ? (
                            <LocalRoomSummaryLoader room={space}>
                                {(localSummary) =>
                                    item.parentId ? (
                                        <SpaceProfile
                                            roomId={roomId}
                                            name={localSummary.name}
                                            avatarUrl={getRoomAvatarUrl(mx, space, 96)}
                                            suggested={content.suggested}
                                            closed={closed}
                                            categoryId={categoryId}
                                            handleClose={handleClose}
                                        />
                                    ) : (
                                        <RootSpaceProfile
                                            closed={closed}
                                            categoryId={categoryId}
                                            handleClose={handleClose}
                                        />
                                    )
                                }
                            </LocalRoomSummaryLoader>
                        ) : (
                            <HierarchyRoomSummaryLoader roomId={roomId}>
                                {(summaryState) => (
                                    <>
                                        {summaryState.status === AsyncStatus.Loading && <SpaceProfileLoading />}
                                        {summaryState.status === AsyncStatus.Error &&
                                            (summaryState.error.name === ErrorCode.M_FORBIDDEN ? (
                                                <UnknownPrivateSpaceProfile roomId={roomId} suggested={content.suggested} />
                                            ) : (
                                                <UnknownSpaceProfile
                                                    roomId={roomId}
                                                    via={item.content.via}
                                                    suggested={content.suggested}
                                                />
                                            ))}
                                        {summaryState.status === AsyncStatus.Success && (
                                            <UnknownSpaceProfile
                                                roomId={roomId}
                                                via={item.content.via}
                                                name={summaryState.data.name || summaryState.data.canonical_alias || roomId}
                                                avatarUrl={
                                                    summaryState.data?.avatar_url
                                                        ? mxcUrlToHttp(mx, summaryState.data.avatar_url, 96, 96, 'crop') ??
                                                        undefined
                                                        : undefined
                                                }
                                                suggested={content.suggested}
                                            />
                                        )}
                                    </>
                                )}
                            </HierarchyRoomSummaryLoader>
                        )}
                    </Box>
                    {canEditChild && (
                        <Box alignItems="Inherit" gap="200">
                            <AddRoomButton item={item} />
                            {item.parentId === undefined && <AddSpaceButton item={item} />}
                        </Box>
                    )}
                </Box>
                {options}
                {after}
            </Box>
        );
    }
);
