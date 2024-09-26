import React, { useRef, useState } from 'react';
import { Box, Scroll } from 'folds';

import {
    Sidebar,
    SidebarContent,
    SidebarStackSeparator,
    SidebarStack,
    SidebarAvatar,
    SidebarItemTooltip,
    SidebarItem,
} from '../../components/sidebar';
import { DirectTab, HomeTab, SpaceTabs, InboxTab, ExploreTab, UserTab } from './sidebar';
import { openCreateRoom, openSearch } from '../../../client/action/navigation';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiMagnify, mdiPlus } from '@mdi/js';
import { Backdrop, Drawer, Fab, Grow, List, Slide, SwipeableDrawer } from '@mui/material';
import { useNavHidden } from '../../hooks/useHideableNav';
import { motion, Variants } from 'framer-motion';

const variants: Variants = {
    initial: {
        left: '-60px',
        height: '100%',
        display: 'flex'
    },
    final: {
        left: '0px',
        height: '100%',
        display: 'flex'
    }
};

export function SidebarNav() {
    const [navHidden, setNavHidden] = useNavHidden();
    const scrollRef = useRef<HTMLDivElement>(null);
    const onClose = () => setNavHidden(true);

    return (
        <SwipeableDrawer
            open={!navHidden}
            onClose={onClose}
            onOpen={() => setNavHidden(false)}
        >
            <List>
                <HomeTab />
                <DirectTab />
            </List>
            {/* <Sidebar style={{ height: '100%' }}>
                <SidebarContent
                    scrollable={
                        <Scroll ref={scrollRef} variant="Background" size="0">
                            <SidebarStack>
                                <HomeTab />
                                <DirectTab />
                            </SidebarStack>
                            <SpaceTabs scrollRef={scrollRef} />
                            <SidebarStackSeparator />
                            <SidebarStack>
                                <ExploreTab />
                                <SidebarItem>
                                    <SidebarItemTooltip tooltip={getText('nav.create_space')}>
                                        {(triggerRef) => (
                                            <SidebarAvatar
                                                as="button"
                                                ref={triggerRef}
                                                outlined
                                                onClick={() => { openCreateRoom(true); onClose() }}
                                            >
                                                <Icon size={1} path={mdiPlus} />
                                            </SidebarAvatar>
                                        )}
                                    </SidebarItemTooltip>
                                </SidebarItem>
                            </SidebarStack>
                        </Scroll>
                    }
                    sticky={
                        <>
                            <SidebarStackSeparator />
                            <SidebarStack>
                                <SidebarItem>
                                    <SidebarItemTooltip tooltip="Search">
                                        {(triggerRef) => (
                                            <SidebarAvatar
                                                as="button"
                                                ref={triggerRef}
                                                outlined
                                                onClick={() => { openSearch(); onClose(); }}
                                            >
                                                <Icon size={1} path={mdiMagnify} />
                                            </SidebarAvatar>
                                        )}
                                    </SidebarItemTooltip>
                                </SidebarItem>

                                <InboxTab />
                                <UserTab />
                            </SidebarStack>
                        </>
                    }
                />
            </Sidebar> */}
        </SwipeableDrawer>
    );
}
