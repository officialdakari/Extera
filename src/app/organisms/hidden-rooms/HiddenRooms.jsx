import { useAtomValue } from "jotai";
import { useBackButton } from "../../hooks/useBackButton";
import { isHidden, useDirects, useRooms } from "../../state/hooks/roomList";
import { mDirectAtom } from "../../state/mDirectList";
import { allRoomsAtom } from "../../state/room-list/roomList";
import { useEffect, useState } from "react";
import { useRoomNavigate } from "../../hooks/useRoomNavigate";
import initMatrix from "../../../client/initMatrix";
import RawModal from "../../atoms/modal/RawModal";
import ScrollView from "../../atoms/scroll/ScrollView";
import navigation from "../../../client/state/navigation";
import cons from "../../../client/state/cons";

import './HiddenRooms.scss';
import { joinRuleToIconSrc } from "../../../util/matrixUtil";
import RoomSelector from "../../molecules/room-selector/RoomSelector";
import { roomToUnreadAtom } from "../../state/room/roomToUnread";
import { roomToParentsAtom } from "../../state/room/roomToParents";

function useVisiblityToggle() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleHiddenRoomsOpen = () => {
            setIsOpen(true);
        };
        navigation.on(cons.events.navigation.HIDDEN_ROOMS_OPENED, handleHiddenRoomsOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.HIDDEN_ROOMS_OPENED, handleHiddenRoomsOpen);
        };
    }, []);

    const requestClose = () => setIsOpen(false);

    return [isOpen, requestClose];
}

function mapRoomIds(roomIds, directs, roomIdToParents) {
    const mx = initMatrix.matrixClient;

    return roomIds.map((roomId) => {
        const room = mx.getRoom(roomId);
        const parentSet = roomIdToParents.get(roomId);
        const parentNames = parentSet ? [] : undefined;
        parentSet?.forEach((parentId) => parentNames.push(mx.getRoom(parentId).name));

        const parents = parentNames ? parentNames.join(', ') : null;

        let type = 'room';
        if (room.isSpaceRoom()) type = 'space';
        else if (directs.includes(roomId)) type = 'direct';

        return {
            type,
            name: room.name,
            parents,
            roomId,
            room,
        };
    });
}

function HiddenRooms() {
    const [result, setResult] = useState(null);
    const [isOpen, requestClose] = useVisiblityToggle();
    const mx = initMatrix.matrixClient;
    const { navigateRoom, navigateSpace } = useRoomNavigate();
    const mDirects = useAtomValue(mDirectAtom);
    const rooms = useRooms(mx, allRoomsAtom, mDirects);
    const directs = useDirects(mx, allRoomsAtom, mDirects);
    const roomToUnread = useAtomValue(roomToUnreadAtom);
    const roomToParents = useAtomValue(roomToParentsAtom);

    const handleAfterOpen = () => {
        setResult(
            mapRoomIds(
                [...rooms, ...directs].filter((roomId) => isHidden(mx, roomId)),
                directs,
                roomToParents
            )
        );
        console.log(result);
    };

    const openItem = (roomId, type) => {
        if (type === 'space') navigateSpace(roomId);
        else navigateRoom(roomId);
        requestClose();
    };

    const renderRoomSelector = (item) => {
        let imageSrc = null;
        imageSrc = item.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

        return (
            <RoomSelector
                key={item.roomId}
                name={item.name}
                parentName={item.parents}
                roomId={item.roomId}
                imageSrc={imageSrc}
                isUnread={roomToUnread.has(item.roomId)}
                notificationCount={roomToUnread.get(item.roomId)?.total ?? 0}
                isAlert={roomToUnread.get(item.roomId)?.highlight > 0}
                onClick={() => openItem(item.roomId, item.type)}
            />
        );
    };

    useBackButton(requestClose);

    return (
        <RawModal
            className="hidden-rooms-dialog__modal dialog-modal"
            isOpen={isOpen}
            onAfterOpen={handleAfterOpen}
            onRequestClose={requestClose}
            size="small"
        >
            <div className="hidden-rooms-dialog">
                <div className="hidden-rooms-dialog__content-wrapper">
                    <ScrollView autoHide>
                        <div className="hidden-rooms-dialog__content">
                            {Array.isArray(result) && result.map(renderRoomSelector)}
                        </div>
                    </ScrollView>
                </div>
            </div>
        </RawModal>
    );
}

export default HiddenRooms;