import { ReactNode, useCallback } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import {
    getDirectPath,
    getExplorePath,
    getHomePath,
    getInboxPath,
    getSpacePath,
} from '../pages/pathUtils';
import { _THREAD_PATH, DIRECT_PATH, DIRECT_THREAD_PATH, EXPLORE_PATH, HOME_PATH, HOME_THREAD_PATH, INBOX_PATH, SPACE_PATH, SPACE_THREAD_PATH } from '../pages/paths';
import { useRoomNavigate } from '../hooks/useRoomNavigate';

type BackRouteHandlerProps = {
    children: (onBack: () => void) => ReactNode;
};
export function BackRouteHandler({ children }: BackRouteHandlerProps) {
    const navigate = useNavigate();
    const { navigateRoom } = useRoomNavigate();
    const location = useLocation();

    const goBack = useCallback(() => {
        const threadMatch = matchPath(
            {
                path: _THREAD_PATH,
                caseSensitive: true,
                end: false
            },
            location.pathname
        );

        if (threadMatch && threadMatch.params.roomIdOrAlias) {
            navigateRoom(threadMatch.params.roomIdOrAlias, undefined, { replace: true, state: 'back-route' });
            return;
        }
        if (
            matchPath(
                {
                    path: HOME_PATH,
                    caseSensitive: true,
                    end: false,
                },
                location.pathname
            )
        ) {
            navigate(getHomePath(), { replace: true, state: 'back-route' });
            return;
        }
        if (
            matchPath(
                {
                    path: DIRECT_PATH,
                    caseSensitive: true,
                    end: false,
                },
                location.pathname
            )
        ) {
            navigate(getDirectPath(), { replace: true, state: 'back-route' });
            return;
        }
        const spaceMatch = matchPath(
            {
                path: SPACE_PATH,
                caseSensitive: true,
                end: false,
            },
            location.pathname
        );
        if (spaceMatch?.params.spaceIdOrAlias) {
            navigate(getSpacePath(spaceMatch.params.spaceIdOrAlias));
            return;
        }
        if (
            matchPath(
                {
                    path: EXPLORE_PATH,
                    caseSensitive: true,
                    end: false,
                },
                location.pathname
            )
        ) {
            navigate(getExplorePath(), { replace: true, state: 'back-route' });
            return;
        }
        if (
            matchPath(
                {
                    path: INBOX_PATH,
                    caseSensitive: true,
                    end: false,
                },
                location.pathname
            )
        ) {
            navigate(getInboxPath(), { replace: true, state: 'back-route' });
        }
    }, [navigate, location]);

    return children(goBack);
}