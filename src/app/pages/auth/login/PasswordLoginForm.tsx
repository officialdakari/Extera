import React, { FormEventHandler, MouseEventHandler, useCallback, useState } from 'react';
import {
    Box,
    Button,
    Header,
    IconButton,
    Input,
    Menu,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    PopOut,
    RectCords,
    Spinner,
    Text,
    config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Link } from 'react-router-dom';
import { MatrixError } from 'matrix-js-sdk';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../../utils/matrix';
import { EMAIL_REGEX } from '../../../utils/regex';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {
    CustomLoginResponse,
    LoginError,
    factoryGetBaseUrl,
    login,
    useLoginComplete,
} from './loginUtil';
import { PasswordInput } from '../../../components/password-input/PasswordInput';
import { FieldError } from '../FiledError';
import { getResetPasswordPath } from '../../pathUtils';
import { getText } from '../../../../lang';
import cons from '../../../../client/state/cons';
import Icon from '@mdi/react';
import { mdiAlertCircleOutline } from '@mdi/js';

function UsernameHint({ server }: { server: string }) {
    const [anchor, setAnchor] = useState<RectCords>();

    const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
        setAnchor(evt.currentTarget.getBoundingClientRect());
    };
    return (
        <PopOut
            anchor={anchor}
            position="Top"
            align="End"
            content={
                <FocusTrap
                    focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setAnchor(undefined),
                        clickOutsideDeactivates: true,
                    }}
                >
                    <Menu>
                        <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
                            <Text size="L400">{getText('usernamehint.header-text')}</Text>
                        </Header>
                        <Box
                            style={{ padding: config.space.S200, paddingTop: 0 }}
                            direction="Column"
                            tabIndex={0}
                            gap="100"
                        >
                            <Text size="T300">
                                <Text as="span" size="Inherit" priority="300">
                                    {getText('hint.username')}
                                </Text>{' '}
                                johndoe
                            </Text>
                            <Text size="T300">
                                <Text as="span" size="Inherit" priority="300">
                                    {getText('hint.mxid')}
                                </Text>
                                {` @johndoe:${server}`}
                            </Text>
                            <Text size="T300">
                                <Text as="span" size="Inherit" priority="300">
                                    {getText('hint.email')}
                                </Text>
                                {` johndoe@${server}`}
                            </Text>
                        </Box>
                    </Menu>
                </FocusTrap>
            }
        >
            <IconButton
                tabIndex={-1}
                onClick={handleOpenMenu}
                type="button"
                variant="Background"
                size="300"
                radii="300"
                aria-pressed={!!anchor}
            >
                <Icon style={{ opacity: config.opacity.P300 }} size={1} path={mdiAlertCircleOutline} />
            </IconButton>
        </PopOut>
    );
}

type PasswordLoginFormProps = {
    defaultUsername?: string;
    defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
    const server = useAuthServer();
    const clientConfig = useClientConfig();

    const serverDiscovery = useAutoDiscoveryInfo();
    const baseUrl = serverDiscovery['m.homeserver'].base_url;

    const [loginState, startLogin] = useAsyncCallback<
        CustomLoginResponse,
        MatrixError,
        Parameters<typeof login>
    >(useCallback(login, []));

    useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

    const handleUsernameLogin = (username: string, password: string) => {
        startLogin(baseUrl, {
            type: 'm.login.password',
            identifier: {
                type: 'm.id.user',
                user: username,
            },
            password,
            initial_device_display_name: `${cons.name} Web`,
        });
    };

    const handleMxIdLogin = async (mxId: string, password: string) => {
        const mxIdServer = getMxIdServer(mxId);
        const mxIdUsername = getMxIdLocalPart(mxId);
        if (!mxIdServer || !mxIdUsername) return;

        const getBaseUrl = factoryGetBaseUrl(clientConfig, mxIdServer);

        startLogin(getBaseUrl, {
            type: 'm.login.password',
            identifier: {
                type: 'm.id.user',
                user: mxIdUsername,
            },
            password,
            initial_device_display_name: `${cons.name} Web`,
        });
    };
    const handleEmailLogin = (email: string, password: string) => {
        startLogin(baseUrl, {
            type: 'm.login.password',
            identifier: {
                type: 'm.id.thirdparty',
                medium: 'email',
                address: email,
            },
            password,
            initial_device_display_name: `${cons.name} Web`,
        });
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const { usernameInput, passwordInput } = evt.target as HTMLFormElement & {
            usernameInput: HTMLInputElement;
            passwordInput: HTMLInputElement;
        };

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username) {
            usernameInput.focus();
            return;
        }
        if (!password) {
            passwordInput.focus();
            return;
        }

        if (isUserId(username)) {
            handleMxIdLogin(username, password);
            return;
        }
        if (EMAIL_REGEX.test(username)) {
            handleEmailLogin(username, password);
            return;
        }
        handleUsernameLogin(username, password);
    };

    return (
        <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
            <Box direction="Column" gap="100">
                <Text as="label" size="L400" priority="300">
                    {getText('form.username')}
                </Text>
                <Input
                    defaultValue={defaultUsername ?? defaultEmail}
                    style={{ paddingRight: config.space.S300 }}
                    name="usernameInput"
                    variant="Background"
                    size="500"
                    required
                    outlined
                    after={<UsernameHint server={server} />}
                />
                {loginState.status === AsyncStatus.Error && (
                    <>
                        {loginState.error.errcode === LoginError.ServerNotAllowed && (
                            <FieldError message={getText('error.login.server_not_allowed')} />
                        )}
                        {loginState.error.errcode === LoginError.InvalidServer && (
                            <FieldError message={getText('error.login.invalid_server')} />
                        )}
                    </>
                )}
            </Box>
            <Box direction="Column" gap="100">
                <Text as="label" size="L400" priority="300">
                    {getText('form.password')}
                </Text>
                <PasswordInput name="passwordInput" variant="Background" size="500" outlined required />
                <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
                    {loginState.status === AsyncStatus.Error && (
                        <>
                            {loginState.error.errcode === LoginError.Forbidden && (
                                <FieldError message={getText('error.login.forbidden')} />
                            )}
                            {loginState.error.errcode === LoginError.UserDeactivated && (
                                <FieldError message={getText('error.login.user_deactivated')} />
                            )}
                            {loginState.error.errcode === LoginError.InvalidRequest && (
                                <FieldError message={getText('error.login.invalid_request')} />
                            )}
                            {loginState.error.errcode === LoginError.RateLimited && (
                                <FieldError message={getText('error.login.rate_limited')} />
                            )}
                            {loginState.error.errcode === LoginError.Unknown && (
                                <FieldError message={getText('error.login.unknown')} />
                            )}
                        </>
                    )}
                    <Box grow="Yes" shrink="No" justifyContent="End">
                        <Text as="span" size="T200" priority="400" align="Right">
                            <Link to={getResetPasswordPath(server)}>{getText('login.forgot_password_link')}</Link>
                        </Text>
                    </Box>
                </Box>
            </Box>
            <Button type="submit" variant="Primary" size="500">
                <Text as="span" size="B500">
                    {getText('login.login_button')}
                </Text>
            </Button>

            <Overlay
                open={
                    loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
                }
                backdrop={<OverlayBackdrop />}
            >
                <OverlayCenter>
                    <Spinner variant="Secondary" size="600" />
                </OverlayCenter>
            </Overlay>
        </Box>
    );
}
