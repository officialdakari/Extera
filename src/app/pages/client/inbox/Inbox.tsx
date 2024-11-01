import React from 'react';
import { Avatar, Box, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getInboxInvitesPath, getInboxNotificationsPath } from '../../pathUtils';
import { Icon as MDIcon } from '@mdi/react';
import {
    useInboxInvitesSelected,
    useInboxNotificationsSelected,
} from '../../../hooks/router/useInbox';
import { UnreadBadge } from '../../../components/unread-badge';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { getText } from '../../../../lang';
import { mdiEmail, mdiEmailOutline, mdiMail, mdiMailboxOutline, mdiMessageAlert, mdiMessageAlertOutline } from '@mdi/js';
import { AppBar, Badge, IconButton, Toolbar, Typography } from '@mui/material';
import { ArrowBack, Menu } from '@mui/icons-material';
import { useNavHidden } from '../../../hooks/useHideableNav';
import BottomNav from '../BottomNav';

function InvitesNavItem() {
    const invitesSelected = useInboxInvitesSelected();
    const allInvites = useAtomValue(allInvitesAtom);
    const inviteCount = allInvites.length;

    return (
        <NavItem
            style={{ background: 'transparent' }}
            radii="400"
            highlight={inviteCount > 0}
            aria-selected={invitesSelected}
        >
            <NavLink to={getInboxInvitesPath()}>
                <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Badge max={99} color='error' badgeContent={inviteCount}>
                            <Avatar size="200" radii="400">
                                <MDIcon size={1} path={invitesSelected ? mdiEmail : mdiEmailOutline} />
                            </Avatar>
                        </Badge>
                        <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                                {getText('inbox.invites')}
                            </Text>
                        </Box>
                    </Box>
                </NavItemContent>
            </NavLink>
        </NavItem>
    );
}

export function Inbox() {
    useNavToActivePathMapper('inbox');
    const notificationsSelected = useInboxNotificationsSelected();
    const [navHidden, setNavHidden] = useNavHidden();
    const prev = history.state?.usr?.prev;

    return (
        <PageNav
            variants={{
                exit: {
                    translateX: (prev == 'rooms' || prev == 'dm') ? '20px' : '-20px',
                    opacity: 0.3,
                    transition: {
                        ease: 'linear'
                    },
                },
                final: {
                    translateX: 0,
                    opacity: 1,
                    transition: {
                        ease: 'linear'
                    },
                }
            }}
            header={
                <AppBar color='inherit' enableColorOnDark position='static'>
                    <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                        <IconButton
                            onClick={() => setNavHidden(false)}
                        >
                            <Menu />
                        </IconButton>
                        <Typography component='div' variant='h6' flexGrow={1}>
                            {getText('inbox.title')}
                        </Typography>
                    </Toolbar>
                </AppBar>
            }
        >
            <PageNavContent>
                <Box direction="Column" gap="300">
                    <NavCategory>
                        <NavItem style={{ background: 'transparent' }} radii="400" aria-selected={notificationsSelected}>
                            <NavLink to={getInboxNotificationsPath()}>
                                <NavItemContent>
                                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                        <Avatar size="200" radii="400">
                                            <MDIcon size={1} path={notificationsSelected ? mdiMessageAlert : mdiMessageAlertOutline} />
                                        </Avatar>
                                        <Box as="span" grow="Yes">
                                            <Text as="span" size="Inherit" truncate>
                                                {getText('inbox.notifications')}
                                            </Text>
                                        </Box>
                                    </Box>
                                </NavItemContent>
                            </NavLink>
                        </NavItem>
                        <InvitesNavItem />
                    </NavCategory>
                </Box>
            </PageNavContent>
        </PageNav>
    );
}
