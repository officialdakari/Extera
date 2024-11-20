import React, { ReactNode, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

import * as css from './Modal.css';
import { ModalsType } from '../../hooks/useModals';
import Icon from '@mdi/react';
import { mdiClose, mdiOpenInNew } from '@mdi/js';
import { AppBar, Fab, IconButton, Paper, Toolbar, Typography } from '@mui/material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { BrowseGallery, Minimize } from '@mui/icons-material';

type ModalsProps = {
    modals: ModalsType;
};

type ModalDimensions = {
    [key: string]: { width: number; height: number };
};

type ModalWrapperProps = {
    dimensions: ModalDimensions;
    onResize: (id: string) => any;
    hidden: boolean;
    id: string;
    children: ReactNode;
};

function ModalWrapper({ children, dimensions, onResize, id, hidden }: ModalWrapperProps) {
    const screenSize = useScreenSize();
    return screenSize === ScreenSize.Mobile
        ? (
            <div className={css.MobileModal}>
                <Paper sx={{ bgcolor: 'background.paper', display: hidden ? 'none' : 'flex', height: '100%' }}>
                    {children}
                </Paper>
            </div>
        ) : (
            <Draggable
                defaultPosition={{ x: 0, y: 0 }}
                handle='.modal-header'
            >
                <div key={id} className={css.DraggableContainer} style={{ display: hidden ? 'none' : 'flex' }}>
                    <Resizable
                        width={dimensions[id]?.width || 500}
                        height={dimensions[id]?.height || 300}
                        onResize={onResize(id)}
                        minConstraints={[300, 200]}
                    >
                        <div style={{
                            width: `${dimensions[id]?.width || 500}px`,
                            height: `${dimensions[id]?.height || 300}px`
                        }}>
                            <Paper sx={{ bgcolor: 'background.paper', height: '100%' }}>
                                {children}
                            </Paper>
                        </div>
                    </Resizable>
                </div>
            </Draggable >
        );
}

export function Modals({ modals }: ModalsProps) {
    const [record, setRecord] = useState(modals.record);
    const [dimensions, setDimensions] = useState<ModalDimensions>({});
    const appBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecord(modals.record);
        // Initialize dimensions for new modals
        const newDimensions = { ...dimensions };
        if (record)
            Object.keys(record).forEach(id => {
                if (!newDimensions[id]) {
                    newDimensions[id] = { width: 500, height: 300 };
                }
            });
        setDimensions(newDimensions);
    }, [modals.record]);

    const onResize = (id: string) => (event: any, { size }: any) => {
        setDimensions(prev => ({
            ...prev,
            [id]: { width: size.width, height: size.height }
        }));
    };

    return (
        <>
            {record && Object.entries(record).map(
                ([id, content]) => (
                    <>
                        {content.hidden && (
                            <Draggable>
                                <div className={css.DraggableButton}>
                                    <Fab onClick={() => modals.showModal(id)}>
                                        <Typography variant='h6'>
                                            {(content.title || 'Modal')[0]}
                                        </Typography>
                                    </Fab>
                                </div>
                            </Draggable>
                        )}
                        <ModalWrapper dimensions={dimensions} hidden={content.hidden || false} id={id} onResize={onResize}>
                            <AppBar ref={appBarRef} className='modal-header' position='relative'>
                                <Toolbar variant='dense'>
                                    <Typography variant='h6' component='div' flexGrow={1}>
                                        {content.title ?? 'Modal'}
                                    </Typography>
                                    {content.externalUrl && (
                                        <IconButton onClick={() => window.open(content.externalUrl, '_blank')}>
                                            <Icon size={1} path={mdiOpenInNew} />
                                        </IconButton>
                                    )}
                                    <IconButton onClick={() => modals.hideModal(id)}>
                                        <Minimize />
                                    </IconButton>
                                    {content.allowClose && (
                                        <IconButton onClick={() => modals.removeModal(id)}>
                                            <Icon size={1} path={mdiClose} />
                                        </IconButton>
                                    )}
                                </Toolbar>
                            </AppBar>
                            <div style={{ overflow: 'hidden', height: '100%', maxHeight: `${(dimensions[id]?.height || 300) - (appBarRef.current?.clientHeight || 10)}px`, width: '100%' }}>
                                {content.node}
                            </div>
                        </ModalWrapper>
                    </>
                )
            )}
        </>
    );
}
