import React, { useEffect } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { MembersDrawer } from '../room/MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { ThreadView } from './ThreadView';
import { useThread } from '../../hooks/useThread';

export function Thread() {
    const { eventId, threadId } = useParams();
    const room = useRoom();
    const thread = useThread();

    const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
    const screenSize = useScreenSizeContext();
    const powerLevels = usePowerLevels(room);

    return (
        <PowerLevelsContextProvider value={powerLevels}>
            <Box grow="Yes">
                <ThreadView room={room} thread={thread} eventId={eventId} />
                {screenSize === ScreenSize.Desktop && isDrawer && (
                    <>
                        <Line variant="Background" direction="Vertical" size="300" />
                        <MembersDrawer key={room.roomId} room={room} />
                    </>
                )}
            </Box>
        </PowerLevelsContextProvider>
    );
}
