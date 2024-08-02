import React from 'react';
import { Box, Icon, IconButton, Icons, Text, as } from 'folds';
import { Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import { useSetAtom } from 'jotai';
import { roomIdToTypingMembersAtom } from '../../state/typingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './RoomViewTyping.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { getText, translate } from '../../../lang';

export type RoomViewTypingProps = {
    room: Room;
};
export const RoomViewTyping = as<'div', RoomViewTypingProps>(
    ({ className, room, ...props }, ref) => {
        const setTypingMembers = useSetAtom(roomIdToTypingMembersAtom);
        const mx = useMatrixClient();
        const typingMembers = useRoomTypingMember(room.roomId);

        const typingNames = typingMembers
            .filter((receipt) => receipt.userId !== mx.getUserId())
            .map(
                (receipt) => getMemberDisplayName(room, receipt.userId) ?? getMxIdLocalPart(receipt.userId)
            )
            .reverse();

        if (typingNames.length === 0) {
            return null;
        }

        const handleDropAll = () => {
            // some homeserver does not timeout typing status
            // we have given option so user can drop their typing status
            typingMembers.forEach((receipt) =>
                setTypingMembers({
                    type: 'DELETE',
                    roomId: room.roomId,
                    userId: receipt.userId,
                })
            );
        };

        return (
            <div style={{ position: 'relative' }}>
                <Box
                    className={classNames(css.RoomViewTyping, className)}
                    alignItems="Center"
                    gap="400"
                    {...props}
                    ref={ref}
                >
                    <TypingIndicator />
                    <Text className={css.TypingText} size="T300" truncate>
                        {typingNames.length === 1 && (
                            <>
                                <Text as="span" size="Inherit" priority="300">
                                    {translate('typing.one', <b>{typingNames[0]}</b>)}
                                </Text>
                            </>
                        )}
                        {typingNames.length === 2 && (
                            <>
                                <Text as="span" size="Inherit" priority="300">
                                    {translate('typing.two', <b>{typingNames[0]}</b>, <b>{typingNames[1]}</b>)}
                                </Text>
                            </>
                        )}
                        {typingNames.length === 3 && (
                            <>
                                <Text as="span" size="Inherit" priority="300">
                                    {translate('typing.three', <b>{typingNames[0]}</b>, <b>{typingNames[1]}</b>, <b>{typingNames[2]}</b>)}
                                </Text>
                            </>
                        )}
                        {typingNames.length > 3 && (
                            <>
                                <Text as="span" size="Inherit" priority="300">
                                    {translate(
                                        'typing.more',
                                        <b>{typingNames[0]}</b>,
                                        <b>{typingNames[1]}</b>,
                                        <b>{typingNames[2]}</b>,
                                        <b>{getText('generic.others', typingNames.length - 3)}</b>
                                    )}
                                </Text>
                            </>
                        )}
                    </Text>
                    {/* <IconButton title="Drop Typing Status" size="300" radii="Pill" onClick={handleDropAll}>
                        <Icon size="50" src={Icons.Cross} />
                    </IconButton> */}
                </Box>
            </div>
        );
    }
);
