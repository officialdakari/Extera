import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Spinner,
    Text,
    Tooltip,
    TooltipProvider,
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
                () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo),
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
                        <Button
                            variant="Secondary"
                            fill="Solid"
                            radii="300"
                            size="300"
                            onClick={loadSrc}
                            before={<Icon size={1} path={mdiPlay} />}
                        >
                            <Text size="B300">{getText('btn.watch')}</Text>
                        </Button>
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
                            <Spinner variant="Secondary" />
                        </Box>
                    )}
                {(error || srcState.status === AsyncStatus.Error) && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        <TooltipProvider
                            tooltip={
                                <Tooltip variant="Critical">
                                    <Text>{getText('msg.video.failed')}</Text>
                                </Tooltip>
                            }
                            position="Top"
                            align="Center"
                        >
                            {(triggerRef) => (
                                <Button
                                    ref={triggerRef}
                                    size="300"
                                    variant="Critical"
                                    fill="Soft"
                                    outlined
                                    radii="300"
                                    onClick={handleRetry}
                                    before={<Icon size={1} path={mdiAlert} />}
                                >
                                    <Text size="B300">{getText('btn.retry')}</Text>
                                </Button>
                            )}
                        </TooltipProvider>
                    </Box>
                )}
                {!load && typeof info.size === 'number' && (
                    <Box
                        className={css.AbsoluteFooter}
                        justifyContent="SpaceBetween"
                        alignContent="Center"
                        gap="200"
                    >
                        <Badge variant="Secondary" fill="Soft">
                            <Text size="L400">{millisecondsToMinutesAndSeconds(info.duration ?? 0)}</Text>
                        </Badge>
                        <Badge variant="Secondary" fill="Soft">
                            <Text size="L400">{bytesToSize(info.size)}</Text>
                        </Badge>
                    </Box>
                )}
            </Box>
        );
    }
);
