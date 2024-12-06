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
import { Backdrop, Divider, Drawer, Fab, Grow, List, ListItemButton, ListItemIcon, ListItemText, Slide, SwipeableDrawer } from '@mui/material';
import { useNavHidden } from '../../hooks/useHideableNav';
import { motion, Variants } from 'framer-motion';
import { Add, BookmarkBorderOutlined } from '@mui/icons-material';
import Bookmarks from '../../organisms/bookmarks/Bookmarks';

export function SidebarNav() {
    const [navHidden, setNavHidden] = useNavHidden();
    const [bookmarks, setBookmarks] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const onClose = () => setNavHidden(true);

    return (
        <>
            {bookmarks && <Bookmarks requestClose={() => setBookmarks(false)} />}
            <SwipeableDrawer
                open={!navHidden}
                onClose={onClose}
                onOpen={() => setNavHidden(false)}
                ref={scrollRef}
            >
                <nav>
                    <List>
                        <UserTab onClose={onClose} />
                    </List>
                </nav>
                <Divider />
                <nav aria-label='Default tabs'>
                    <List>
                        <HomeTab />
                        <DirectTab />
                    </List>
                </nav>
                <Divider />
                <nav aria-label='Spaces'>
                    <List>
                        <SpaceTabs scrollRef={scrollRef} />
                    </List>
                </nav>
                <Divider />
                <nav>
                    <List>
                        <ListItemButton
                            onClick={() => openCreateRoom(true)}
                        >
                            <ListItemIcon>
                                <Add />
                            </ListItemIcon>
                            <ListItemText>
                                {getText('btn.space.new_space')}
                            </ListItemText>
                        </ListItemButton>
                    </List>
                </nav>
                <Divider />
                <nav aria-label='Personal'>
                    <List>
                        <ListItemButton
                            onClick={() => setBookmarks(!bookmarks)}
                        >
                            <ListItemIcon>
                                <BookmarkBorderOutlined />
                            </ListItemIcon>
                            <ListItemText>
                                {getText('btn.bookmarks')}
                            </ListItemText>
                        </ListItemButton>
                        <ExploreTab />
                        <InboxTab />
                    </List>
                </nav>
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
        </>
    );
}
