import React, { FormEventHandler, useCallback } from 'react';
import {
	Box,
} from 'folds';
import { Link } from 'react-router-dom';
import { MatrixError } from 'matrix-js-sdk';
import { Button, CircularProgress, Dialog, DialogContent, TextField, Typography } from 'react-you-ui';
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
import { FieldError } from '../FiledError';
import { getResetPasswordPath } from '../../pathUtils';
import { getText } from '../../../../lang';
import cons from '../../../../client/state/cons';

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
				<TextField label={getText('form.username')} variant='filled' name='usernameInput' required defaultValue={defaultUsername ?? defaultEmail} />
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
				<TextField label={getText('form.password')} variant='filled' name='passwordInput' required type='password' />
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
						<Typography variant="span" size="medium" align="right">
							<Link to={getResetPasswordPath(server)}>{getText('login.forgot_password_link')}</Link>
						</Typography>
					</Box>
				</Box>
			</Box>
			<Button type="submit" variant="filled">
				{getText('login.login_button')}
			</Button>

			{/* <Overlay
				open={
					loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
				}
				backdrop={<OverlayBackdrop />}
			>
				<OverlayCenter>
					<CircularProgress />
				</OverlayCenter>
			</Overlay> */}
			<Dialog
				open={
					loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
				}
			>
				<DialogContent>
					<CircularProgress />
				</DialogContent>
			</Dialog>
		</Box>
	);
}
