import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

import * as css from './Modal.css';
import { ModalsType } from '../../hooks/useModals';
import Icon from '@mdi/react';
import { mdiClose, mdiOpenInNew } from '@mdi/js';
import { AppBar, IconButton, Paper, Toolbar, Typography } from '@mui/material';

type ModalsProps = {
    modals: ModalsType;
};

type ModalDimensions = {
    [key: string]: { width: number; height: number };
};

export function Modals({ modals }: ModalsProps) {
    const [record, setRecord] = useState(modals.record);
    const [dimensions, setDimensions] = useState<ModalDimensions>({});

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
                    <Draggable
                        defaultPosition={{ x: 0, y: 0 }}
                        handle='.modal-header'
                    >
                        <div key={id} className={css.DraggableContainer}>
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
                                    <Paper sx={{ bgcolor: 'background.paper' }}>
                                        <AppBar className='modal-header' position='relative'>
                                            <Toolbar variant='dense'>
                                                <Typography variant='h6' component='div' flexGrow={1}>
                                                    {content.title ?? 'Modal'}
                                                </Typography>
                                                {
                                                    content.externalUrl && (
                                                        <IconButton onClick={() => window.open(content.externalUrl, '_blank')}>
                                                            <Icon size={1} path={mdiOpenInNew} />
                                                        </IconButton>
                                                    )
                                                }
                                                {
                                                    content.allowClose && (
                                                        <IconButton onClick={() => modals.removeModal(id)}>
                                                            <Icon size={1} path={mdiClose} />
                                                        </IconButton>
                                                    )
                                                }
                                            </Toolbar>
                                        </AppBar>
                                    </Paper>
                                    <div style={{ overflow: 'auto', height: '100%', width: '100%' }}>
                                        {content.node}
                                    </div>
                                </div>
                            </Resizable>
                        </div>
                    </Draggable>
                )
            )}
        </>
    );
}
