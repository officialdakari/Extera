import React, { useCallback, useEffect, useState } from 'react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { Box, Button } from 'folds';
import Icon from '@mdi/react';
import { mdiMessageOutline } from '@mdi/js';
import { translate } from '../../../../lang';

type ThreadPreviewProps = {
    mEvent: MatrixEvent;
    room: Room;
    onClick?: () => void;
};
export function ThreadPreview({ mEvent, room, onClick }: ThreadPreviewProps) {
    return null;
    const mx = useMatrixClient();
    const eventId = mEvent.getId();
    console.debug(`!!!!`, eventId);
    if (!eventId) return null;
    const [showButton, setShowButton] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const update = useCallback(async () => {
        const thread = room.getThreads().find((thread) => thread.rootEvent?.getId() === mEvent.getId())
        const count = thread?.liveTimeline?.getEvents().length;
        if (!count) {
            setShowButton(false);
        } else {
            setShowButton(true);
            setMessageCount(count);
        }
    }, [mx, mEvent, room, setShowButton, setMessageCount]);

    useEffect(() => {
        update().catch(console.error);
    }, [update]);
    return showButton && (
        <Button
            fill='Soft'
            variant='Secondary'
            style={{ textAlign: 'end' }}
            size='300'
            before={<Icon size={1} path={mdiMessageOutline} />}
        >
            {translate(
                'btn.thread',
                <b>{messageCount}</b>
            )}
        </Button>
    );
}