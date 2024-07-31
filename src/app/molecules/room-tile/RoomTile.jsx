import React from 'react';
import PropTypes from 'prop-types';
import './RoomTile.scss';

import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import { getText } from '../../../lang';

function RoomTile({ avatarSrc, name, id, inviterName, memberCount, desc, options }) {
    return (
        <div className="room-tile">
            <div className="room-tile__avatar">
                <Avatar imageSrc={avatarSrc} bgColor={colorMXID(id)} text={name} />
            </div>
            <div className="room-tile__content">
                <Text variant="s1">{name}</Text>
                <Text variant="b3">
                    {inviterName !== null
                        ? getText('room_tile.invited', inviterName, id, typeof memberCount === 'number' ? getText('room_tile.members', memberCount) : '')
                        : getText('room_tile.info', id, typeof memberCount === 'number' ? getText('room_tile.members', memberCount) : '')}
                </Text>
                {desc !== null && typeof desc === 'string' ? (
                    <Text className="room-tile__content__desc" variant="b2">
                        {desc}
                    </Text>
                ) : (
                    desc
                )}
            </div>
            {options !== null && <div className="room-tile__options">{options}</div>}
        </div>
    );
}

RoomTile.defaultProps = {
    avatarSrc: null,
    inviterName: null,
    options: null,
    desc: null,
    memberCount: null,
};
RoomTile.propTypes = {
    avatarSrc: PropTypes.string,
    name: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    inviterName: PropTypes.string,
    memberCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    desc: PropTypes.node,
    options: PropTypes.node,
};

export default RoomTile;
