import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Typography } from 'react-you-ui';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { PasswordLoginForm } from './PasswordLoginForm';
import { SSOLogin } from '../SSOLogin';
import { TokenLogin } from './TokenLogin';
import { OrDivider } from '../OrDivider';
import { getLoginPath, getRegisterPath, withSearchParam } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { LoginPathSearchParams } from '../../paths';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { getText } from '../../../../lang';

const getLoginTokenSearchParam = () => {
	// when using hasRouter query params in existing route
	// gets ignored by react-router, so we need to read it ourself
	// we only need to read loginToken as it's the only param that
	// is provided by external entity. example: SSO login
	const parmas = new URLSearchParams(window.location.search);
	const loginToken = parmas.get('loginToken');
	return loginToken ?? undefined;
};

const useLoginSearchParams = (searchParams: URLSearchParams): LoginPathSearchParams =>
	useMemo(
		() => ({
			username: searchParams.get('username') ?? undefined,
			email: searchParams.get('email') ?? undefined,
			loginToken: searchParams.get('loginToken') ?? undefined,
		}),
		[searchParams]
	);

export function Login() {
	const server = useAuthServer();
	const { hashRouter } = useClientConfig();
	const { loginFlows } = useAuthFlows();
	const [searchParams] = useSearchParams();
	const loginSearchParams = useLoginSearchParams(searchParams);
	const ssoRedirectUrl = usePathWithOrigin(getLoginPath(server));
	const loginTokenForHashRouter = getLoginTokenSearchParam();
	const absoluteLoginPath = usePathWithOrigin(getLoginPath(server));

	if (hashRouter?.enabled && loginTokenForHashRouter) {
		window.location.replace(
			withSearchParam(absoluteLoginPath, {
				loginToken: loginTokenForHashRouter,
			})
		);
	}

	const parsedFlows = useParsedLoginFlows(loginFlows.flows);

	return (
		<Box display='flex' flexDirection="column" gap="10px">
			<Typography style={{ margin: 0 }} variant='h6'>
				{getText('loginpage.login-title')}
			</Typography>
			{loginSearchParams.loginToken && (
				<TokenLogin token={loginSearchParams.loginToken} />
			)}
			{parsedFlows.password && (
				<>
					<PasswordLoginForm
						defaultUsername={loginSearchParams.username}
						defaultEmail={loginSearchParams.email}
					/>
					<span data-spacing-node />
					{parsedFlows.sso && <OrDivider />}
				</>
			)}
			{parsedFlows.sso && (
				<>
					<SSOLogin
						providers={parsedFlows.sso.identity_providers}
						redirectUrl={ssoRedirectUrl}
						asIcons={
							parsedFlows.password !== undefined && parsedFlows.sso.identity_providers.length > 2
						}
					/>
					<span data-spacing-node />
				</>
			)}
			{!parsedFlows.password && !parsedFlows.sso && (
				<>
					<Typography color='var(--md-sys-color-error)'>
						{getText('error.no-login-methods', server)}
					</Typography>
					<span data-spacing-node />
				</>
			)}
			<Typography align='center' size='medium'>
				{getText('loginpage.register-tip')} <Link to={getRegisterPath(server)}>{getText('loginpage.register-link')}</Link>
			</Typography>
		</Box>
	);
}
