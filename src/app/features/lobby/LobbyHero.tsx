import React from 'react';
import { Avatar, Text } from 'folds';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { useSpace } from '../../hooks/useSpace';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import * as css from './LobbyHero.css';
import { PageHero } from '../../components/page';
import { onEnterOrSpace } from '../../utils/keyboard';
import { Dialog } from '@mui/material';
import { BackButtonHandler } from '../../hooks/useBackButton';
import { mxcUrlToHttp } from '../../utils/matrix';

export function LobbyHero() {
    const mx = useMatrixClient();
    const space = useSpace();

    const name = useRoomName(space);
    const topic = useRoomTopic(space);
    const avatarMxc = useRoomAvatar(space);
    const avatarUrl = avatarMxc ? mxcUrlToHttp(mx, avatarMxc, 96, 96, 'crop') ?? undefined : undefined;

    return (
        <PageHero
            icon={
                <Avatar size="500">
                    <RoomAvatar
                        roomId={space.roomId}
                        src={avatarUrl}
                        alt={name}
                        renderFallback={() => <Text size="H4">{nameInitials(name)}</Text>}
                    />
                </Avatar>
            }
            title={name}
            subTitle={
                topic && (
                    <UseStateProvider initial={false}>
                        {(viewTopic, setViewTopic) => (
                            <>
                                <Dialog
                                    open={viewTopic}
                                    onClose={() => setViewTopic(false)}
                                >
                                    <BackButtonHandler id='space-topic' callback={() => setViewTopic(false)} />
                                    <RoomTopicViewer
                                        name={name}
                                        topic={topic}
                                        requestClose={() => setViewTopic(false)}
                                    />
                                </Dialog>
                                <Text
                                    as="span"
                                    onClick={() => setViewTopic(true)}
                                    onKeyDown={onEnterOrSpace(() => setViewTopic(true))}
                                    tabIndex={0}
                                    className={css.LobbyHeroTopic}
                                    size="Inherit"
                                    priority="300"
                                >
                                    {topic}
                                </Text>
                            </>
                        )}
                    </UseStateProvider>
                )
            }
        />
    );
}
