import React, { useRef } from 'react';
import { Scroll } from 'folds';

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

export function SidebarNav() {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <Sidebar>
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
                                            onClick={() => openCreateRoom(true)}
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
                                            onClick={() => openSearch()}
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
        </Sidebar>
    );
}
