import React from 'react';
import { Chip, IconButton, Text, color } from 'folds';
import { UploadCard, UploadCardError, UploadCardProgress } from './UploadCard';
import { TUploadAtom, UploadStatus, useBindUploadAtom } from '../../state/upload';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { TUploadContent } from '../../utils/matrix';
import { getFileTypeIcon } from '../../utils/common';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiCheck, mdiClose } from '@mdi/js';

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

    return (
        <UploadCard
            radii="300"
            before={<Icon size={0.8} path={getFileTypeIcon(file.type)} />}
            after={
                <>
                    {upload.status === UploadStatus.Error && (
                        <Chip
                            as="button"
                            onClick={startUpload}
                            aria-label={getText('aria.retry_upload')}
                            variant="Critical"
                            radii="Pill"
                            outlined
                        >
                            <Text size="B300">{getText('btn.retry')}</Text>
                        </Chip>
                    )}
                    <IconButton
                        onClick={removeUpload}
                        aria-label={getText('aria.cancel_upload')}
                        variant="SurfaceVariant"
                        radii="Pill"
                        size="300"
                    >
                        <Icon path={mdiClose} size={1} />
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
                            <Text size="T200">{upload.error.message}</Text>
                        </UploadCardError>
                    )}
                </>
            }
        >
            <Text size="H6" truncate>
                {file.name}
            </Text>
            {upload.status === UploadStatus.Success && (
                <Icon style={{ color: color.Success.Main }} path={mdiCheck} size={1} />
            )}
        </UploadCard>
    );
}
