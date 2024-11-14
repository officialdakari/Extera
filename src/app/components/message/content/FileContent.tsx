import React, { ReactNode, useCallback, useState } from 'react';
import {
    Box,
    Text,
    as,
} from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
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
import { HTMLReactParserOptions } from 'html-react-parser';
import { getText } from '../../../../lang';
import { saveFile } from '../../../utils/saveFile';
import { Button, Dialog, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { BackButtonHandler } from '../../../hooks/useBackButton';
import { useModals } from '../../../hooks/useModals';
import { v4 } from 'uuid';

const renderErrorButton = (retry: () => void, text: string) => (
    <Tooltip title={getText('msg.file.failed')}>
        <Button
            onClick={retry}
            color='error'
            variant='outlined'
        >
            {text}
        </Button>
    </Tooltip>
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
                <Dialog
                    open={textViewer}
                    onClose={() => setTextViewer(false)}
                >
                    {textViewer && <BackButtonHandler callback={() => setTextViewer(false)} id='file-viewer' />}
                    {renderViewer({
                        name: filename ?? body,
                        text: textState.data,
                        langName: READABLE_TEXT_MIME_TYPES.includes(mimeType)
                            ? mimeTypeToExt(mimeType)
                            : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)] ?? mimeType),
                        requestClose: () => setTextViewer(false),
                    })}
                </Dialog>
            )}
            {textState.status === AsyncStatus.Error ? (
                renderErrorButton(loadText, getText('btn.open_file'))
            ) : (
                <LoadingButton
                    variant='contained'
                    color='primary'
                    onClick={() =>
                        textState.status === AsyncStatus.Success ? setTextViewer(true) : loadText()
                    }
                    loading={textState.status === AsyncStatus.Loading}
                >
                    {getText('btn.open_file')}
                </LoadingButton>
            )}
        </>
    );
}

type RenderPdfViewerProps = {
    name: string;
    src: string;
    requestClose: () => void;
    openInNew?: () => void;
    seperateWindow?: boolean;
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
    const modals = useModals();

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
                <Dialog
                    open={pdfViewer}
                    onClose={() => setPdfViewer(false)}
                >
                    <BackButtonHandler id='pdf-viewr' callback={() => setPdfViewer(false)} />
                    {renderViewer({
                        name: filename ?? body,
                        src: pdfState.data,
                        requestClose: () => setPdfViewer(false),
                        openInNew: () => {
                            const id = v4();
                            modals.addModal({
                                node: renderViewer({ name: filename || body, src: pdfState.data, seperateWindow: true, requestClose: () => modals.removeModal(id) }),
                                allowClose: true,
                                title: 'PDF Viewer'
                            });
                        }
                    })}
                </Dialog>
            )}
            {pdfState.status === AsyncStatus.Error ? (
                renderErrorButton(loadPdf, getText('btn.open_pdf'))
            ) : (
                <LoadingButton
                    variant='contained'
                    color='secondary'
                    onClick={() => (pdfState.status === AsyncStatus.Success ? setPdfViewer(true) : loadPdf())}
                    loading={pdfState.status === AsyncStatus.Loading}
                >
                    <Text size="B400">
                        {getText('btn.open_pdf')}
                    </Text>
                </LoadingButton>
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
            <LoadingButton
                color='success'
                variant='outlined'
                onClick={() =>
                    downloadState.status === AsyncStatus.Success
                        ? saveFile(downloadState.data, filename ?? body)
                        : download()
                }
                loading={downloadState.status === AsyncStatus.Loading}
            >
                {getText('btn.download_size', bytesToSize(info.size ?? 0))}
            </LoadingButton>
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
