import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomPermissions.scss';

import initMatrix from '../../../client/initMatrix';
import { getPowerLabel } from '../../../util/matrixUtil';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import PowerLevelSelector from '../power-level-selector/PowerLevelSelector';
import SettingTile from '../setting-tile/SettingTile';


import { useForceUpdate } from '../../hooks/useForceUpdate';
import { getText } from '../../../lang';
import { mdiChevronDown } from '@mdi/js';

const permissionsInfo = {
    users_default: {
        name: getText('perms.default.title'),
        description: getText('perms.default.desc'),
        default: 0,
    },
    events_default: {
        name: getText('perms.send.title'),
        description: getText('perms.send.desc'),
        default: 0,
    },
    'm.reaction': {
        parent: 'events',
        name: getText('perms.react.title'),
        description: getText('perms.react.desc'),
        default: 0,
    },
    redact: {
        name: getText('perms.redact.title'),
        description: getText('perms.redact.desc'),
        default: 50,
    },
    'm.room.redaction': {
        parent: 'events',
        name: getText('perms.redact_own.title'),
        description: getText('perms.redact_own.desc'),
        default: 0,
    },
    notifications: {
        name: getText('perms.ping_room.title'),
        description: getText('perms.ping_room.desc'),
        default: {
            room: 50,
        },
    },
    'm.space.child': {
        parent: 'events',
        name: getText('perms.manage_rooms.title'),
        description: getText('perms.manage_rooms.desc'),
        default: 50,
    },
    invite: {
        name: getText('perms.invite.title'),
        description: getText('perms.invite.desc'),
        default: 50,
    },
    kick: {
        name: getText('perms.kick.title'),
        description: getText('perms.kick.desc'),
        default: 50,
    },
    ban: {
        name: getText('perms.ban.title'),
        description: getText('perms.ban.desc'),
        default: 50,
    },
    'm.room.avatar': {
        parent: 'events',
        name: getText('perms.avatar.title'),
        description: getText('perms.avatar.desc'),
        default: 50,
    },
    'm.room.name': {
        parent: 'events',
        name: getText('perms.name.title'),
        description: getText('perms.name.desc'),
        default: 50,
    },
    'm.room.topic': {
        parent: 'events',
        name: getText('perms.topic.title'),
        description: getText('perms.topic.desc'),
        default: 50,
    },
    state_default: {
        name: getText('perms.state.title'),
        description: getText('perms.state.desc'),
        default: 50,
    },
    'm.room.canonical_alias': {
        parent: 'events',
        name: getText('perms.canonical.title'),
        description: getText('perms.canonical.desc'),
        default: 50,
    },
    'm.room.power_levels': {
        parent: 'events',
        name: getText('perms.power_levels.title'),
        description: getText('perms.power_levels.desc'),
        default: 50,
    },
    'm.room.encryption': {
        parent: 'events',
        name: getText('perms.encryption.title'),
        description: getText('perms.encryption.desc'),
        default: 100,
    },
    'm.room.history_visibility': {
        parent: 'events',
        name: getText('perms.history.title'),
        description: getText('perms.history.desc'),
        default: 100,
    },
    'm.room.tombstone': {
        parent: 'events',
        name: getText('perms.tombstone.title'),
        description: getText('perms.tombstone.desc'),
        default: 100,
    },
    'm.room.pinned_events': {
        parent: 'events',
        name: getText('perms.pinned.title'),
        description: getText('perms.pinned.desc'),
        default: 50,
    },
    'm.room.server_acl': {
        parent: 'events',
        name: getText('perms.server_acl.title'),
        description: getText('perms.server_acl.desc'),
        default: 100,
    },
    'im.vector.modular.widgets': {
        parent: 'events',
        name: getText('perms.widgets.title'),
        description: getText('perms.widgets.desc'),
        default: 50,
    },
};

const roomPermsGroups = {
    [getText('room_perms.general')]: ['users_default', 'events_default', 'm.reaction', 'redact', 'm.room.redaction', 'notifications'],
    [getText('room_perms.members')]: ['invite', 'kick', 'ban'],
    [getText('room_perms.room_profile')]: ['m.room.avatar', 'm.room.name', 'm.room.topic'],
    [getText('room_perms.settings')]: ['state_default', 'm.room.canonical_alias', 'm.room.power_levels', 'm.room.encryption', 'm.room.history_visibility'],
    [getText('room_perms.other')]: ['m.room.tombstone', 'm.room.pinned_events', 'm.room.server_acl', 'im.vector.modular.widgets'],
};

