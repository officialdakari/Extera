import { MatrixClient } from 'matrix-js-sdk';
import { getRoomTags } from './matrix';

export type SortFunc<T> = (a: T, b: T) => number;

export const factoryRoomIdByActivity =
    (mx: MatrixClient): SortFunc<string> =>
        (a, b) => {
            const room1 = mx.getRoom(a);
            const room2 = mx.getRoom(b);

            if (room1 && room2) {
                const tags1 = getRoomTags(mx, room1);
                const tags2 = getRoomTags(mx, room2);
                if (tags1['m.favourite'] && !tags2['m.favourite']) return Number.MIN_SAFE_INTEGER;
                if (!tags1['m.favourite'] && tags2['m.favourite']) return Number.MAX_SAFE_INTEGER;
            }

            return (
                (room2?.getLastActiveTimestamp() ?? Number.MIN_SAFE_INTEGER) -
                (room1?.getLastActiveTimestamp() ?? Number.MIN_SAFE_INTEGER)
            );
        };

export const factoryRoomIdByAtoZ =
    (mx: MatrixClient): SortFunc<string> =>
        (a, b) => {
            const roomA = mx.getRoom(a);
            const roomB = mx.getRoom(b);

            let aName = roomA?.name ?? '';
            let bName = roomB?.name ?? '';

            // remove "#" from the room name
            // To ignore it in sorting
            aName = aName.replace(/#/g, '');
            bName = bName.replace(/#/g, '');

            if (roomA && roomB) {
                const tags1 = getRoomTags(mx, roomA);
                const tags2 = getRoomTags(mx, roomB);
                if (tags1['m.favourite'] && !tags2['m.favourite']) return -2;
                if (!tags1['m.favourite'] && tags2['m.favourite']) return 2;
            }

            if (aName.toLowerCase() < bName.toLowerCase()) {
                return -1;
            }
            if (aName.toLowerCase() > bName.toLowerCase()) {
                return 1;
            }
            return 0;
        };

export const factoryRoomIdByUnreadCount =
    (getUnreadCount: (roomId: string) => number): SortFunc<string> =>
        (a, b) => {
            const aT = getUnreadCount(a) ?? 0;
            const bT = getUnreadCount(b) ?? 0;
            return bT - aT;
        };

export const byTsOldToNew: SortFunc<number> = (a, b) => a - b;

export const byOrderKey: SortFunc<string | undefined> = (a, b) => {
    if (!a && !b) {
        return 0;
    }

    if (!b) return -1;
    if (!a) return 1;

    if (a < b) {
        return -1;
    }
    return 1;
};
