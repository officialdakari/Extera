import React, { MutableRefObject, ReactNode, useImperativeHandle, useRef } from 'react';
import { Box, Text, as, percent } from 'folds';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';

import Icon from '@mdi/react';
import { mdiChevronRight, mdiChevronUp, mdiClose } from '@mdi/js';
import { Chip, CircularProgress } from '@mui/material';
import * as css from './UploadBoard.css';
import { TUploadFamilyObserverAtom, Upload, UploadStatus, UploadSuccess } from '../../state/upload';
import { getText } from '../../../lang';

type UploadBoardProps = {
	header: ReactNode;
};
export const UploadBoard = as<'div', UploadBoardProps>(({ header, children, ...props }, ref) => (
	<Box className={css.UploadBoardBase} {...props} ref={ref}>
		<Box className={css.UploadBoardContainer} justifyContent="End">
			<Box className={classNames(css.UploadBoard)} direction="Column">
				<Box grow="Yes" direction="Column">
					{children}
				</Box>
				<Box direction="Column" shrink="No">
					{header}
				</Box>
			</Box>
		</Box>
	</Box>
));

export type UploadBoardImperativeHandlers = { handleSend: () => Promise<void> };

type UploadBoardHeaderProps = {
	open: boolean;
	onToggle: () => void;
	uploadFamilyObserverAtom: TUploadFamilyObserverAtom;
	onCancel: (uploads: Upload[]) => void;
	onSend: (uploads: UploadSuccess[]) => Promise<void>;
	imperativeHandlerRef: MutableRefObject<UploadBoardImperativeHandlers | undefined>;
};

export function UploadBoardHeader({
	open,
	onToggle,
	uploadFamilyObserverAtom,
	onCancel,
	onSend,
	imperativeHandlerRef,
}: UploadBoardHeaderProps) {
	const sendingRef = useRef(false);
	const uploads = useAtomValue(uploadFamilyObserverAtom);

	const isSuccess = uploads.every((upload) => upload.status === UploadStatus.Success);
	const isError = uploads.some((upload) => upload.status === UploadStatus.Error);
	const progress = uploads.reduce(
		(acc, upload) => {
			acc.total += upload.file.size;
			if (upload.status === UploadStatus.Loading) {
				acc.loaded += upload.progress.loaded;
			}
			if (upload.status === UploadStatus.Success) {
				acc.loaded += upload.file.size;
			}
			return acc;
		},
		{ loaded: 0, total: 0 }
	);

	const handleSend = async () => {
		if (sendingRef.current) return;
		sendingRef.current = true;
		await onSend(
			uploads.filter((upload) => upload.status === UploadStatus.Success) as UploadSuccess[]
		);
		sendingRef.current = false;
	};

	useImperativeHandle(imperativeHandlerRef, () => ({
		handleSend,
	}));
	const handleCancel = () => onCancel(uploads);

	return (
		<Box className={css.UploadBoardHeader}>
			<Box
				as="button"
				onClick={onToggle}
				className={css.UploadBoardHeaderContent}
				alignItems="Center"
				grow="Yes"
				gap="100"
			>
				<Icon size={1} path={open ? mdiChevronUp : mdiChevronRight} />
				<Text size="H6">{getText('upload_board.title')}</Text>
			</Box>
			<Box className={css.UploadBoardHeaderContent} alignItems="Center" gap="100">
				{isError && !open && (
					<Chip
						size='small'
						color="error"
						variant='filled'
						label={getText('error.upload')}
					/>
				)}
				{!isSuccess && !isError && !open && (
					<>
						<Chip
							color='primary'
							variant='filled'
							size='small'
							label={<>{Math.round(percent(0, progress.total, progress.loaded))}%</>}
						/>
						<CircularProgress size={16} variant="determinate" value={percent(0, progress.total, progress.loaded)} />
					</>
				)}
				{!isSuccess && open && (
					<Chip
						onClick={handleCancel}
						variant="outlined"
						color='error'
						icon={<Icon size={1} path={mdiClose} />}
						label={getText(uploads.length === 1 ? 'btn.ub_remove' : 'btn.ub_remove_all')}
					/>
				)}
			</Box>
		</Box>
	);
}

export const UploadBoardContent = as<'div'>(({ className, children, ...props }, ref) => (
	<Box
		className={classNames(css.UploadBoardContent, className)}
		gap="200"
		{...props}
		ref={ref}
	>
		{children}
	</Box>
));
