import React from 'react';
import { as } from 'folds';
import Linkify from 'linkify-react';
import { DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { LINKIFY_OPTS, scaleSystemEmoji } from '../../plugins/react-custom-html-parser';

export const RoomTopicViewer = as<
	'div',
	{
		name: string;
		topic: string;
		requestClose: () => void;
	}
>(({ name, topic }) => (
	<>
		<DialogTitle>
			{name}
		</DialogTitle>
		<DialogContent>
			<DialogContentText>
				<Linkify options={LINKIFY_OPTS}>
					{scaleSystemEmoji(topic)}
				</Linkify>
			</DialogContentText>
		</DialogContent>
	</>
));
