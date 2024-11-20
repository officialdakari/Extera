import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import {
    Box,
    as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import {
    IThumbnailContent,
    IVideoInfo,
    MATRIX_BLUR_HASH_PROPERTY_NAME,
} from '../../../../types/matrix/common';
import * as css from './style.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getFileSrcUrl } from './util';
import { bytesToSize } from '../../../../util/common';
import { millisecondsToMinutesAndSeconds } from '../../../utils/common';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiAlert, mdiPlay } from '@mdi/js';
import { Button, Chip, CircularProgress, Fab, Tooltip, Typography } from '@mui/material';

type RenderVideoProps = {
    title: string;
    src: string;
    onLoadedMetadata: () => void;
    onError: () => void;
    autoPlay: boolean;
    controls: boolean;
};
type VideoContentProps = {
    body: string;
    mimeType: string;
    url: string;
    info: IVideoInfo & IThumbnailContent;
    encInfo?: EncryptedAttachmentInfo;
    autoPlay?: boolean;
    renderThumbnail?: () => ReactNode;
    renderVideo: (props: RenderVideoProps) => ReactNode;
};
export const VideoContent = as<'div', VideoContentProps>(
    (
        {
            className,
            body,
            mimeType,
            url,
            info,
            encInfo,
            autoPlay,
            renderThumbnail,
            renderVideo,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const blurHash = info.thumbnail_info?.[MATRIX_BLUR_HASH_PROPERTY_NAME];

        const [load, setLoad] = useState(false);
        const [error, setError] = useState(false);

        const [srcState, loadSrc] = useAsyncCallback(
            useCallback(
                () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo, mx, true),
                [mx, url, mimeType, encInfo]
            )
        );

        const handleLoad = () => {
            setLoad(true);
        };
        const handleError = () => {
            setLoad(false);
            setError(true);
        };

        const handleRetry = () => {
            setError(false);
            loadSrc();
        };

        useEffect(() => {
            if (autoPlay) loadSrc();
        }, [autoPlay, loadSrc]);

        return (
            <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
                {typeof blurHash === 'string' && !load && (
                    <BlurhashCanvas
                        style={{ width: '100%', height: '100%' }}
                        width={32}
                        height={32}
                        hash={blurHash}
                        punch={1}
                    />
                )}
                {renderThumbnail && !load && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        {renderThumbnail()}
                    </Box>
                )}
                {!autoPlay && srcState.status === AsyncStatus.Idle && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        <Fab
                            aria-label={getText('btn.watch')}
                            onClick={loadSrc}
                        >
                            <Icon size={1.5} path={mdiPlay} />
                        </Fab>
                    </Box>
                )}
                {srcState.status === AsyncStatus.Success && (
                    <Box className={css.AbsoluteContainer}>
                        {renderVideo({
                            title: body,
                            src: srcState.data,
                            onLoadedMetadata: handleLoad,
                            onError: handleError,
                            autoPlay: true,
                            controls: true,
                        })}
                    </Box>
                )}
                {(srcState.status === AsyncStatus.Loading || srcState.status === AsyncStatus.Success) &&
                    !load && (
                        <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                            <CircularProgress />
                        </Box>
                    )}
                {(error || srcState.status === AsyncStatus.Error) && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        <Tooltip title={getText('msg.video.failed')}>
                            <Button
                                color='error'
                                variant='outlined'
                                startIcon={<Icon size={1} path={mdiAlert} />}
                            >
                                {getText('btn.retry')}
                            </Button>
                        </Tooltip>
                    </Box>
                )}
                {!load && typeof info.size === 'number' && (
                    <Box
                        className={css.AbsoluteFooter}
                        justifyContent="SpaceBetween"
                        alignContent="Center"
                        gap="200"
                    >
                        <Chip label={millisecondsToMinutesAndSeconds(info.duration ?? 0)} size='small' />
                        <Chip label={bytesToSize(info.size)} size='small' />
                    </Box>
                )}
            </Box>
        );
    }
);
