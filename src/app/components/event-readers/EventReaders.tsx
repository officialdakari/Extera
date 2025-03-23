import React from 'react';
import {
	Avatar,
	as,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import Icon from '@mdi/react';
import { mdiAccount } from '@mdi/js';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { openProfileViewer } from '../../../client/action/navigation';
import { UserAvatar } from '../user-avatar';

export type EventReadersProps = {
	room: Room;
	eventId: string;
	requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
	({ room, eventId, requestClose }) => {
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
