import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon as MDIcon } from '@mdi/react';
import { useAtomValue } from 'jotai';
import {
    SidebarAvatar,
    SidebarItem,
    SidebarItemBadge,
    SidebarItemTooltip,
} from '../../../components/sidebar';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import {
    getInboxInvitesPath,
    getInboxNotificationsPath,
    getInboxPath,
    joinPathComponent,
} from '../../pathUtils';
import { useInboxSelected } from '../../../hooks/router/useInbox';
import { UnreadBadge } from '../../../components/unread-badge';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { getText } from '../../../../lang';
import { mdiInbox, mdiInboxOutline } from '@mdi/js';
import { Badge, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Inbox } from '@mui/icons-material';

export function InboxTab() {
    const screenSize = useScreenSizeContext();
    const navigate = useNavigate();
    const navToActivePath = useAtomValue(useNavToActivePathAtom());
    const inboxSelected = useInboxSelected();
    const allInvites = useAtomValue(allInvitesAtom);
    const inviteCount = allInvites.length;

    const handleInboxClick = () => {
        if (screenSize === ScreenSize.Mobile) {
            navigate(getInboxPath());
            return;
        }
        const activePath = navToActivePath.get('inbox');
        if (activePath) {
            navigate(joinPathComponent(activePath));
            return;
        }

        const path = inviteCount > 0 ? getInboxInvitesPath() : getInboxNotificationsPath();
        navigate(path);
    };

    return (
        <ListItemButton
            selected={inboxSelected}
            onClick={handleInboxClick}
        >
            <ListItemIcon>
                <Badge badgeContent={inviteCount} color='error' max={99}>
                    <Inbox />
                </Badge>
            </ListItemIcon>
            <ListItemText>
                {getText('inbox.title')}
            </ListItemText>
        </ListItemButton>
    );
}
