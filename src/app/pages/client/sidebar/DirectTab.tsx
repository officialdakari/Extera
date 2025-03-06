import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { DoneAll, Person } from '@mui/icons-material';
import { Badge, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getDirectPath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useDirectRooms } from '../direct/useDirectRooms';
import { markAsRead } from '../../../../client/action/notifications';
import { getText } from '../../../../lang';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';

type DirectMenuProps = {
    requestClose: () => void;
    anchorEl: HTMLElement | null;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ requestClose, anchorEl }, ref) => {
    const orphanRooms = useDirectRooms();
    const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
    const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');

    const handleMarkAsRead = () => {
        if (!unread) return;
        orphanRooms.forEach((rId) => markAsRead(rId, undefined, ghostMode));
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
                component='a'
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