const spacePermsGroups = {
    [getText('room_perms.general')]: ['users_default', 'm.space.child'],
    [getText('room_perms.members')]: ['invite', 'kick', 'ban'],
    [getText('space_perms.space_profile')]: ['m.room.avatar', 'm.room.name', 'm.room.topic'],
    [getText('room_perms.settings')]: ['state_default', 'm.room.canonical_alias', 'm.room.power_levels'],
};

function useRoomStateUpdate(roomId) {
    const [, forceUpdate] = useForceUpdate();
    const mx = initMatrix.matrixClient;

    useEffect(() => {
        const handleStateEvent = (event) => {
            if (event.getRoomId() !== roomId) return;
            forceUpdate();
        };

        mx.on('RoomState.events', handleStateEvent);
        return () => {
            mx.removeListener('RoomState.events', handleStateEvent);
        };
    }, [roomId]);
}

function RoomPermissions({ roomId }) {
    useRoomStateUpdate(roomId);
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    if (!room) return null;
    const pLEvent = room.currentState.getStateEvents('m.room.power_levels')[0];
    const permissions = pLEvent.getContent();
    const canChangePermission = room.currentState.maySendStateEvent('m.room.power_levels', mx.getUserId());
    const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel ?? 100;

    const handlePowerSelector = (e, permKey, parentKey, powerLevel) => {
        const handlePowerLevelChange = (newPowerLevel) => {
            if (powerLevel === newPowerLevel) return;

            const newPermissions = { ...permissions };
            if (parentKey) {
                newPermissions[parentKey] = {
                    ...permissions[parentKey],
                    [permKey]: newPowerLevel,
                };
            } else if (permKey === 'notifications') {
                newPermissions[permKey] = {
                    ...permissions[permKey],
                    room: newPowerLevel,
                };
            } else {
                newPermissions[permKey] = newPowerLevel;
            }

            mx.sendStateEvent(roomId, 'm.room.power_levels', newPermissions);
        };

        openReusableContextMenu(
            'bottom',
            getEventCords(e, '.btn-surface'),
            (closeMenu) => (
                <PowerLevelSelector
                    value={powerLevel}
                    max={myPowerLevel}
                    onSelect={(pl) => {
                        closeMenu();
                        handlePowerLevelChange(pl);
                    }}
                />
            ),
        );
    };

    const permsGroups = room.isSpaceRoom() ? spacePermsGroups : roomPermsGroups;
    return (
        <div className="room-permissions">
            {
                Object.keys(permsGroups).map((groupKey) => {
                    const groupedPermKeys = permsGroups[groupKey];
                    return (
                        <div className="room-permissions__card" key={groupKey}>
                            <MenuHeader>{groupKey}</MenuHeader>
                            {
                                groupedPermKeys.map((permKey) => {
                                    const permInfo = permissionsInfo[permKey];

                                    let powerLevel = 0;
                                    let permValue = permInfo.parent
                                        ? permissions[permInfo.parent]?.[permKey]
                                        : permissions[permKey];

                                    if (permValue === undefined) permValue = permInfo.default;

                                    if (typeof permValue === 'number') {
                                        powerLevel = permValue;
                                    } else if (permKey === 'notifications') {
                                        powerLevel = permValue.room ?? 50;
                                    }
                                    return (
                                        <SettingTile
                                            key={permKey}
                                            title={permInfo.name}
                                            content={<Text variant="b3">{permInfo.description}</Text>}
                                            options={(
                                                <Button
                                                    onClick={
                                                        canChangePermission
                                                            ? (e) => handlePowerSelector(e, permKey, permInfo.parent, powerLevel)
                                                            : null
                                                    }
                                                    iconSrc={canChangePermission ? mdiChevronDown : null}
                                                >
                                                    <Text variant="b2">
                                                        {`${getPowerLabel(powerLevel) || getText('generic.pl_member')} - ${powerLevel}`}
                                                    </Text>
                                                </Button>
                                            )}
                                        />
                                    );
                                })
                            }
                        </div>
                    );
                })
            }
        </div>
    );
}

RoomPermissions.propTypes = {
    roomId: PropTypes.string.isRequired,
};

export default RoomPermissions;
