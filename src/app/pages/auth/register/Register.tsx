import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Typography } from 'react-you-ui';
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
		<Box display='flex' flexDirection="column" gap="10px">
			<Typography variant='h6'>
				{getText('form.register')}
			</Typography>
			{registerFlows.status === RegisterFlowStatus.RegistrationDisabled && !sso && (
				<Typography color='var(--md-sys-color-error)'>
					{getText('error.register.disabled')}
				</Typography>
			)}
			{registerFlows.status === RegisterFlowStatus.RateLimited && !sso && (
				<Typography color='var(--md-sys-color-error)'>
					{getText('error.generic.rate_limited')}
				</Typography>
			)}
			{registerFlows.status === RegisterFlowStatus.InvalidRequest && !sso && (
				<Typography color='var(--md-sys-color-error)'>
					{getText('error.register.flows_loading_error')}
				</Typography>
			)}
			{registerFlows.status === RegisterFlowStatus.FlowRequired && (
				<>
					<SupportedUIAFlowsLoader
						flows={registerFlows.data.flows ?? []}
						supportedStages={SUPPORTED_REGISTER_STAGES}
					>
						{(supportedFlows) =>
							supportedFlows.length === 0 ? (
								<Typography color='var(--md-sys-color-error)'>
									{getText('error.register.unsupported')}
								</Typography>
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
			<Typography align='center' size='medium'>
				{getText('register.login_tip')} <Link to={getLoginPath(server)}>{getText('register.login_link')}</Link>
			</Typography>
		</Box>
	);
}
