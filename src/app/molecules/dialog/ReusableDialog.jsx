import React, { useState, useEffect } from 'react';

import { Box, Dialog, DialogTitle } from '@mui/material';
import cons from '../../../client/state/cons';

import navigation from '../../../client/state/navigation';

function ReusableDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [data, setData] = useState(null);

	useEffect(() => {
		const handleOpen = (title, render, afterClose, props) => {
			setIsOpen(true);
			setData({ title, render, afterClose, props });
		};
		navigation.on(cons.events.navigation.REUSABLE_DIALOG_OPENED, handleOpen);
		return () => {
			navigation.removeListener(cons.events.navigation.REUSABLE_DIALOG_OPENED, handleOpen);
		};
	}, []);

	const handleAfterClose = () => {
		data.afterClose?.();
		setData(null);
	};

	const handleRequestClose = () => {
		setIsOpen(false);
	};

	return (
		<Dialog
			open={isOpen}
			onClose={() => { handleRequestClose(); handleAfterClose(); }}
			{...(data?.props ? data?.props(handleRequestClose) : {})}
		>
			<Box display='flex' justifyContent='space-between'>
				<DialogTitle sx={{ m: 0, p: 2 }}>
					{data?.title}
				</DialogTitle>
			</Box>
			{data?.render(handleRequestClose) || <div />}
		</Dialog>
	);
}

export default ReusableDialog;
