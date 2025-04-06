import {
    Box,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    Spinner,
    Text,
    color,
    config,
} from 'folds';
import React, { useCallback, useEffect } from 'react';
import { MatrixError } from 'matrix-js-sdk';
import Icon from '@mdi/react';
import { mdiAlert } from '@mdi/js';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { CustomLoginResponse, LoginError, login, useLoginComplete } from './loginUtil';
import { getText } from '../../../../lang';
import cons from '../../../../client/state/cons';

function LoginTokenError({ message }: { message: string }) {
    return (
        <Box
            style={{
                backgroundColor: color.Critical.Container,
                color: color.Critical.OnContainer,
                padding: config.space.S300,
                borderRadius: config.radii.R400,
            }}
            justifyContent="Start"
            alignItems="Start"
            gap="300"
        >
            <Icon size={1} path={mdiAlert} />
            <Box direction="Column" gap="100">
                <Text size="L400">Token Login</Text>
                <Text size="T300">
                    <b>{message}</b>
                </Text>
            </Box>
        </Box>
    );
}

type TokenLoginProps = {
    token: string;
};
export function TokenLogin({ token }: TokenLoginProps) {
    const discovery = useAutoDiscoveryInfo();
    const baseUrl = discovery['m.homeserver'].base_url;

    const [loginState, startLogin] = useAsyncCallback<
        CustomLoginResponse,
        MatrixError,
        Parameters<typeof login>
    >(useCallback(login, []));

    useEffect(() => {
        startLogin(baseUrl, {
            type: 'm.login.token',
            token,
            initial_device_display_name: `${cons.name} Web`,
        });
    }, [baseUrl, token, startLogin]);

    useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

    return (
        <>
            {loginState.status === AsyncStatus.Error && (
                <>
                    {loginState.error.errcode === LoginError.Forbidden && (
                        <LoginTokenError message={getText('error.login.forbidden')} />
                    )}
                    {loginState.error.errcode === LoginError.UserDeactivated && (
                        <LoginTokenError message={getText('error.login.user_deactivated')} />
                    )}
                    {loginState.error.errcode === LoginError.InvalidRequest && (
                        <LoginTokenError message={getText('error.login.invalid_request')} />
                    )}
                    {loginState.error.errcode === LoginError.RateLimited && (
                        <LoginTokenError message={getText('error.login.rate_limited')} />
                    )}
                    {loginState.error.errcode === LoginError.Unknown && (
                        <LoginTokenError message={getText('error.login.unknown')} />
                    )}
                </>
            )}
            <Overlay open={loginState.status !== AsyncStatus.Error} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <Spinner size="600" variant="Secondary" />
                </OverlayCenter>
            </Overlay>
        </>
    );
}
