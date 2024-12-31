import { Room, RoomEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { getRoomTags } from "../utils/matrix";
import { useMatrixClient } from "./useMatrixClient";

export default function useRoomTags(room: Room) {
    const mx = useMatrixClient();
    const [roomTags, setRoomTags] = useState(getRoomTags(mx, room));

    useEffect(() => {
        const updateTags = () => {
            setRoomTags(getRoomTags(mx, room));
        };
        room.on(RoomEvent.AccountData, updateTags);
        return () => {
            room.off(RoomEvent.AccountData, updateTags);
        };
    });

    return roomTags;
}