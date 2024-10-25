/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Header, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { usePan } from '../../hooks/usePan';
import { getText } from '../../../lang';
import { useBackButton, BackButtonHandler } from '../../hooks/useBackButton';
import { saveFile } from '../../utils/saveFile';
import Icon from '@mdi/react';
import { mdiArrowLeft, mdiClose, mdiDownload, mdiMinus, mdiPlus } from '@mdi/js';
import { AppBar, Chip, DialogTitle, IconButton, Toolbar, Typography } from '@mui/material';
import { Close, Download, ZoomIn, ZoomOut } from '@mui/icons-material';

export type ImageViewerProps = {
    alt: string;
    src: string;
    requestClose: () => void;
};

export const ImageViewer = as<'div', ImageViewerProps>(
    ({ className, alt, src, requestClose, ...props }, ref) => {
        const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);
        const { pan, cursor, onMouseDown, onTouchStart } = usePan(zoom > 1);

        const handleDownload = () => {
            saveFile(src, alt);
        };

        return (
            <Box
                className={classNames(css.ImageViewer, className)}
                direction="Column"
                {...props}
                ref={ref}
            >
                <BackButtonHandler callback={requestClose} />
                <AppBar position='static'>
                    <Toolbar>
                        <IconButton onClick={requestClose}>
                            <Close />
                        </IconButton>
                        <Typography variant='h6' component='div' flexGrow={1} overflow='hidden' maxWidth='50%'>
                            {alt}
                        </Typography>
                        <Box gap='200'>
                            <IconButton
                                onClick={zoomOut}
                                aria-label={getText('aria.zoom_out')}
                                edge='end'
                            >
                                <ZoomOut />
                            </IconButton>
                            <Chip variant="outlined" onClick={() => setZoom(zoom === 1 ? 2 : 1)} label={`${Math.round(zoom * 100)}%`} />
                            <IconButton
                                onClick={zoomIn}
                                aria-label={getText('aria.zoom_in')}
                                edge='end'
                            >
                                <ZoomIn />
                            </IconButton>
                            <IconButton
                                aria-label={getText('btn.download')}
                                onClick={handleDownload}
                                edge='end'
                            >
                                <Download />
                            </IconButton>
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box
                    grow="Yes"
                    className={css.ImageViewerContent}
                    justifyContent="Center"
                    alignItems="Center"
                >
                    <img
                        className={css.ImageViewerImg}
                        style={{
                            cursor,
                            transform: `scale(${zoom}) translate(${pan.translateX}px, ${pan.translateY}px)`,
                        }}
                        src={src}
                        alt={alt}
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                    />
                </Box>
            </Box>
        );
    }
);