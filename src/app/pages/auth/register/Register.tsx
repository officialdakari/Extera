import React, { useMemo } from 'react';
import { Box, Text, color } from 'folds';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { RegisterFlowStatus, useAuthFlows } from '../../../hooks/useAuthFlows';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { PasswordRegisterForm, SUPPORTED_REGISTER_STAGES } from '../register/PasswordRegisterForm';
import { OrDivider } from '../OrDivider';
import { SSOLogin } from '../SSOLogin';
import { SupportedUIAFlowsLoader } from '../../../components/SupportedUIAFlowsLoader';
import { getLoginPath } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { RegisterPathSearchParams } from '../../paths';
import { getText } from '../../../../lang';

const useRegisterSearchParams = (searchParams: URLSearchParams): RegisterPathSearchParams =>
    useMemo(
        () => ({
            username: searchParams.get('username') ?? undefined,
            email: searchParams.get('email') ?? undefined,
            token: searchParams.get('token') ?? undefined,
        }),
        [searchParams]
    );

export function Register() {
    const server = useAuthServer();
    const { loginFlows, registerFlows } = useAuthFlows();
    const [searchParams] = useSearchParams();
    const registerSearchParams = useRegisterSearchParams(searchParams);
    const { sso } = useParsedLoginFlows(loginFlows.flows);

    // redirect to /login because only that path handle m.login.token
    const ssoRedirectUrl = usePathWithOrigin(getLoginPath(server));

    return (
        <Box direction="Column" gap="500">
            <Text size="H2" priority="400">
                {getText('form.register')}
            </Text>
            {registerFlows.status === RegisterFlowStatus.RegistrationDisabled && !sso && (
                <Text style={{ color: color.Critical.Main }} size="T300">
                    {getText('error.register.disabled')}
                </Text>
            )}
            {registerFlows.status === RegisterFlowStatus.RateLimited && !sso && (
                <Text style={{ color: color.Critical.Main }} size="T300">
                    {getText('error.generic.rate_limited')}
                </Text>
            )}
            {registerFlows.status === RegisterFlowStatus.InvalidRequest && !sso && (
                <Text style={{ color: color.Critical.Main }} size="T300">
                    {getText('error.register.flows_loading_error')}
                </Text>
            )}
            {registerFlows.status === RegisterFlowStatus.FlowRequired && (
                <>
                    <SupportedUIAFlowsLoader
                        flows={registerFlows.data.flows ?? []}
                        supportedStages={SUPPORTED_REGISTER_STAGES}
                    >
                        {(supportedFlows) =>
                            supportedFlows.length === 0 ? (
                                <Text style={{ color: color.Critical.Main }} size="T300">
                                    {getText('error.register.unsupported')}
                                </Text>
                            ) : (
                                <PasswordRegisterForm
                                    authData={registerFlows.data}
                                    uiaFlows={supportedFlows}
                                    defaultUsername={registerSearchParams.username}
                                    defaultEmail={registerSearchParams.email}
                                    defaultRegisterToken={registerSearchParams.token}
                                />
                            )
                        }
                    </SupportedUIAFlowsLoader>
                    <span data-spacing-node />
                    {sso && <OrDivider />}
                </>
            )}
            {sso && (
                <>
                    <SSOLogin
                        providers={sso.identity_providers}
                        redirectUrl={ssoRedirectUrl}
                        asIcons={
                            registerFlows.status === RegisterFlowStatus.FlowRequired &&
                            sso.identity_providers.length > 2
                        }
                    />
                    <span data-spacing-node />
                </>
            )}
            <Text align="Center">
                {getText('register.login_tip')} <Link to={getLoginPath(server)}>{getText('register.login_link')}</Link>
            </Text>
        </Box>
    );
}
