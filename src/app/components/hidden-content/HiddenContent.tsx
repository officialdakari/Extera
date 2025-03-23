import React, { ReactNode, useState } from 'react';
import { Button } from '@mui/material';
import { getText } from '../../../lang';

type HiddenContentProps = {
	reason?: string;
	children: ReactNode | ReactNode[];
};

export default function HiddenContent({ reason, children }: HiddenContentProps) {
	const [show, setShow] = useState(false);
	return reason && !show
		? (
			<Button
				variant='contained'
				size='large'
				onClick={() => setShow(true)}
			>
				{getText('hidden_content', getText(reason))}
			</Button>
		)
		: children;
}