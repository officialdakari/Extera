import React, { MutableRefObject, ReactNode, useImperativeHandle, useRef } from 'react';
import { Badge, Box, Chip, Header, Spinner, Text, as, percent } from 'folds';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';

import * as css from './UploadBoard.css';
import { TUploadFamilyObserverAtom, Upload, UploadStatus, UploadSuccess } from '../../state/upload';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiChevronRight, mdiChevronUp, mdiClose } from '@mdi/js';

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
                style={{ cursor: 'pointer' }}
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
                    <Badge variant="Critical" fill="Solid" radii="300">
                        <Text size="L400">{getText('error.upload')}</Text>
                    </Badge>
                )}
                {!isSuccess && !isError && !open && (
                    <>
                        <Badge variant="Secondary" fill="Solid" radii="Pill">
                            <Text size="L400">{Math.round(percent(0, progress.total, progress.loaded))}%</Text>
                        </Badge>
                        <Spinner variant="Secondary" size="200" />
                    </>
                )}
                {!isSuccess && open && (
                    <Chip
                        as="button"
                        onClick={handleCancel}
                        variant="SurfaceVariant"
                        radii="Pill"
                        after={<Icon size={1} path={mdiClose} />}
                    >
                        <Text size="B300">{getText(uploads.length === 1 ? 'btn.ub_remove' : 'btn.ub_remove_all')}</Text>
                    </Chip>
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
