/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Chip, Header, IconButton, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { usePan } from '../../hooks/usePan';
import { getText } from '../../../lang';
import { useBackButton } from '../../hooks/useBackButton';
import { saveFile } from '../../utils/saveFile';
import Icon from '@mdi/react';
import { mdiArrowLeft, mdiDownload, mdiMinus, mdiPlus } from '@mdi/js';

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

        useBackButton(() => {
            requestClose();
        });

        return (
            <Box
                className={classNames(css.ImageViewer, className)}
                direction="Column"
                {...props}
                ref={ref}
            >
                <Header className={css.ImageViewerHeader} size="400">
                    <Box grow="Yes" alignItems="Center" gap="200">
                        <IconButton size="300" radii="300" onClick={requestClose}>
                            <Icon size={1} path={mdiArrowLeft} />
                        </IconButton>
                        <Text size="T300" truncate>
                            {alt}
                        </Text>
                    </Box>
                    <Box shrink="No" alignItems="Center" gap="200">
                        <IconButton
                            variant={zoom < 1 ? 'Success' : 'SurfaceVariant'}
                            outlined={zoom < 1}
                            size="300"
                            radii="Pill"
                            onClick={zoomOut}
                            aria-label={getText('aria.zoom_out')}
                        >
                            <Icon size={1} path={mdiMinus} />
                        </IconButton>
                        <Chip variant="SurfaceVariant" radii="Pill" onClick={() => setZoom(zoom === 1 ? 2 : 1)}>
                            <Text size="B300">{Math.round(zoom * 100)}%</Text>
                        </Chip>
                        <IconButton
                            variant={zoom > 1 ? 'Success' : 'SurfaceVariant'}
                            outlined={zoom > 1}
                            size="300"
                            radii="Pill"
                            onClick={zoomIn}
                            aria-label={getText('aria.zoom_in')}
                        >
                            <Icon size={1} path={mdiPlus} />
                        </IconButton>
                        <Chip
                            variant="Primary"
                            onClick={handleDownload}
                            radii="300"
                            before={<Icon size={1} path={mdiDownload} />}
                        >
                            <Text size="B300">{getText('btn.download')}</Text>
                        </Chip>
                    </Box>
                </Header>
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