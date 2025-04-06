import React, { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthDict, AuthType, MatrixError, createClient } from 'matrix-js-sdk';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from 'react-you-ui';
import { Box } from 'folds';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { usePasswordEmail } from '../../../hooks/usePasswordEmail';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { FieldError } from '../FiledError';
import { UIAFlowOverlay } from '../../../components/UIAFlowOverlay';
import { EmailStageDialog } from '../../../components/uia-stages';
import { ResetPasswordResult, resetPassword } from './resetPasswordUtil';
import { getLoginPath, withSearchParam } from '../../pathUtils';
import { LoginPathSearchParams } from '../../paths';
import { getUIAError, getUIAErrorCode } from '../../../utils/matrix-uia';
import { getText, translate } from '../../../../lang';

type FormData = {
	email: string;
	password: string;
	clientSecret: string;
};

function ResetPasswordComplete({ email }: { email?: string }) {
	const server = useAuthServer();

	const navigate = useNavigate();

	const handleClick = () => {
		const path = getLoginPath(server);
		if (email) {
			navigate(withSearchParam<LoginPathSearchParams>(path, { email }));
			return;
		}
		navigate(path);
	};

	return (
		<Dialog open>
			<DialogTitle>
				{getText('password_reset.success')}
			</DialogTitle>
			<DialogActions>
				<Button onClick={handleClick}>
					{getText('password_reset.login')}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

type PasswordResetFormProps = {
	defaultEmail?: string;
};
export function PasswordResetForm({ defaultEmail }: PasswordResetFormProps) {
	const server = useAuthServer();

	const serverDiscovery = useAutoDiscoveryInfo();
	const baseUrl = serverDiscovery['m.homeserver'].base_url;
	const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

	const [formData, setFormData] = useState<FormData>();

	const [passwordEmailState, passwordEmail] = usePasswordEmail(mx);

	const [resetPasswordState, handleResetPassword] = useAsyncCallback<
		ResetPasswordResult,
		MatrixError,
		[AuthDict, string]
	>(useCallback(async (authDict, newPassword) => resetPassword(mx, authDict, newPassword), [mx]));

	const [ongoingAuthData, resetPasswordResult] =
		resetPasswordState.status === AsyncStatus.Success ? resetPasswordState.data : [];
	const resetPasswordError =
		resetPasswordState.status === AsyncStatus.Error ? resetPasswordState.error : undefined;

	const flowErrorCode = ongoingAuthData && getUIAErrorCode(ongoingAuthData);
	const flowError = ongoingAuthData && getUIAError(ongoingAuthData);

	let waitingToVerifyEmail = true;
	if (resetPasswordResult) waitingToVerifyEmail = false;
	if (ongoingAuthData && flowErrorCode === undefined) waitingToVerifyEmail = false;
	if (resetPasswordError) waitingToVerifyEmail = false;
	if (resetPasswordState.status === AsyncStatus.Loading) waitingToVerifyEmail = false;

	// We only support UIA m.login.password stage for reset password
	// So we will assume to process it as soon as
	// we have 401 with no error on initial request.
	useEffect(() => {
		if (formData && ongoingAuthData && !flowErrorCode) {
			handleResetPassword(
				{
					type: AuthType.Password,
					identifier: {
						type: 'm.id.thirdparty',
						medium: 'email',
						address: formData.email,
					},
					password: formData.password,
				},
				formData.password
			);
		}
	}, [ongoingAuthData, flowErrorCode, formData, handleResetPassword]);

	const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
		evt.preventDefault();
		const { emailInput, passwordInput, confirmPasswordInput } = evt.target as HTMLFormElement & {
			emailInput: HTMLInputElement;
			passwordInput: HTMLInputElement;
			confirmPasswordInput: HTMLInputElement;
		};

		const email = emailInput.value.trim();
		const password = passwordInput.value;
		const confirmPassword = confirmPasswordInput.value;
		if (!email) {
			emailInput.focus();
			return;
		}
		if (password !== confirmPassword) return;

		const clientSecret = mx.generateClientSecret();
		passwordEmail(email, clientSecret);
		setFormData({
			email,
			password,
			clientSecret,
		});
	};

	const handleCancel = () => {
		window.location.reload();
	};

	const handleSubmitRequest = useCallback(
		(authDict: AuthDict) => {
			if (!formData) return;
			const { password } = formData;
			handleResetPassword(authDict, password);
		},
		[formData, handleResetPassword]
	);

	return (
		<Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
			<Typography>
				{translate(
					'password_reset.tip',
					<strong>{server}</strong>
				)}
			</Typography>
			<Box direction="Column" gap="100">
				<TextField
					defaultValue={defaultEmail}
					type="email"
					name="emailInput"
					required
					variant='filled'
					label={getText('form.email')}
				/>
				{passwordEmailState.status === AsyncStatus.Error && (
					<FieldError
						message={`${passwordEmailState.error.errcode}: ${passwordEmailState.error.data?.error}`}
					/>
				)}
			</Box>
			<ConfirmPasswordMatch initialValue>
				{(match, doMatch, passRef, confPassRef) => (
					<>
						<Box direction="Column" gap="100">
							<TextField
								ref={passRef as any}
								onChange={doMatch}
								name="passwordInput"
								type='password'
								variant="filled"
								required
								label={getText('password_reset.new')}
							/>
						</Box>
						<Box direction="Column" gap="100">
							<TextField
								ref={confPassRef as any}
								onChange={doMatch}
								name="confirmPasswordInput"
								variant='filled'
								required
								error={!match}
								label={getText('password_reset.confirm')}
							/>
						</Box>
					</>
				)}
			</ConfirmPasswordMatch>
			{resetPasswordError && (
				<FieldError
					message={`${resetPasswordError.errcode}: ${resetPasswordError.data?.error ?? getText('error.password_reset')}`}
				/>
			)}
			<span data-spacing-node />
			<Button type="submit" variant="filled">
				{getText('password_reset.button')}
			</Button>

			{resetPasswordResult && <ResetPasswordComplete email={formData?.email} />}

			{passwordEmailState.status === AsyncStatus.Success && formData && waitingToVerifyEmail && (
				<UIAFlowOverlay currentStep={1} stepCount={1} onCancel={handleCancel}>
					<EmailStageDialog
						stageData={{
							type: AuthType.Email,
							errorCode: flowErrorCode,
							error: flowError,
							session: ongoingAuthData?.session,
						}}
						submitAuthDict={handleSubmitRequest}
						email={formData.email}
						clientSecret={formData.clientSecret}
						requestEmailToken={passwordEmail}
						emailTokenState={passwordEmailState}
						onCancel={handleCancel}
					/>
				</UIAFlowOverlay>
			)}

			<Dialog
				open={passwordEmailState.status === AsyncStatus.Loading ||
					resetPasswordState.status === AsyncStatus.Loading}
			>
				<DialogContent>
					<CircularProgress />
				</DialogContent>
			</Dialog>
		</Box>
	);
}
