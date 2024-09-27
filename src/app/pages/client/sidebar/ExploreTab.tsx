import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Icon as MDIcon } from '@mdi/react';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { useExploreSelected } from '../../../hooks/router/useExploreSelected';
import {
    getExploreFeaturedPath,
    getExplorePath,
    getExploreServerPath,
    joinPathComponent,
} from '../../pathUtils';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer } from '../../../utils/matrix';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { getText } from '../../../../lang';
import { mdiCompass, mdiCompassOutline } from '@mdi/js';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Explore } from '@mui/icons-material';

export function ExploreTab() {
    const mx = useMatrixClient();
    const screenSize = useScreenSizeContext();
    const clientConfig = useClientConfig();
    const navigate = useNavigate();
    const navToActivePath = useAtomValue(useNavToActivePathAtom());

    const exploreSelected = useExploreSelected();

    const handleExploreClick = () => {
        if (screenSize === ScreenSize.Mobile) {
            navigate(getExplorePath());
            return;
        }

        const activePath = navToActivePath.get('explore');
        if (activePath) {
            navigate(joinPathComponent(activePath));
            return;
        }

        if (clientConfig.featuredCommunities?.openAsDefault) {
            navigate(getExploreFeaturedPath());
            return;
        }
        const userId = mx.getUserId();
        const userServer = userId ? getMxIdServer(userId) : undefined;
        if (userServer) {
            navigate(getExploreServerPath(userServer));
            return;
        }
        navigate(getExplorePath());
    };

    return (
        <ListItemButton
            selected={exploreSelected}
            onClick={handleExploreClick}
        >
            <ListItemIcon>
                <Explore />
            </ListItemIcon>
            <ListItemText>
                {getText('explore.title')}
            </ListItemText>
        </ListItemButton>
        // <SidebarItem active={exploreSelected}>
        //     <SidebarItemTooltip tooltip={getText('explore.title')}>
        //         {(triggerRef) => (
        //             <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleExploreClick}>
        //                 <MDIcon size={1} path={exploreSelected ? mdiCompass : mdiCompassOutline} />
        //             </SidebarAvatar>
        //         )}
        //     </SidebarItemTooltip>
        // </SidebarItem>
    );
}
