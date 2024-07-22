import React, { useState } from 'react';
import {
    Box,
    Icon,
    Icons,
    Modal,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    Text,
    as,
    config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';

import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './RoomViewFollowing.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomLatestRenderedEvent } from '../../hooks/useRoomLatestRenderedEvent';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { EventReaders } from '../../components/event-readers';
import { getText, translate } from '../../../lang';

export type RoomViewFollowingProps = {
    room: Room;
};
export const RoomViewFollowing = as<'div', RoomViewFollowingProps>(
    ({ className, room, ...props }, ref) => {
        const mx = useMatrixClient();
        const [open, setOpen] = useState(false);
        const latestEvent = useRoomLatestRenderedEvent(room);
        const latestEventReaders = useRoomEventReaders(room, latestEvent?.getId());
        const names = latestEventReaders
            .filter((readerId) => readerId !== mx.getUserId())
            .map(
                (readerId) => getMemberDisplayName(room, readerId) ?? getMxIdLocalPart(readerId) ?? readerId
            );

        const eventId = latestEvent?.getId();

        return (
            <>
                {eventId && (
                    <Overlay open={open} backdrop={<OverlayBackdrop />}>
                        <OverlayCenter>
                            <FocusTrap
                                focusTrapOptions={{
                                    initialFocus: false,
                                    onDeactivate: () => setOpen(false),
                                    clickOutsideDeactivates: true,
                                }}
                            >
                                <Modal variant="Surface" size="300">
                                    <EventReaders room={room} eventId={eventId} requestClose={() => setOpen(false)} />
                                </Modal>
                            </FocusTrap>
                        </OverlayCenter>
                    </Overlay>
                )}
                <Box
                    as={names.length > 0 ? 'button' : 'div'}
                    onClick={names.length > 0 ? () => setOpen(true) : undefined}
                    className={classNames(css.RoomViewFollowing({ clickable: names.length > 0 }), className)}
                    alignItems="Center"
                    justifyContent="End"
                    gap="200"
                    {...props}
                    ref={ref}
                >
                    {names.length > 0 && (
                        <>
                            <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.CheckTwice} />
                            <Text size="T300" truncate>
                                {names.length === 1 && (
                                    <>
                                        <Text as="span" size="Inherit" priority="300">
                                            {translate('following.one', <b>{names[0]}</b>)}
                                        </Text>
                                    </>
                                )}
                                {names.length === 2 && (
                                    <>
                                        <Text as="span" size="Inherit" priority="300">
                                            {translate('following.two', <b>{names[0]}</b>, <b>{names[1]}</b>)}
                                        </Text>
                                    </>
                                )}
                                {names.length === 3 && (
                                    <>
                                        <Text as="span" size="Inherit" priority="300">
                                            {translate('following.three', <b>{names[0]}</b>, <b>{names[1]}</b>, <b>{names[2]}</b>)}
                                        </Text>
                                    </>
                                )}
                                {names.length > 3 && (
                                    <>
                                        <Text as="span" size="Inherit" priority="300">
                                            {translate(
                                                'following.more',
                                                <b>{names[0]}</b>,
                                                <b>{names[1]}</b>,
                                                <b>{names[2]}</b>,
                                                <b>{getText('generic.others', names.length - 3)}</b>
                                            )}
                                        </Text>
                                    </>
                                )}
                            </Text>
                        </>
                    )}
                </Box>
            </>
        );
    }
);
