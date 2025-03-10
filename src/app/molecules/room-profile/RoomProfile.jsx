import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAtomValue } from 'jotai';
import Linkify from 'linkify-react';
import './RoomProfile.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import ImageUpload from '../image-upload/ImageUpload';

import { useStore } from '../../hooks/useStore';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import { mDirectAtom } from '../../state/mDirectList';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { getText } from '../../../lang';
import { mdiPencil } from '@mdi/js';
import { Button, IconButton, TextField } from '@mui/material';
import { Edit } from '@mui/icons-material';

function RoomProfile({ roomId, isEditing, setIsEditing }) {
    const isMountStore = useStore();
    const [, forceUpdate] = useForceUpdate();
    const [status, setStatus] = useState({
        msg: null,
        type: cons.status.PRE_FLIGHT,
    });

    const mx = initMatrix.matrixClient;
    const mDirects = useAtomValue(mDirectAtom);
    const isDM = mDirects.has(roomId);
    let avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
    avatarSrc = isDM
        ? mx.getRoom(roomId).getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop')
        : avatarSrc;
    const room = mx.getRoom(roomId);
    const { currentState } = room;
    const roomName = room.name;
    const roomTopic = currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;

    const userId = mx.getUserId();

    const canChangeAvatar = currentState.maySendStateEvent('m.room.avatar', userId);
    const canChangeName = currentState.maySendStateEvent('m.room.name', userId);
    const canChangeTopic = currentState.maySendStateEvent('m.room.topic', userId);
    const canChangeBanner = currentState.maySendStateEvent('page.codeberg.everypizza.room.banner', userId);

    useEffect(() => {
        isMountStore.setItem(true);
        const handleStateEvent = (mEvent) => {
            if (mEvent.event.room_id !== roomId) return;
            forceUpdate();
        };

        mx.on('RoomState.events', handleStateEvent);
        return () => {
            mx.removeListener('RoomState.events', handleStateEvent);
            isMountStore.setItem(false);
            setStatus({
                msg: null,
                type: cons.status.PRE_FLIGHT,
            });
            setIsEditing(false);
        };
    }, [roomId]);

    const handleOnSubmit = async (e) => {
        e.preventDefault();
        const { target } = e;
        const roomNameInput = target.elements['room-name'];
        const roomTopicInput = target.elements['room-topic'];

        try {
            if (canChangeName) {
                const newName = roomNameInput.value;
                if (newName !== roomName && roomName.trim() !== '') {
                    setStatus({
                        msg: getText('room_profile.saving_name'),
                        type: cons.status.IN_FLIGHT,
                    });
                    await mx.setRoomName(roomId, newName);
                }
            }
            if (canChangeTopic) {
                const newTopic = roomTopicInput.value;
                if (newTopic !== roomTopic) {
                    if (isMountStore.getItem()) {
                        setStatus({
                            msg: getText('room_profile.saving_topic'),
                            type: cons.status.IN_FLIGHT,
                        });
                    }
                    await mx.setRoomTopic(roomId, newTopic);
                }
            }
            if (!isMountStore.getItem()) return;
            setStatus({
                msg: getText('room_profile.saved'),
                type: cons.status.SUCCESS,
            });
        } catch (err) {
            if (!isMountStore.getItem()) return;
            setStatus({
                msg: err.message || getText('error.room_profile'),
                type: cons.status.ERROR,
            });
        }
    };

    const handleCancelEditing = () => {
        setStatus({
            msg: null,
            type: cons.status.PRE_FLIGHT,
        });
        setIsEditing(false);
    };

    const handleAvatarUpload = async (url) => {
        if (url === null) {
            const isConfirmed = await confirmDialog(
                getText('confirm.remove_room_avatar.title'),
                getText('confirm.remove_room_avatar.desc'),
                getText('btn.remove_room_avatar'),
                'caution'
            );
            if (isConfirmed) {
                await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
            }
        } else await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
    };

    const renderEditNameAndTopic = () => (
        <form className="room-profile__edit-form" onSubmit={handleOnSubmit}>
            {canChangeName && (
                <TextField
                    defaultValue={roomName}
                    name="room-name"
                    disabled={status.type === cons.status.IN_FLIGHT}
                    label="Name"
                    fullWidth
                />
            )}
            {canChangeTopic && (
                <TextField
                    defaultValue={roomTopic}
                    name="room-topic"
                    disabled={status.type === cons.status.IN_FLIGHT}
                    minHeight={100}
                    fullWidth
                    multiline
                    label="Topic"
                />
            )}
            {(!canChangeName || !canChangeTopic) && (
                <Text variant="b3">{
                    getText(
                        'room_profile.only',
                        getText(room.isSpaceRoom() ? 'room_profile.only.space' : 'room_profile.only.room'),
                        getText(canChangeName ? 'room_profile.only.name' : 'room_profile.only.topic')
                    )
                }</Text>
            )}
            {status.type === cons.status.IN_FLIGHT && <Text variant="b2">{status.msg}</Text>}
            {status.type === cons.status.SUCCESS && (
                <Text style={{ color: 'var(--tc-positive-high)' }} variant="b2">
                    {status.msg}
                </Text>
            )}
            {status.type === cons.status.ERROR && (
                <Text style={{ color: 'var(--tc-danger-high)' }} variant="b2">
                    {status.msg}
                </Text>
            )}
            {status.type !== cons.status.IN_FLIGHT && (
                <div>
                    <Button type="submit" variant='contained' color="primary">
                        {getText('btn.room_profile.save')}
                    </Button>
                    <Button onClick={handleCancelEditing}>{getText('btn.cancel')}</Button>
                </div>
            )}
        </form>
    );

    const renderNameAndTopic = () => (
        <div
            className="room-profile__display"
            style={{ marginBottom: avatarSrc && canChangeAvatar ? '24px' : '0' }}
        >
            <div>
                <Text variant="h2" weight="medium" primary>
                    {roomName}
                </Text>
                {/* {(canChangeName || canChangeTopic) && (
                    <IconButton
                        size="small"
                        tooltip="Edit"
                        onClick={() => setIsEditing(true)}
                    >
                        <Edit />
                    </IconButton>
                )} */}
            </div>
            <Text variant="b3">{room.getCanonicalAlias() || room.roomId}</Text>
            {/* {roomTopic && (
                <Text variant="b2">
                    <Linkify options={LINKIFY_OPTS}>{roomTopic}</Linkify>
                </Text>
            )} */}
        </div>
    );

    return (
        <div className="room-profile">
            <div className="room-profile__content">
                {(!canChangeAvatar || !isEditing) && (
                    <Avatar imageSrc={avatarSrc} text={roomName} bgColor={colorMXID(roomId)} size="large" />
                )}
                {canChangeAvatar && isEditing && (
                    <ImageUpload
                        text={roomName}
                        bgColor={colorMXID(roomId)}
                        imageSrc={avatarSrc}
                        onUpload={handleAvatarUpload}
                        onRequestRemove={() => handleAvatarUpload(null)}
                    />
                )}
                {!isEditing && renderNameAndTopic()}
                {isEditing && renderEditNameAndTopic()}
            </div>
        </div>
    );
}

RoomProfile.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomProfile;
