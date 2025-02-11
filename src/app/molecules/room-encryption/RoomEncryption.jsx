import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomEncryption.scss';
import { Switch } from '@mui/material';
import { EventTimeline } from 'matrix-js-sdk';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import SettingTile from '../setting-tile/SettingTile';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import { getText } from '../../../lang';
import { getStateEvents } from '../../utils/room';

function RoomEncryption({ roomId }) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    const encryptionEvents = getStateEvents(room, 'm.room.encryption');
    const [isEncrypted, setIsEncrypted] = useState(encryptionEvents.length > 0);
    const canEnableEncryption = room.getLiveTimeline().getState(EventTimeline.FORWARDS).maySendStateEvent('m.room.encryption', mx.getUserId());

    const handleEncryptionEnable = async () => {
        const joinRule = room.getJoinRule();
        const title = getText('dialog.room_encryption.title');
        const confirmMsg1 = getText('room_encryption.confirm.1');
        const confirmMsg2 = getText('room_encryption.confirm.2');

        const isConfirmed1 = (joinRule === 'public')
            ? await confirmDialog(title, confirmMsg1, getText('btn.dialog.room_encryption.1'), 'caution')
            : true;
        if (!isConfirmed1) return;
        if (await confirmDialog(title, confirmMsg2, getText('btn.dialog.room_encryption.2'), 'caution')) {
            setIsEncrypted(true);
            mx.sendStateEvent(roomId, 'm.room.encryption', {
                algorithm: 'm.megolm.v1.aes-sha2'
            });
        }
    };

    return (
        <div className="room-encryption">
            <SettingTile
                title={getText('room_encryption.setting.title')}
                content={(
                    <Text variant="b3">{getText('room_encryption.setting.tip')}</Text>
                )}
                options={(
                    <Switch
                        checked={isEncrypted}
                        onClick={handleEncryptionEnable}
                        disabled={isEncrypted || !canEnableEncryption}
                    />
                )}
            />
        </div>
    );
}

RoomEncryption.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomEncryption;
