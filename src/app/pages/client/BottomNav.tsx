import { Badge, BottomNavigation, BottomNavigationAction, useTheme } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DIRECT_PATH, HOME_PATH, INBOX_PATH } from "../paths";
import { getText } from "../../../lang";
import { Home, Inbox, Person } from "@mui/icons-material";
import { mDirectAtom } from "../../state/mDirectList";
import { useAtomValue } from "jotai";
import { useDirects } from "../../state/hooks/roomList";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { allRoomsAtom } from "../../state/room-list/roomList";
import { useRoomsUnread } from "../../state/hooks/unread";
import { roomToUnreadAtom } from "../../state/room/roomToUnread";
import { useHomeRooms } from "./home/useHomeRooms";
import { allInvitesAtom } from "../../state/room-list/inviteList";

type BottomNavProps = {
    current?: 'dm' | 'rooms' | 'inbox';
};

export default function BottomNav({ current }: BottomNavProps) {
    const mx = useMatrixClient();

    const theme = useTheme();

    const mDirects = useAtomValue(mDirectAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);
    const directUnread = useRoomsUnread(directs, roomToUnreadAtom);

    const orphanRooms = useHomeRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const allInvites = useAtomValue(allInvitesAtom);
    const inviteCount = allInvites.length;

    const nav = useNavigate();
    const onNav = (evt: any, v: string) => {
        if (v === 'dm') {
            nav(DIRECT_PATH, {
                replace: true
            });
        } else if (v === 'rooms') {
            nav(HOME_PATH, {
                replace: true
            });
        } else if (v === 'inbox') {
            nav(INBOX_PATH, {
                replace: true
            });
        }
    };

    return (
        <BottomNavigation
            value={current}
            onChange={onNav}
            sx={{ bgcolor: theme.palette.grey[900] }}
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