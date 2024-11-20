import React, { FormEventHandler, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import {
    Avatar,
    Box,
    Text,
    color,
    config,
} from 'folds';
import {
    NavCategory,
    NavCategoryHeader,
    NavItem,
    NavItemContent,
    NavLink,
} from '../../../components/nav';
import { getExploreFeaturedPath, getExploreServerPath } from '../../pathUtils';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {
    useExploreFeaturedSelected,
    useExploreServer,
} from '../../../hooks/router/useExploreSelected';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer } from '../../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiClose, mdiPlus, mdiServerNetwork, mdiServerNetworkOutline, mdiStar, mdiStarOutline } from '@mdi/js';
import { Alert, AppBar, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import { useNavHidden } from '../../../hooks/useHideableNav';
import { Menu } from '@mui/icons-material';
import BottomNav from '../BottomNav';

export function AddServer() {
    const mx = useMatrixClient();
    const navigate = useNavigate();
    const [dialog, setDialog] = useState(false);
    const serverInputRef = useRef<HTMLInputElement>(null);

    const [exploreState] = useAsyncCallback(
        useCallback((server: string) => mx.publicRooms({ server, limit: 1 }), [mx])
    );

    const getInputServer = (): string | undefined => {
        const serverInput = serverInputRef.current;
        if (!serverInput) return undefined;
        const server = serverInput.value.trim();
        return server || undefined;
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const server = getInputServer();
        if (!server) return;
        // explore(server);

        navigate(getExploreServerPath(server));
        setDialog(false);
    };

    const handleView = () => {
        const server = getInputServer();
        if (!server) return;
        navigate(getExploreServerPath(server));
        setDialog(false);
    };

    return (
        <>
            <Dialog
                open={dialog}
                onClose={() => setDialog(false)}
                PaperProps={{
                    component: 'form',
                    onSubmit: handleSubmit
                }}
            >
                <DialogTitle>
                    {getText('explore.add_server')}
                </DialogTitle>
                <DialogContent>
                    <TextField inputRef={serverInputRef} name="serverInput" label={getText('input.explore.server_name')} required />
                    {exploreState.status === AsyncStatus.Error && (
                        <Alert severity='error'>
                            {getText('error.explore.load_rooms')}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button type="submit" onClick={handleView}>
                        {getText('explore.view')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Button
                startIcon={<Icon size={1} path={mdiPlus} />}
                onClick={() => setDialog(true)}
            >
                {getText('explore.add_server_btn')}
            </Button>
        </>
    );
}

export function Explore() {
    const mx = useMatrixClient();
    useNavToActivePathMapper('explore');
    const userId = mx.getUserId();
    const clientConfig = useClientConfig();
    const userServer = userId ? getMxIdServer(userId) : undefined;
    const servers =
        clientConfig.featuredCommunities?.servers?.filter((server) => server !== userServer) ?? [];

    const featuredSelected = useExploreFeaturedSelected();
    const selectedServer = useExploreServer();
    const [, setNavHidden] = useNavHidden();

    return (
        <PageNav
            header={
                <AppBar color='inherit' enableColorOnDark position='static'>
                    <Toolbar style={{ paddingLeft: 8, paddingRight: 8 }} variant='regular'>
                        <IconButton
                            onClick={() => setNavHidden(false)}
                        >
                            <Menu />
                        </IconButton>
                        <Typography component='div' variant='h6' flexGrow={1}>
                            {getText('explore.title')}
                        </Typography>
                    </Toolbar>
                </AppBar>
            }
        >
            <PageNavContent>
                <Box direction="Column" gap="300">
                    <NavCategory>
                        <NavItem style={{ background: 'transparent' }} radii="400" aria-selected={featuredSelected}>
                            <NavLink to={getExploreFeaturedPath()}>
                                <NavItemContent>
                                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                        <Avatar size="200" radii="400">
                                            <Icon size={1} path={featuredSelected ? mdiStar : mdiStarOutline} />
                                        </Avatar>
                                        <Box as="span" grow="Yes">
                                            <Text as="span" size="Inherit" truncate>
                                                {getText('explore.featured')}
                                            </Text>
                                        </Box>
                                    </Box>
                                </NavItemContent>
                            </NavLink>
                        </NavItem>
                        {userServer && (
                            <NavItem
                                style={{ background: 'transparent' }}
                                radii="400"
                                aria-selected={selectedServer === userServer}
                            >
                                <NavLink to={getExploreServerPath(userServer)}>
                                    <NavItemContent>
                                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                            <Avatar size="200" radii="400">
                                                <Icon
                                                    path={selectedServer === userServer ? mdiServerNetwork : mdiServerNetworkOutline}
                                                    size={1}
                                                />
                                            </Avatar>
                                            <Box as="span" grow="Yes">
                                                <Text as="span" size="Inherit" truncate>
                                                    {userServer}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </NavItemContent>
                                </NavLink>
                            </NavItem>
                        )}
                    </NavCategory>
                    {servers.length > 0 && (
                        <NavCategory>
                            <NavCategoryHeader>
                                <Text size="O400" style={{ paddingLeft: config.space.S200 }}>
                                    {getText('explore.servers')}
                                </Text>
                            </NavCategoryHeader>
                            {servers.map((server) => (
                                <NavItem
                                    key={server}
                                    style={{ background: 'transparent' }}
                                    radii="400"
                                    aria-selected={server === selectedServer}
                                >
                                    <NavLink to={getExploreServerPath(server)}>
                                        <NavItemContent>
                                            <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                                <Avatar size="200" radii="400">
                                                    <Icon
                                                        path={mdiServerNetworkOutline}
                                                        size={1}
                                                    />
                                                </Avatar>
                                                <Box as="span" grow="Yes">
                                                    <Text as="span" size="Inherit" truncate>
                                                        {server}
                                                    </Text>
                                                </Box>
                                            </Box>
                                        </NavItemContent>
                                    </NavLink>
                                </NavItem>
                            ))}
                        </NavCategory>
                    )}
                    <Box direction="Column">
                        <AddServer />
                    </Box>
                </Box>
            </PageNavContent>
        </PageNav>
    );
}
