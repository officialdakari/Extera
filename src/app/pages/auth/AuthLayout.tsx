import React, { useCallback, useEffect } from 'react';
import { Box, Header, Scroll, Spinner, Text, color } from 'folds';
import {
    Outlet,
    generatePath,
    matchPath,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom';
import classNames from 'classnames';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import {
    clientAllowedServer,
    clientDefaultServer,
    useClientConfig,
} from '../../hooks/useClientConfig';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { LOGIN_PATH, REGISTER_PATH, RESET_PASSWORD_PATH } from '../paths';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { ServerPicker } from './ServerPicker';
import { AutoDiscoveryAction, autoDiscovery } from '../../cs-api';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AuthFlowsLoader } from '../../components/AuthFlowsLoader';
import { AuthFlowsProvider } from '../../hooks/useAuthFlows';
import { AuthServerProvider } from '../../hooks/useAuthServer';
import { getText } from '../../../lang';
import cons from '../../../client/state/cons';
import { CircularProgress, LinearProgress } from '@mui/material';

const currentAuthPath = (pathname: string): string => {
    if (matchPath(LOGIN_PATH, pathname)) {
        return LOGIN_PATH;
    }
    if (matchPath(RESET_PASSWORD_PATH, pathname)) {
        return RESET_PASSWORD_PATH;
    }
    if (matchPath(REGISTER_PATH, pathname)) {
        return REGISTER_PATH;
    }
    return LOGIN_PATH;
};

function AuthLayoutLoading({ message }: { message: string }) {
    return (
        <Box justifyContent="Center" alignItems="Center" gap="200">
            <CircularProgress size={30} />
            {message}
        </Box>
    );
}

function AuthLayoutError({ message }: { message: string }) {
    return (
        <Box justifyContent="Center" alignItems="Center" gap="200">
            <Text align="Center" style={{ color: color.Critical.Main }} size="T300">
                {message}
            </Text>
        </Box>
    );
}

export function AuthLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { server: urlEncodedServer } = useParams();

    const clientConfig = useClientConfig();

    const defaultServer = clientDefaultServer(clientConfig);
    let server: string = urlEncodedServer ? decodeURIComponent(urlEncodedServer) : defaultServer;

    if (!clientAllowedServer(clientConfig, server)) {
        server = defaultServer;
    }

    const [discoveryState, discoverServer] = useAsyncCallback(
        useCallback(async (serverName: string) => {
            const response = await autoDiscovery(fetch, serverName);
            return {
                serverName,
                response,
            };
        }, [])
    );

    useEffect(() => {
        if (server) discoverServer(server);
    }, [discoverServer, server]);

    // if server is mismatches with path server, update path
    useEffect(() => {
        if (!urlEncodedServer || decodeURIComponent(urlEncodedServer) !== server) {
            navigate(
                generatePath(currentAuthPath(location.pathname), {
                    server: encodeURIComponent(server),
                }),
                { replace: true }
            );
        }
    }, [urlEncodedServer, navigate, location, server]);

    const selectServer = useCallback(
        (newServer: string) => {
            if (newServer === server) {
                if (discoveryState.status === AsyncStatus.Loading) return;
                discoverServer(server);
                return;
            }
            navigate(
                generatePath(currentAuthPath(location.pathname), { server: encodeURIComponent(newServer) })
            );
        },
        [navigate, location, discoveryState, server, discoverServer]
    );

    const [autoDiscoveryError, autoDiscoveryInfo] =
        discoveryState.status === AsyncStatus.Success ? discoveryState.data.response : [];

    return (
        <Scroll variant="Background" visibility="Hover" size="300" hideTrack>
            <Box
                className={classNames(css.AuthLayout)}
                direction="Column"
                alignItems="Center"
                justifyContent="SpaceBetween"
                gap="400"
            >
                <Box direction="Column" className={css.AuthCard}>
                    <Header className={css.AuthHeader} size="600" variant="Surface">
                        <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
                            <img className={css.AuthLogo} src={CinnySVG} alt="Client Logo" />
                            <Text size="H3">{cons.name}</Text>
                        </Box>
                    </Header>
                    <Box className={css.AuthCardContent} direction="Column">
                        <Box direction="Column" gap="100">
                            <ServerPicker
                                server={server}
                                serverList={clientConfig.homeserverList ?? []}
                                allowCustomServer={clientConfig.allowCustomHomeservers}
                                onServerChange={selectServer}
                            />
                        </Box>
                        {discoveryState.status === AsyncStatus.Loading && (
                            <AuthLayoutLoading message={getText('form.homeserver_loading')} />
                        )}
                        {discoveryState.status === AsyncStatus.Error && (
                            <AuthLayoutError message={getText('form.homeserver_error')} />
                        )}
                        {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_PROMPT && (
                            <AuthLayoutError
                                message={getText('error.hs_failed_to_connect', autoDiscoveryError.host)}
                            />
                        )}
                        {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_ERROR && (
                            <AuthLayoutError message={getText('error.hs_invalid_base')} />
                        )}
                        {discoveryState.status === AsyncStatus.Success && autoDiscoveryInfo && (
                            <AuthServerProvider value={discoveryState.data.serverName}>
                                <AutoDiscoveryInfoProvider value={autoDiscoveryInfo}>
                                    <SpecVersionsLoader
                                        baseUrl={autoDiscoveryInfo['m.homeserver'].base_url}
                                        fallback={() => (
                                            <AuthLayoutLoading
                                                message={getText('auth.connecting', autoDiscoveryInfo['m.homeserver'].base_url)}
                                            />
                                        )}
                                        error={() => (
                                            <AuthLayoutError message={getText('error.hs_unavailable')} />
                                        )}
                                    >
                                        {(specVersions) => (
                                            <SpecVersionsProvider value={specVersions}>
                                                <AuthFlowsLoader
                                                    fallback={() => (
                                                        <AuthLayoutLoading message={getText('auth.loading_flow')} />
                                                    )}
                                                    error={() => (
                                                        <AuthLayoutError message={getText('error.loading_flow')} />
                                                    )}
                                                >
                                                    {(authFlows) => (
                                                        <AuthFlowsProvider value={authFlows}>
                                                            <Outlet />
                                                        </AuthFlowsProvider>
                                                    )}
                                                </AuthFlowsLoader>
                                            </SpecVersionsProvider>
                                        )}
                                    </SpecVersionsLoader>
                                </AutoDiscoveryInfoProvider>
                            </AuthServerProvider>
                        )}
                    </Box>
                </Box>
                <AuthFooter />
            </Box>
        </Scroll>
    );
}
