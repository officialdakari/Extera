import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Modal,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    Spinner,
    Text,
    Tooltip,
    TooltipProvider,
    as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import FocusTrap from 'focus-trap-react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IImageInfo, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl } from './util';
import * as css from './style.css';
import { bytesToSize } from '../../../utils/common';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { RenderBody } from '../RenderBody';
import HTMLReactParser, { HTMLReactParserOptions } from 'html-react-parser';
import { getReactCustomHtmlParser } from '../../../plugins/react-custom-html-parser';
import { getText } from '../../../../lang';
import { mdiAlert, mdiImage } from '@mdi/js';
import Icon from '@mdi/react';

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
                () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType || FALLBACK_MIMETYPE, encInfo, mx),
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
                    <Overlay open={viewer} backdrop={<OverlayBackdrop />}>
                        <OverlayCenter>
                            <FocusTrap
                                focusTrapOptions={{
                                    initialFocus: false,
                                    onDeactivate: () => setViewer(false),
                                    clickOutsideDeactivates: true,
                                }}
                            >
                                <Modal
                                    className={css.ModalWide}
                                    size="500"
                                    onContextMenu={(evt: any) => evt.stopPropagation()}
                                >
                                    {renderViewer({
                                        src: srcState.data,
                                        alt: filename ?? body,
                                        requestClose: () => setViewer(false),
                                    })}
                                </Modal>
                            </FocusTrap>
                        </OverlayCenter>
                    </Overlay>
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
                            variant="Secondary"
                            fill="Solid"
                            radii="300"
                            size="300"
                            onClick={loadSrc}
                            before={<Icon size={1} path={mdiImage} />}
                        >
                            <Text size="B300">{getText('btn.view')}</Text>
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
                            <Spinner variant="Secondary" />
                        </Box>
                    )}
                {(error || srcState.status === AsyncStatus.Error) && (
                    <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
                        <TooltipProvider
                            tooltip={
                                <Tooltip variant="Critical">
                                    <Text>{getText('msg.image.failed')}</Text>
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
                {!load && typeof info?.size === 'number' && (
                    <Box className={css.AbsoluteFooter} justifyContent="End" alignContent="Center" gap="200">
                        <Badge variant="Secondary" fill="Soft">
                            <Text size="L400">{bytesToSize(info.size)}</Text>
                        </Badge>
                    </Box>
                )}
            </Box>
        );
    }
);
