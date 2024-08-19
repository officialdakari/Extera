import { Box, config, Header, IconButton, Modal, Text } from 'folds';
import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';

import * as css from './Modal.css';
import { ModalsType } from '../../hooks/useModals';
import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';

type ModalsProps = {
    modals: ModalsType;
};

export function Modals({ modals }: ModalsProps) {
    const [record, setRecord] = useState(modals.record);

    useEffect(() => {
        console.debug('UPDATE !!! ');
        setRecord(modals.record);
    }, [modals.record]);

    return (
        <>
            {record && Object.entries(record).map(
                ([id, content]) => (
                    <Draggable
                     
                        defaultPosition={{ x: 0, y: 0 }}
                        handle='.modal-header'
                    >
                        <div className={css.DraggableContainer}>
                            <Modal variant="Surface" size="500">
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
                                        content.allowClose && (
                                            <IconButton size="300" onClick={() => modals.removeModal(id)} radii="300">
                                                <Icon size={1} path={mdiClose} />
                                            </IconButton>
                                        )
                                    }
                                </Header>
                                {content.node}
                            </Modal>
                        </div>
                    </Draggable>
                )
            )}
        </>
    );
}