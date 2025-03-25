import React, { ReactNode, useCallback, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import {
	Avatar,
	Box,
	Text,
	as,
} from 'folds';
import classNames from 'classnames';
import Icon from '@mdi/react';
import { mdiAccount } from '@mdi/js';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid2, Paper, PaperProps, useTheme } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import * as css from './style.css';
import { RoomAvatar } from '../room-avatar';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { onEnterOrSpace } from '../../utils/keyboard';
import { RoomType, StateEvent } from '../../../types/matrix/room';
import { useJoinedRoomId } from '../../hooks/useJoinedRoomId';
import { getRoomAvatarUrl, getStateEvent } from '../../utils/room';
import { useStateEventCallback } from '../../hooks/useStateEventCallback';
import { getText } from '../../../lang';

export function RoomCardGrid({ children }: { children: ReactNode }) {
	return (
		<Grid2 container spacing={2}>
			{children}
		</Grid2>
	);
}

export const RoomCardBase = React.forwardRef<HTMLDivElement, PaperProps>((props: PaperProps, ref) => {
	const theme = useTheme();
	return (
		<Paper
			{...props}
			sx={{
				flexDirection: 'column',
				gap: theme.spacing(2),
				display: 'flex',
				padding: theme.spacing(3),
				borderRadius: theme.shape.borderRadius,
				backgroundColor: 'var(--mui-palette-background-variant)',
				...props.sx
			}}
			ref={ref || undefined}
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
	knock?: boolean;
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
			knock,
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
			: avatarUrl && mxcUrlToHttp(mx, avatarUrl, 96, 96, 'crop');

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
			useCallback(() => mx.joinRoom(roomIdOrAlias), [mx, roomIdOrAlias])
		);
		const joining =
			joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

		const [knockState, knockRoom] = useAsyncCallback<{ room_id: string }, MatrixError, []>(
			useCallback(() => mx.knockRoom(roomIdOrAlias), [mx, roomIdOrAlias])
		);
		const knocking =
			knockState.status === AsyncStatus.Loading || knockState.status === AsyncStatus.Success;

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
						<Chip size='small' variant='filled' label={getText('generic.space')} />
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
					knock ? (
						<LoadingButton
							onClick={knockRoom}
							variant='contained'
							loading={knocking}
						>
							{getText(knocking ? 'room_card.knocking' : 'btn.knock')}
						</LoadingButton>
					) : (
						<LoadingButton
							onClick={join}
							variant='contained'
							loading={joining}
						>
							{getText(joining ? 'room_card.joining' : 'btn.join')}
						</LoadingButton>
					)
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
