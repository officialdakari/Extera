import { useCallback } from 'react';
import { NavigateOptions, useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { getCanonicalAliasOrRoomId } from '../utils/matrix';
import {
    getDirectRoomPath,
    getHomeRoomPath,
    getSpacePath,
    getSpaceRoomPath,
} from '../pages/pathUtils';
import { useMatrixClient } from './useMatrixClient';
import { getOrphanParents } from '../utils/room';
import { roomToParentsAtom } from '../state/room/roomToParents';
import { mDirectAtom } from '../state/mDirectList';

export const useRoomNavigate = () => {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const roomToParents = useAtomValue(roomToParentsAtom);
    const mDirects = useAtomValue(mDirectAtom);

    const navigateSpace = useCallback(
        (roomId: string) => {
            const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
            navigate(getSpacePath(roomIdOrAlias));
        },
        [mx, navigate]
    );

    const navigateRoom = useCallback(
        (roomId: string, eventId?: string, threadRootId?: string, opts?: NavigateOptions) => {
            const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);

            const orphanParents = getOrphanParents(roomToParents, roomId);
            if (orphanParents.length > 0) {
                const pSpaceIdOrAlias = getCanonicalAliasOrRoomId(mx, orphanParents[0]);
                navigate(getSpaceRoomPath(pSpaceIdOrAlias, roomIdOrAlias, eventId, threadRootId), opts);
                return;
            }

            if (mDirects.has(roomId)) {
                navigate(getDirectRoomPath(roomIdOrAlias, eventId, threadRootId), opts);
                return;
            }

            navigate(getHomeRoomPath(roomIdOrAlias, eventId, threadRootId), opts);
        },
        [mx, navigate, roomToParents, mDirects]
    );

    return {
        navigateSpace,
        navigateRoom,
    };
};
