import React, { useEffect, useState } from 'react';
import { Text } from 'folds';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { openSettings } from '../../../../client/action/navigation';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { getText } from '../../../../lang';

type UserProfile = {
    avatar_url?: string;
    displayname?: string;
};
export function UserTab() {
    const mx = useMatrixClient();
    const userId = mx.getUserId()!;
    const user = mx.getUser(userId);

    const [profile, setProfile] = useState<UserProfile>({
        avatar_url: user?.avatarUrl,
        displayname: user?.rawDisplayName
    });
    const displayName = profile.displayname ?? getMxIdLocalPart(userId) ?? userId;
    const avatarUrl = profile.avatar_url
        ? mx.mxcUrlToHttp(profile.avatar_url, 96, 96, 'crop') ?? undefined
        : undefined;

    useEffect(() => {
        const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
            setProfile((cp) => ({
                ...cp,
                avatar_url: myUser.avatarUrl,
            }));
        };
        const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
            setProfile((cp) => ({
                ...cp,
                avatar_url: myUser.displayName,
            }));
        };
        user?.on(UserEvent.AvatarUrl, onAvatarChange);
        user?.on(UserEvent.DisplayName, onDisplayNameChange);
        return () => {
            user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
            user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
        };
    }, [mx, userId]);
    
    useEffect(() => {
    
    }, [mx, user]);

    return (
        <SidebarItem>
            <SidebarItemTooltip tooltip={getText('sidebar.tooltip.users')}>
                {(triggerRef) => (
                    <SidebarAvatar as="button" ref={triggerRef} onClick={() => openSettings()}>
                        <UserAvatar
                            userId={userId}
                            src={avatarUrl}
                            renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
                        />
                    </SidebarAvatar>
                )}
            </SidebarItemTooltip>
        </SidebarItem>
    );
}
