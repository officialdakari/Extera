import { Badge, BottomNavigation, BottomNavigationAction, useTheme } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DIRECT_PATH, HOME_PATH, INBOX_PATH } from "../paths";
import { getText } from "../../../lang";
import { BreakfastDiningOutlined, Home, Inbox, Person } from "@mui/icons-material";
import { mDirectAtom } from "../../state/mDirectList";
import { useAtomValue } from "jotai";
import { useDirects } from "../../state/hooks/roomList";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { allRoomsAtom } from "../../state/room-list/roomList";
import { useRoomsUnread } from "../../state/hooks/unread";
import { roomToUnreadAtom } from "../../state/room/roomToUnread";
import { useHomeRooms } from "./home/useHomeRooms";
import { allInvitesAtom } from "../../state/room-list/inviteList";
import { useNavToActivePathAtom } from "../../state/hooks/navToActivePath";
import { roomToParentsAtom } from "../../state/room/roomToParents";
import { useHomeSelected } from "../../hooks/router/useHomeSelected";
import { getDirectPath, getHomePath, getInboxInvitesPath, getInboxNotificationsPath, getInboxPath, joinPathComponent } from "../pathUtils";
import { ScreenSize, useScreenSize } from "../../hooks/useScreenSize";
import { useDirectSelected } from "../../hooks/router/useDirectSelected";
import { useInboxSelected } from "../../hooks/router/useInbox";

export default function BottomNav() {
    const mx = useMatrixClient();
    const screenSize = useScreenSize();

    const navToActivePath = useAtomValue(useNavToActivePathAtom());
    const homeSelected = useHomeSelected();
    const nav = useNavigate();

    const directSelected = useDirectSelected();

    const inboxSelected = useInboxSelected();

    const mDirects = useAtomValue(mDirectAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);
    const directUnread = useRoomsUnread(directs, roomToUnreadAtom);

    const orphanRooms = useHomeRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const allInvites = useAtomValue(allInvitesAtom);
    const inviteCount = allInvites.length;

    const onNav = (ev: any, value: string) => {
        switch (value) {
            case 'rooms':
                handleHomeClick();
                break;
            case 'dm':
                handleDirectClick();
                break;
            case 'inbox':
                handleInboxClick()
                break;
        }
    };

    const [value, setValue] = useState(homeSelected
        ? 'rooms'
        : directSelected
            ? 'dm'
            : inboxSelected
                ? 'inbox'
                : undefined);

    useEffect(() => {
        setValue(homeSelected
            ? 'rooms'
            : directSelected
                ? 'dm'
                : inboxSelected
                    ? 'inbox'
                    : undefined);
    }, [homeSelected, directSelected, inboxSelected]);

    const handleHomeClick = () => {
        const activePath = navToActivePath.get('home');
        if (activePath && screenSize !== ScreenSize.Mobile) {
            nav(joinPathComponent(activePath), { state: { prev: value || 'bottomNav' } });
            return;
        }

        nav(getHomePath(), { replace: true, state: { prev: value || 'bottomNav' } });
    };

    const handleDirectClick = () => {
        const activePath = navToActivePath.get('direct');
        if (activePath && screenSize !== ScreenSize.Mobile) {
            nav(joinPathComponent(activePath), { replace: true, state: { prev: value || 'bottomNav' } });
            return;
        }

        nav(getDirectPath(), { replace: true, state: { prev: value || 'bottomNav' } });
    };

    const handleInboxClick = () => {
        if (screenSize === ScreenSize.Mobile) {
            nav(getInboxPath(), { replace: true, state: { prev: value || 'bottomNav' } });
            return;
        }
        const activePath = navToActivePath.get('inbox');
        if (activePath) {
            nav(joinPathComponent(activePath), { replace: true, state: { prev: value || 'bottomNav' } });
            return;
        }

        const path = inviteCount > 0 ? getInboxInvitesPath() : getInboxNotificationsPath();
        nav(path, { state: { prev: value || 'bottomNav' } });
    };

    return (
        <BottomNavigation
            value={value}
            onChange={onNav}
        >
            <BottomNavigationAction
                label={getText('home.rooms')}
                value='rooms'
                icon={
                    <Badge
                        max={99}
                        badgeContent={unread?.total}
                        color={unread?.highlight ? 'error' : 'primary'}
                    >
                        <Home />
                    </Badge>
                }
            />
            <BottomNavigationAction
                label={getText('nav.dm')}
                value='dm'
                icon={
                    <Badge
                        max={99}
                        badgeContent={directUnread?.total}
                        color={directUnread?.highlight ? 'error' : 'primary'}
                    >
                        <Person />
                    </Badge>
                }
            />
            <BottomNavigationAction
                label={getText('inbox.title')}
                value='inbox'
                icon={
                    <Badge
                        max={99}
                        badgeContent={inviteCount}
                        color='error'
                    >
                        <Inbox />
                    </Badge>
                }
            />
        </BottomNavigation>
    );
}