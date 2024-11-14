/* eslint-disable no-param-reassign */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import {
    Box,
    Scroll,
    Text,
    as,
} from 'folds';
import * as css from './PdfViewer.css';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useZoom } from '../../hooks/useZoom';
import { createPage, usePdfDocumentLoader, usePdfJSLoader } from '../../plugins/pdfjs-dist';
import { getText } from '../../../lang';
import { saveFile } from '../../utils/saveFile';
import Icon from '@mdi/react';
import { mdiDownload, mdiMinus, mdiOpenInNew, mdiPlus } from '@mdi/js';
import { AppBar, Button, Chip, CircularProgress, IconButton, Pagination, Toolbar, Typography } from '@mui/material';
import { ArrowBack, Close, Replay } from '@mui/icons-material';

export type PdfViewerProps = {
    name: string;
    src: string;
    requestClose: () => void;
    openInNew?: () => void;
    seperateWindow?: boolean;
};

export const PdfViewer = as<'div', PdfViewerProps>(
    ({ className, name, src, requestClose, seperateWindow, openInNew, ...props }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const scrollRef = useRef<HTMLDivElement>(null);
        const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);

        const [pdfJSState, loadPdfJS] = usePdfJSLoader();
        const [docState, loadPdfDocument] = usePdfDocumentLoader(
            pdfJSState.status === AsyncStatus.Success ? pdfJSState.data : undefined,
            src
        );
        const isLoading =
            pdfJSState.status === AsyncStatus.Loading || docState.status === AsyncStatus.Loading;
        const isError =
            pdfJSState.status === AsyncStatus.Error || docState.status === AsyncStatus.Error;
        const [pageNo, setPageNo] = useState(1);

        useEffect(() => {
            loadPdfJS();
        }, [loadPdfJS]);
        useEffect(() => {
            if (pdfJSState.status === AsyncStatus.Success) {
                loadPdfDocument();
            }
        }, [pdfJSState, loadPdfDocument]);

        useEffect(() => {
            if (docState.status === AsyncStatus.Success) {
                const doc = docState.data;
                if (pageNo < 0 || pageNo > doc.numPages) return;
                createPage(doc, pageNo, { scale: zoom }).then((canvas) => {
                    const container = containerRef.current;
                    if (!container) return;
                    container.textContent = '';
                    container.append(canvas);
                    scrollRef.current?.scrollTo({
                        top: 0,
                    });
                });
            }
        }, [docState, pageNo, zoom]);

        const handleDownload = () => {
            saveFile(src, name);
        };

        return (
            <Box className={classNames(css.PdfViewer, className)} direction="Column" {...props} ref={ref}>
                <AppBar position='static'>
                    <Toolbar>
                        <IconButton onClick={requestClose}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant='h6' component='div' flexGrow={1} overflow='hidden' maxHeight='1.5em'>
                            {name}
                        </Typography>
                        <Box gap='100'>
                            {!seperateWindow && (
                                <IconButton
                                    onClick={openInNew}
                                >
                                    <Icon size={1} path={mdiOpenInNew} />
                                </IconButton>
                            )}
                            <IconButton
                                onClick={zoomOut}
                                aria-label={getText('aria.zoom_out')}
                            >
                                <Icon size={1} path={mdiMinus} />
                            </IconButton>
                            <IconButton
                                onClick={zoomIn}
                                aria-label={getText('aria.zoom_in')}
                            >
                                <Icon size={1} path={mdiPlus} />
                            </IconButton>
                            <IconButton
                                onClick={handleDownload}
                                aria-label={getText('btn.download')}
                            >
                                <Icon size={1} path={mdiDownload} />
                            </IconButton>
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="200">
                    {isLoading && <CircularProgress />}
                    {isError && (
                        <>
                            <Text>{getText('Failed to load PDF')}</Text>
                            <Button
                                color='error'
                                startIcon={<Replay />}
                                onClick={loadPdfJS}
                            >
                                {getText('btn.retry')}
                            </Button>
                        </>
                    )}
                    {docState.status === AsyncStatus.Success && (
                        <Scroll
                            ref={scrollRef}
                            size="300"
                            direction="Both"
                            variant="Surface"
                            visibility="Hover"
                        >
                            <Box>
                                <div className={css.PdfViewerContent} ref={containerRef} />
                            </Box>
                        </Scroll>
                    )}
                </Box>
                {docState.status === AsyncStatus.Success && (
                    <Pagination
                        count={docState.data.numPages}
                        defaultPage={pageNo}
                        onChange={(ev, page) => setPageNo(page)}
                    />
                )}
            </Box>
        );
    }
);
