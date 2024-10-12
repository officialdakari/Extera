import React from 'react';
import { UploadCard, UploadCardError, UploadCardProgress } from './UploadCard';
import { TUploadAtom, UploadStatus, useBindUploadAtom } from '../../state/upload';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { TUploadContent } from '../../utils/matrix';
import { getFileTypeIcon } from '../../utils/common';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { Chip, IconButton, Typography } from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import { mdiFile } from '@mdi/js';

type UploadCardRendererProps = {
    file: TUploadContent;
    isEncrypted?: boolean;
    uploadAtom: TUploadAtom;
    onRemove: (file: TUploadContent) => void;
};
export function UploadCardRenderer({
    file,
    isEncrypted,
    uploadAtom,
    onRemove,
}: UploadCardRendererProps) {
    const mx = useMatrixClient();
    const { upload, startUpload, cancelUpload } = useBindUploadAtom(
        mx,
        file,
        uploadAtom,
        isEncrypted
    );

    if (upload.status === UploadStatus.Idle) startUpload();

    const removeUpload = () => {
        cancelUpload();
        onRemove(file);
    };

    const icon = getFileTypeIcon(file?.type);

    return (
        <UploadCard
            radii="300"
            before={<Icon size={0.8} path={icon ?? mdiFile} />}
            after={
                <>
                    {upload.status === UploadStatus.Error && (
                        <Chip
                            onClick={startUpload}
                            aria-label={getText('aria.retry_upload')}
                            label={getText('btn.retry')}
                            color='error'
                            variant='outlined'
                        />
                    )}

                    <IconButton
                        onClick={removeUpload}
                        aria-label={getText('aria.cancel_upload')}
                    >
                        <Close />
                    </IconButton>
                </>
            }
            bottom={
                <>
                    {upload.status === UploadStatus.Idle && (
                        <UploadCardProgress sentBytes={0} totalBytes={file.size} />
                    )}
                    {upload.status === UploadStatus.Loading && (
                        <UploadCardProgress sentBytes={upload.progress.loaded} totalBytes={file.size} />
                    )}
                    {upload.status === UploadStatus.Error && (
                        <UploadCardError>
                            {upload.error.message}
                        </UploadCardError>
                    )}
                </>
            }
        >
            <Typography textOverflow='ellipsis'>
                {file.name}
            </Typography>
            {upload.status === UploadStatus.Success && (
                <Check color='success' />
            )}
        </UploadCard>
    );
}
