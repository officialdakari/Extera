import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, config, toRem } from 'folds';
import { Icon as MDIcon } from '@mdi/react';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getDirectPath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import {
    SidebarAvatar,
    SidebarItem,
    SidebarItemBadge,
    SidebarItemTooltip,
} from '../../../components/sidebar';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import { UnreadBadge } from '../../../components/unread-badge';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useDirectRooms } from '../direct/useDirectRooms';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { mdiAccount, mdiAccountOutline, mdiCheckAll } from '@mdi/js';
import { Badge, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { DoneAll, Person } from '@mui/icons-material';

type DirectMenuProps = {
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ requestClose, anchorEl }, ref) => {
    const orphanRooms = useDirectRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId));
        requestClose();
    };

    return (
        <Menu ref={ref} anchorEl={anchorEl} open={!!anchorEl}>
            <MenuItem
                onClick={handleMarkAsRead}
                disabled={!unread}
            >
                <ListItemIcon>
                    <DoneAll />
                </ListItemIcon>
                <ListItemText>
                    {getText('chats.mark_as_read')}
                </ListItemText>
            </MenuItem>
        </Menu>
    );
});

export function DirectTab() {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const navToActivePath = useAtomValue(useNavToActivePathAtom());

    const mDirects = useAtomValue(mDirectAtom);
    const directs = useDirects(mx, allRoomsAtom, mDirects);
    const directUnread = useRoomsUnread(directs, roomToUnreadAtom);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const directSelected = useDirectSelected();

    const handleDirectClick = () => {
        const activePath = navToActivePath.get('direct');
        if (activePath && screenSize !== ScreenSize.Mobile) {
            navigate(joinPathComponent(activePath));
            return;
        }

        navigate(getDirectPath());
    };

    const handleContextMenu: MouseEventHandler<HTMLAnchorElement> = (evt) => {
        evt.preventDefault();
        setMenuAnchor(evt.currentTarget);
    };
    return (
        <>
            <ListItemButton
                selected={directSelected}
                onClick={handleDirectClick}
                onContextMenu={handleContextMenu}
            >
                <ListItemIcon>
                    <Badge badgeContent={directUnread?.total} max={99} color={directUnread?.highlight ? 'error' : 'primary'}>
                        <Person />
                    </Badge>
                </ListItemIcon>
                <ListItemText>
                    {getText('direct_menu.title')}
                </ListItemText>
            </ListItemButton>
            <DirectMenu anchorEl={menuAnchor} requestClose={() => setMenuAnchor(null)} />
        </>
    );
}
