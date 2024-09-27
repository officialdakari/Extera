import React, { useEffect, useState } from 'react';
import { Text } from 'folds';
import { ClientEvent, SyncState, UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { openSettings } from '../../../../client/action/navigation';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { getText } from '../../../../lang';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

type UserProfile = {
    avatar_url?: string;
    displayname?: string;
};

type UserTabProps = {
    onClose?: () => void;
};

export function UserTab({ onClose }: UserTabProps) {
    const mx = useMatrixClient();
    const userId = mx.getUserId()!;
    const [user, setUser] = useState(mx.getUser(userId));

    const [profile, setProfile] = useState<UserProfile>({
        avatar_url: user?.avatarUrl,
        displayname: user?.rawDisplayName
    });
    const [displayName, setDisplayName] = useState(profile.displayname ?? getMxIdLocalPart(userId) ?? userId);
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url
        ? mx.mxcUrlToHttp(profile.avatar_url, 96, 96, 'crop') ?? undefined
        : undefined);

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
        const updateUser = (state: SyncState) => {
            if (state === SyncState.Prepared) {
                setUser(mx.getUser(userId));
            }
        };
        user?.on(UserEvent.AvatarUrl, onAvatarChange);
        user?.on(UserEvent.DisplayName, onDisplayNameChange);
        mx.on(ClientEvent.Sync, updateUser);
        return () => {
            user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
            user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
            mx.off(ClientEvent.Sync, updateUser);
        };
    }, [mx, userId]);

    useEffect(() => {
        setDisplayName(profile.displayname ?? getMxIdLocalPart(userId) ?? userId);
        setAvatarUrl(profile.avatar_url
            ? mx.mxcUrlToHttp(profile.avatar_url, 96, 96, 'crop') ?? undefined
            : undefined);
    }, [mx, userId, user, profile]);

    const handleOpenSettings = () => {
        openSettings();
        onClose?.();
    };

    return (
        <ListItemButton onClick={() => handleOpenSettings()}>
            <ListItemIcon>
                <SidebarAvatar>
                    <UserAvatar
                        userId={userId}
                        src={avatarUrl}
                        renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
                    />
                </SidebarAvatar>
            </ListItemIcon>
            <ListItemText>
                {displayName}
            </ListItemText>
        </ListItemButton>
    );
}
