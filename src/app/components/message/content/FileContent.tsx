import React, { ReactNode, useCallback, useState } from 'react';
import {
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
import FileSaver from 'file-saver';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import FocusTrap from 'focus-trap-react';
import { IFileInfo } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl, getSrcFile } from './util';
import { bytesToSize } from '../../../utils/common';
import {
    READABLE_EXT_TO_MIME_TYPE,
    READABLE_TEXT_MIME_TYPES,
    getFileNameExt,
    mimeTypeToExt,
} from '../../../utils/mimeTypes';
import * as css from './style.css';
import { HTMLReactParserOptions } from 'html-react-parser';
import { RenderBody } from '../RenderBody';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiAlert, mdiArrowDownBold, mdiArrowRight, mdiDownload } from '@mdi/js';
import { saveFile, useDownloadStatus } from '../../../utils/saveFile';

const renderErrorButton = (retry: () => void, text: string) => (
    <TooltipProvider
        tooltip={
            <Tooltip variant="Critical">
                <Text>{getText('msg.file.failed')}</Text>
            </Tooltip>
        }
        position="Top"
        align="Center"
    >
        {(triggerRef) => (
            <Button
                ref={triggerRef}
                size="400"
                variant="Critical"
                fill="Soft"
                outlined
                radii="300"
                onClick={retry}
                before={<Icon size={1} path={mdiAlert} />}
            >
                <Text size="B400" truncate>
                    {text}
                </Text>
            </Button>
        )}
    </TooltipProvider>
);

type RenderTextViewerProps = {
    name: string;
    text: string;
    langName: string;
    requestClose: () => void;
};
type ReadTextFileProps = {
    body: string;
    mimeType: string;
    url: string;
    encInfo?: EncryptedAttachmentInfo;
    formatted_body?: string;
    format?: string;
    filename?: string;
    renderViewer: (props: RenderTextViewerProps) => ReactNode;
};
export function ReadTextFile({ body, mimeType, url, encInfo, renderViewer, formatted_body, format, filename }: ReadTextFileProps) {
    const mx = useMatrixClient();
    const [textViewer, setTextViewer] = useState(false);

    const loadSrc = useCallback(
        () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo),
        [mx, url, mimeType, encInfo]
    );

    const [textState, loadText] = useAsyncCallback(
        useCallback(async () => {
            const src = await loadSrc();
            const blob = await getSrcFile(src);
            const text = blob.text();
            setTextViewer(true);
            return text;
        }, [loadSrc])
    );

    return (
        <>
            {textState.status === AsyncStatus.Success && (
                <Overlay open={textViewer} backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                        <FocusTrap
                            focusTrapOptions={{
                                initialFocus: false,
                                onDeactivate: () => setTextViewer(false),
                                clickOutsideDeactivates: true,
                            }}
                        >
                            <Modal
                                className={css.ModalWide}
                                size="500"
                                onContextMenu={(evt: any) => evt.stopPropagation()}
                            >
                                {renderViewer({
                                    name: filename ?? body,
                                    text: textState.data,
                                    langName: READABLE_TEXT_MIME_TYPES.includes(mimeType)
                                        ? mimeTypeToExt(mimeType)
                                        : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)] ?? mimeType),
                                    requestClose: () => setTextViewer(false),
                                })}
                            </Modal>
                        </FocusTrap>
                    </OverlayCenter>
                </Overlay>
            )}
            {textState.status === AsyncStatus.Error ? (
                renderErrorButton(loadText, getText('btn.open_file'))
            ) : (
                <Button
                    variant="Secondary"
                    fill="Solid"
                    radii="300"
                    size="400"
                    onClick={() =>
                        textState.status === AsyncStatus.Success ? setTextViewer(true) : loadText()
                    }
                    disabled={textState.status === AsyncStatus.Loading}
                    before={
                        textState.status === AsyncStatus.Loading ? (
                            <Spinner fill="Solid" size="100" variant="Secondary" />
                        ) : (
                            <Icon size={1} path={mdiArrowRight} />
                        )
                    }
                >
                    <Text size="B400">
                        {getText('btn.open_file')}
                    </Text>
                </Button>
            )}
        </>
    );
}

