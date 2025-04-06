import React from 'react';
import { AssistChip, Box, Divider } from 'react-you-ui';
import { getText } from '../../../lang';

export function OrDivider() {
	return (
		<Box display='flex' flexGrow={1} gap='40px' alignItems="center" style={{ width: '100%' }}>
			<Divider style={{ width: '100%' }} />
			<AssistChip label={getText('generic.OR')} />
			<Divider style={{ width: '100%' }} />
		</Box>
	);
}
