import React, { useEffect } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';

export function Room() {
    const { eventId, threadRootId } = useParams();
    const room = useRoom();

    const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
    const screenSize = useScreenSizeContext();
    const powerLevels = usePowerLevels(room);

    useEffect(() => {

    }, [threadRootId]);

    return (
        <PowerLevelsContextProvider value={powerLevels}>
            <Box grow="Yes">
                <RoomView room={room} eventId={eventId !== 'thread' ? eventId : undefined} threadRootId={threadRootId} />
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
