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

import './ShareMenu.scss';
import RoomSelector from "../../molecules/room-selector/RoomSelector";
import { roomToUnreadAtom } from "../../state/room/roomToUnread";
import { roomToParentsAtom } from "../../state/room/roomToParents";

function useVisiblityToggle() {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState([]);

    useEffect(() => {
        const handleShareMenuOpen = (c) => {
            setContent(c);
            setIsOpen(true);
        };
        navigation.on(cons.events.navigation.HIDDEN_ROOMS_OPENED, handleShareMenuOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.HIDDEN_ROOMS_OPENED, handleShareMenuOpen);
        };
    }, []);

    const requestClose = () => setIsOpen(false);

    return [isOpen, requestClose, content];
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

function ShareMenu() {
    const [result, setResult] = useState(null);
    const [isOpen, requestClose, content] = useVisiblityToggle();
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
                [...rooms, ...directs],
                directs,
                roomToParents
            )
        );
        console.log(result);
    };

    const openItem = async (roomId, type) => {
        requestClose();
        const messages = [];
        for (const item of content) {
            var text;
            var filename;
            if (typeof item.text === 'string') {
                text = item.text;
            } else if (typeof item.name === 'string') {
                filename = item.name;
            }
            if (['text', 'string', 'url'].includes(item.type)) {
                messages.push({
                    msgtype: 'm.text',
                    body: item.data
                });
            } else {
                const data = await new Promise(async (resolve, reject) => {
                    if (item.fileUrl) {
                        const fileEntry = await new Promise((resolve, reject) => {
                            window.resolveLocalFileSystemURL(item.fileUrl, resolve);
                        });
                        const file = await new Promise((resolve, reject) => {
                            fileEntry.file(resolve);
                        });
                        let reader = new FileReader();

                        reader.readAsDataURL(file);
                        reader.readAsArrayBuffer(file);
                        reader.onloadend = () => {
                            resolve(reader.result);
                        };
                    } 
                });
                var mediaType = file.type.split('/')[0].toLowerCase();
                if (!['audio', 'video', 'image'].includes(mediaType)) mediaType = 'file';
                mediaType = `m.${mediaType}`;
                const upload = await mx.uploadContent(data);
                messages.push({
                    msgtype: mediaType,
                    filename,
                    body: text ?? filename,
                    url: upload.content_uri
                });
            }
        }
        for (const content of messages) {
            await mx.sendMessage(roomId, content);
        }
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
            className="share-menu-dialog__modal dialog-modal"
            isOpen={isOpen}
            onAfterOpen={handleAfterOpen}
            onRequestClose={requestClose}
            size="small"
        >
            <div className="share-menu-dialog">
                <div className="share-menu-dialog__content-wrapper">
                    <ScrollView autoHide>
                        <div className="share-menu-dialog__content">
                            {Array.isArray(result) && result.map(renderRoomSelector)}
                        </div>
                    </ScrollView>
                </div>
            </div>
        </RawModal>
    );
}

export default ShareMenu;