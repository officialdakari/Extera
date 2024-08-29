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
        <SidebarItem active={inboxSelected}>
            <SidebarItemTooltip tooltip={getText('inbox.title')}>
                {(triggerRef) => (
                    <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleInboxClick}>
                        <MDIcon path={inboxSelected ? mdiInbox : mdiInboxOutline} size={1} />
                    </SidebarAvatar>
                )}
            </SidebarItemTooltip>
            {inviteCount > 0 && (
                <SidebarItemBadge hasCount>
                    <UnreadBadge highlight count={inviteCount} />
                </SidebarItemBadge>
            )}
        </SidebarItem>
    );
}
