import { Box, config, Header, IconButton, Modal, Text } from 'folds';
import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

import * as css from './Modal.css';
import { ModalsType } from '../../hooks/useModals';
import Icon from '@mdi/react';
import { mdiClose, mdiOpenInNew } from '@mdi/js';

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
        console.debug('UPDATE !!! ');
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
                    <div key={id} className={css.DraggableContainer}>
                        <Draggable
                            defaultPosition={{ x: 0, y: 0 }}
                            handle='.modal-header'
                        >
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
                                    <Modal variant="Surface" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100' }}>
                                        <Header
                                            className='modal-header'
                                            style={{
                                                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                                borderBottomWidth: config.borderWidth.B300,
                                            }}
                                            variant="Surface"
                                            size="500"
                                        >
                                            <Box grow="Yes">
                                                <Text size="H4">{content.title ?? 'Modal'}</Text>
                                            </Box>
                                            {
                                                content.externalUrl && (
                                                    <IconButton size="300" onClick={() => window.open(content.externalUrl, '_blank')} radii="300">
                                                        <Icon size={1} path={mdiOpenInNew} />
                                                    </IconButton>
                                                )
                                            }
                                            {
                                                content.allowClose && (
                                                    <IconButton size="300" onClick={() => modals.removeModal(id)} radii="300">
                                                        <Icon size={1} path={mdiClose} />
                                                    </IconButton>
                                                )
                                            }
                                        </Header>
                                        <div style={{ overflow: 'auto', height: '100%', width: '100%' }}>
                                            {content.node}
                                        </div>
                                    </Modal>
                                </div>
                            </Resizable>
                        </Draggable>
                    </div>
                )
            )}
        </>
    );
}