type RenderPdfViewerProps = {
    name: string;
    src: string;
    requestClose: () => void;
};
export type ReadPdfFileProps = {
    body: string;
    mimeType: string;
    url: string;
    encInfo?: EncryptedAttachmentInfo;
    formatted_body?: string;
    format?: string;
    filename?: string;
    renderViewer: (props: RenderPdfViewerProps) => ReactNode;
};
export function ReadPdfFile({ body, mimeType, url, encInfo, renderViewer, format, formatted_body, filename }: ReadPdfFileProps) {
    const mx = useMatrixClient();
    const [pdfViewer, setPdfViewer] = useState(false);

    const [pdfState, loadPdf] = useAsyncCallback(
        useCallback(async () => {
            const httpUrl = await getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo);
            setPdfViewer(true);
            return httpUrl;
        }, [mx, url, mimeType, encInfo])
    );

    return (
        <>
            {pdfState.status === AsyncStatus.Success && (
                <Overlay open={pdfViewer} backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                        <FocusTrap
                            focusTrapOptions={{
                                initialFocus: false,
                                onDeactivate: () => setPdfViewer(false),
                                clickOutsideDeactivates: true,
                            }}
                        >
                            <Modal
                                className={css.ModalWide}
                                size="500"
                                onContextMenu={(evt: any) => evt.stopPropagation()}
                            >
                                {renderViewer({
                                    name: filename ?? body,
                                    src: pdfState.data,
                                    requestClose: () => setPdfViewer(false),
                                })}
                            </Modal>
                        </FocusTrap>
                    </OverlayCenter>
                </Overlay>
            )}
            {pdfState.status === AsyncStatus.Error ? (
                renderErrorButton(loadPdf, getText('btn.open_pdf'))
            ) : (
                <Button
                    variant="Secondary"
                    fill="Solid"
                    radii="300"
                    size="400"
                    onClick={() => (pdfState.status === AsyncStatus.Success ? setPdfViewer(true) : loadPdf())}
                    disabled={pdfState.status === AsyncStatus.Loading}
                    before={
                        pdfState.status === AsyncStatus.Loading ? (
                            <Spinner fill="Solid" size="100" variant="Secondary" />
                        ) : (
                            <Icon size={1} path={mdiArrowRight} />
                        )
                    }
                >
                    <Text size="B400">
                        {getText('btn.open_pdf')}
                    </Text>
                </Button>
            )}
        </>
    );
}

export type DownloadFileProps = {
    body: string;
    mimeType: string;
    url: string;
    info: IFileInfo;
    filename?: string;
    encInfo?: EncryptedAttachmentInfo;
};
export function DownloadFile({ body, mimeType, url, info, encInfo, filename }: DownloadFileProps) {
    const mx = useMatrixClient();

    const [downloadState, download] = useAsyncCallback(
        useCallback(async () => {
            const httpUrl = await getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo, mx);
            saveFile(httpUrl, filename ?? body);
            return httpUrl;
        }, [mx, url, mimeType, encInfo, body, filename])
    );

    return downloadState.status === AsyncStatus.Error ? (
        renderErrorButton(download, getText('btn.retry_download', bytesToSize(info.size ?? 0)))
    ) : (
        <>
            <Button
                variant="Secondary"
                fill="Soft"
                radii="300"
                size="400"
                onClick={() =>
                    downloadState.status === AsyncStatus.Success
                        ? FileSaver.saveAs(downloadState.data, filename ?? body)
                        : download()
                }
                disabled={downloadState.status === AsyncStatus.Loading}
                before={
                    downloadState.status === AsyncStatus.Loading ? (
                        <Spinner fill="Soft" size="100" variant="Secondary" />
                    ) : (
                        <Icon size={1} path={mdiDownload} />
                    )
                }
            >
                <Text size="B400">{getText('btn.download_size', bytesToSize(info.size ?? 0))}</Text>
            </Button>
        </>
    );
}

type FileContentProps = {
    body: string;
    mimeType: string;
    formatted_body?: string;
    format?: string;
    filename?: string;
    htmlReactParserOptions: HTMLReactParserOptions;
    renderAsTextFile: () => ReactNode;
    renderAsPdfFile: () => ReactNode;
};
export const FileContent = as<'div', FileContentProps>(
    ({ body, mimeType, renderAsTextFile, renderAsPdfFile, children, format, formatted_body, filename, htmlReactParserOptions, ...props }, ref) => (
        <Box direction="Column" gap="300" {...props} ref={ref}>
            {(READABLE_TEXT_MIME_TYPES.includes(mimeType) ||
                READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)]) &&
                renderAsTextFile()}
            {mimeType === 'application/pdf' && renderAsPdfFile()}
            {children}
        </Box>
    )
);
