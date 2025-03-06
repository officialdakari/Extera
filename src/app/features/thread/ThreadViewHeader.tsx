import React, { useEffect, useState } from 'react';
import {
    Box,
    Avatar,
    Text,
} from 'folds';
import { useNavigate } from 'react-router-dom';

import { ArrowBack, MessageOutlined, People, Search } from '@mui/icons-material';
import { AppBar, Dialog, IconButton, Toolbar, Tooltip } from '@mui/material';
import { useStateEvent } from '../../hooks/useStateEvent';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { useSetSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
    getHomeSearchPath,
    getSpaceSearchPath,
    withSearchParam,
} from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './ThreadViewHeader.css';
import { toggleRoomSettings } from '../../../client/action/navigation';
import { useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';
import { BackRouteHandler } from '../../components/BackRouteHandler';

export function ThreadViewHeader() {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const room = useRoom();
    const space = useSpaceOptionally();

    const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
    const encryptedRoom = !!encryptionEvent;
    const name = useRoomName(room);
    const topic = useRoomTopic(room);
    const [statusMessage, setStatusMessage] = useState('');

    const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

    const handleSearchClick = () => {
        const searchParams: _SearchPathSearchParams = {
            rooms: room.roomId,
        };
        const path = space
            ? getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))
            : getHomeSearchPath();
        navigate(withSearchParam(path, searchParams));
    };

    const handleAvClick = () => {
        toggleRoomSettings(room.roomId);
    };

    const getPresenceFn = usePresences();

    useEffect(() => {
        const isDm = room.getDMInviter() || room.getJoinedMemberCount() === 2;
        if (isDm) {
            const userId = room.guessDMUserId();
            const presence = getPresenceFn(userId);
            if (presence)
                setStatusMessage(presence.presenceStatusMsg ?? presence.presence ?? 'offline');
        }
    }, [mx, room, getPresenceFn]);

    return (
        <AppBar position='static'>
            <Toolbar>
                <Box grow="Yes" gap="300">
                    <Box shrink="No">
                        <BackRouteHandler>
                            {(goBack) => (
                                <IconButton
                                    onClick={goBack}
                                >
                                    <ArrowBack />
                                </IconButton>
                            )}
                        </BackRouteHandler>
                    </Box>
                    <Box grow="Yes" alignItems="Center" gap="300">
                        <Avatar onClick={handleAvClick} size="400">
                            <MessageOutlined />
                        </Avatar>
                        <Box direction="Column">
                            <Text size={(topic ?? statusMessage) ? 'H5' : 'H3'} truncate>
                                {name}
                            </Text>
                            {(topic ?? statusMessage) && (
                                <UseStateProvider initial={false}>
                                    {(viewTopic, setViewTopic) => (
                                        <>
                                            <Dialog
                                                open={viewTopic}
                                                onClose={() => setViewTopic(false)}
                                            >
                                                <RoomTopicViewer
                                                    name={name}
                                                    topic={topic ?? statusMessage}
                                                    requestClose={() => setViewTopic(false)}
                                                />
                                            </Dialog>
                                            <Text
                                                as="button"
                                                type="button"
                                                onClick={() => setViewTopic(true)}
                                                className={css.HeaderTopic}
                                                size="T200"
                                                priority="300"
                                                truncate
                                            >
                                                {topic ?? statusMessage}
                                            </Text>
                                        </>
                                    )}
                                </UseStateProvider>
                            )}
                        </Box>
                    </Box>
                    <Box shrink="No">
                        {!encryptedRoom && (
                            <Tooltip title={getText('tooltip.search')}>
                                <IconButton onClick={handleSearchClick}>
                                    <Search />
                                </IconButton>
                            </Tooltip>
                        )}
                        {/* <Tooltip title={getText('tooltip.pinned')}>
                                <IconButton onClick={handlePinnedClick}>
                                    <PushPin />
                                </IconButton>
                            </Tooltip> */}
                        {screenSize === ScreenSize.Desktop && (
                            <Tooltip title={getText('tooltip.members')}>
                                <IconButton onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                                    <People />
                                </IconButton>
                            </Tooltip>
                        )}
                        {/* <Tooltip title={getText('tooltip.more_options')}>
                                <IconButton onClick={handleOpenMenu} aria-pressed={!!menuAnchor}>
                                    <MoreVert />
                                </IconButton>
                            </Tooltip> */}
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
}