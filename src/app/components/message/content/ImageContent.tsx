import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IImageInfo, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl } from './util';
import * as css from './style.css';
import { bytesToSize } from '../../../utils/common';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { getText } from '../../../../lang';
import { mdiAlert, mdiImage } from '@mdi/js';
import Icon from '@mdi/react';
import { Button, CircularProgress, Dialog, Tooltip } from '@mui/material';
import { mxcUrlToHttp } from '../../../utils/matrix';

type RenderViewerProps = {
    src: string;
    alt: string;
    requestClose: () => void;
};
type RenderImageProps = {
    alt: string;
    title: string;
    src: string;
    onLoad: () => void;
    onError: () => void;
    onClick: () => void;
    tabIndex: number;
};
export type ImageContentProps = {
    body: string;
    formatted_body?: string;
    format?: string;
    mimeType?: string;
    filename?: string;
    url: string;
    info?: IImageInfo;
    encInfo?: EncryptedAttachmentInfo;
    autoPlay?: boolean;
    renderViewer: (props: RenderViewerProps) => ReactNode;
    renderImage: (props: RenderImageProps) => ReactNode;
};
export const ImageContent = as<'div', ImageContentProps>(
    (
        {
            className,
            body,
            formatted_body,
            format,
            filename,
            mimeType,
            url,
            info,
            encInfo,
            autoPlay,
            renderViewer,
            renderImage,
            ...props
        },
        ref
    ) => {
        const mx = useMatrixClient();
        const blurHash = info?.[MATRIX_BLUR_HASH_PROPERTY_NAME];

        const [load, setLoad] = useState(false);
        const [error, setError] = useState(false);
        const [viewer, setViewer] = useState(false);

        const [srcState, loadSrc] = useAsyncCallback(
            useCallback(
                () => getFileSrcUrl(mxcUrlToHttp(mx, url) ?? '', mimeType || FALLBACK_MIMETYPE, encInfo, mx),
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
                {srcState.status === AsyncStatus.Success && (
                    // <Overlay open={viewer} backdrop={<OverlayBackdrop />}>
                    //     <OverlayCenter>
                    //         <FocusTrap
                    //             focusTrapOptions={{
                    //                 initialFocus: false,
                    //                 onDeactivate: () => setViewer(false),
                    //                 clickOutsideDeactivates: true,
                    //             }}
                    //         >
                    //             <Modal
                    //                 className={css.ModalWide}
                    //                 size="500"
                    //                 onContextMenu={(evt: any) => evt.stopPropagation()}
                    //             >

                    //             </Modal>
                    //         </FocusTrap>
                    //     </OverlayCenter>
                    // </Overlay>
                    <Dialog fullScreen open={viewer}>
                        {renderViewer({
                            alt: filename ?? body,
                            src: srcState.data,
                            requestClose: () => setViewer(false)
                        })}
                    </Dialog>
                )}
                {typeof blurHash === 'string' && !load && (
                    <BlurhashCanvas
                        style={{ width: '100%', height: '100%' }}
                        width={32}
                        height={32}
                        hash={blurHash}
                        punch={1}
                    />
                )}
                {!autoPlay && srcState.status === AsyncStatus.Idle && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        <Button
                            color='secondary'
                            onClick={loadSrc}
                            startIcon={<Icon size={1} path={mdiImage} />}
                        >
                            {getText('btn.view')}
                        </Button>
                    </Box>
                )}
                {srcState.status === AsyncStatus.Success && (
                    <Box direction='Column' className={css.AbsoluteContainer}>
                        {renderImage({
                            alt: filename ?? body,
                            title: filename ?? body,
                            src: srcState.data,
                            onLoad: handleLoad,
                            onError: handleError,
                            onClick: () => setViewer(true),
                            tabIndex: 0,
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
                        <Tooltip title={getText('msg.image.failed')}>
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
                {!load && typeof info?.size === 'number' && (
                    <Box className={css.AbsoluteFooter} justifyContent="End" alignContent="Center" gap="200">
                        {bytesToSize(info.size)}
                    </Box>
                )}
            </Box>
        );
    }
);
