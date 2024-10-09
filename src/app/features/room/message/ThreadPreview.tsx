import React, { useCallback, useEffect, useState } from 'react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import Icon from '@mdi/react';
import { mdiMessageOutline } from '@mdi/js';
import { translate } from '../../../../lang';
import { Button, Divider, Typography } from '@mui/material';
import { MessageOutlined } from '@mui/icons-material';

type ThreadPreviewProps = {
    mEvent: MatrixEvent;
    room: Room;
    onClick?: () => void;
};
export function ThreadPreview({ mEvent, room, onClick }: ThreadPreviewProps) {
    const mx = useMatrixClient();
    const eventId = mEvent.getId();
    if (!eventId) return null;
    const [showButton, setShowButton] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const update = useCallback(() => {
        const thread = room.getThreads().find((thread) =>
            thread.rootEvent?.getId() === eventId);
        const count = thread?.liveTimeline?.getEvents().length;
        if (!count) {
            setShowButton(false);
        } else {
            setShowButton(true);
            setMessageCount(count);
        }
    }, [mx, mEvent, room, setShowButton, setMessageCount]);

    useEffect(() => {
        update();
    }, [update]);
    return showButton && (
        <div style={{ marginTop: '1rem', gap: '1rem' }}>
            <Divider />
            <Button
                color='secondary'
                fullWidth
                startIcon={<MessageOutlined />}
                onClick={onClick}
            >
                <Typography>
                    {translate(
                        'btn.thread',
                        messageCount
                    )}
                </Typography>
            </Button>
        </div>
    );
}