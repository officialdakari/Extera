import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, config, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import Icon, { Icon as MDIcon } from '@mdi/react';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getHomePath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import {
    SidebarAvatar,
    SidebarItem,
    SidebarItemBadge,
    SidebarItemTooltip,
} from '../../../components/sidebar';
import { useHomeSelected } from '../../../hooks/router/useHomeSelected';
import { UnreadBadge } from '../../../components/unread-badge';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useHomeRooms } from '../home/useHomeRooms';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { mdiCheckAll, mdiHome, mdiHomeOutline } from '@mdi/js';
import { Badge, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { DoneAll, Home } from '@mui/icons-material';

type HomeMenuProps = {
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose, anchorEl }, ref) => {
    const orphanRooms = useHomeRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId));
        requestClose();
    };

    return (
        <Menu ref={ref} open={!!anchorEl} anchorEl={anchorEl}>
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

export function HomeTab() {
    const navigate = useNavigate();
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const navToActivePath = useAtomValue(useNavToActivePathAtom());

    const mDirects = useAtomValue(mDirectAtom);
    const roomToParents = useAtomValue(roomToParentsAtom);
    const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
    const homeUnread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
    const homeSelected = useHomeSelected();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleHomeClick: MouseEventHandler<HTMLAnchorElement> = () => {
        const activePath = navToActivePath.get('home');
        if (activePath && screenSize !== ScreenSize.Mobile) {
            navigate(joinPathComponent(activePath));
            return;
        }

        navigate(getHomePath());
    };

    const handleContextMenu: MouseEventHandler<HTMLAnchorElement> = (evt) => {
        evt.preventDefault();
        setMenuAnchor(evt.currentTarget);
    };

    return (
        <>
            <ListItemButton
                component='a'
                onClick={handleHomeClick}
                onContextMenu={handleContextMenu}
                selected={homeSelected}
            >
                <ListItemIcon>
                    <Badge badgeContent={homeUnread?.total} max={99} color={homeUnread?.highlight ? 'error' : 'primary'}>
                        <Home />
                    </Badge>
                </ListItemIcon>
                <ListItemText>
                    {getText('home.title')}
                </ListItemText>
            </ListItemButton>
            <HomeMenu requestClose={() => setMenuAnchor(null)} anchorEl={menuAnchor} />
        </>
        // <SidebarItem active={homeSelected}>
        //     <Tooltip title={getText('home.title')}>
        //         <SidebarAvatar
        //             as="button"
        //             outlined
        //             onClick={handleHomeClick}
        //             onContextMenu={handleContextMenu}
        //         >
        //             <MDIcon size={1} path={homeSelected ? mdiHome : mdiHomeOutline} />
        //         </SidebarAvatar>
        //     </Tooltip>
        //     {homeUnread && (
        //         <SidebarItemBadge hasCount={homeUnread.total > 0}>
        //             <UnreadBadge highlight={homeUnread.highlight > 0} count={homeUnread.total} />
        //         </SidebarItemBadge>
        //     )}
        //     <HomeMenu requestClose={() => setMenuAnchor(null)} anchorEl={menuAnchor} />
        // </SidebarItem>
    );
}
