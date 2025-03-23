import React from 'react';
import { Box, Scroll, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { RoomCard } from '../../components/room-card';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { Page } from '../../components/page';
import { RoomSummaryLoader } from '../../components/RoomSummaryLoader';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { BackRouteHandler } from '../../components/BackRouteHandler';

type JoinBeforeNavigateProps = { roomIdOrAlias: string };
export function JoinBeforeNavigate({ roomIdOrAlias }: JoinBeforeNavigateProps) {
	const mx = useMatrixClient();
	const allRooms = useAtomValue(allRoomsAtom);
	const { navigateRoom, navigateSpace } = useRoomNavigate();

	const handleView = (roomId: string) => {
		if (mx.getRoom(roomId)?.isSpaceRoom()) {
			navigateSpace(roomId);
			return;
		}
		navigateRoom(roomId);
	};

	return (
		<Page>
			<AppBar position='static' color='info'>
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
						{roomIdOrAlias}
					</Typography>
				</Toolbar>
			</AppBar>
			<Box grow="Yes">
				<Scroll hideTrack visibility="Hover" size="0">
					<Box style={{ height: '100%' }} grow="Yes" alignItems="Center" justifyContent="Center">
						<RoomSummaryLoader roomIdOrAlias={roomIdOrAlias}>
							{(summary) => (
								<RoomCard
									style={{ maxWidth: toRem(364), width: '100%' }}
									roomIdOrAlias={roomIdOrAlias}
									allRooms={allRooms}
									avatarUrl={summary?.avatar_url}
									name={summary?.name}
									topic={summary?.topic}
									memberCount={summary?.num_joined_members}
									roomType={summary?.room_type}
									renderTopicViewer={(name, topic, requestClose) => (
										<RoomTopicViewer name={name} topic={topic} requestClose={requestClose} />
									)}
									onView={handleView}
								/>
							)}
						</RoomSummaryLoader>
					</Box>
				</Scroll>
			</Box>
		</Page>
	);
}
