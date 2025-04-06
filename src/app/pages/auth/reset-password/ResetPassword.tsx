import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Typography } from 'react-you-ui';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { PasswordResetForm } from './PasswordResetForm';
import { ResetPasswordPathSearchParams } from '../../paths';
import { getText } from '../../../../lang';

const useResetPasswordSearchParams = (
	searchParams: URLSearchParams
): ResetPasswordPathSearchParams =>
	useMemo(
		() => ({
			email: searchParams.get('email') ?? undefined,
		}),
		[searchParams]
	);

export function ResetPassword() {
	const server = useAuthServer();
	const [searchParams] = useSearchParams();
	const resetPasswordSearchParams = useResetPasswordSearchParams(searchParams);

	return (
		<Box display='flex' flexDirection="column" gap="10px">
			<Typography variant='h6'>
				{getText('form.reset_password')}
			</Typography>
			<PasswordResetForm defaultEmail={resetPasswordSearchParams.email} />
			<span data-spacing-node />

			<Typography align='center' size='medium'>
				{getText('password_reset.login_tip')} <Link to={getLoginPath(server)}>{getText('password_reset.login_link')}</Link>
			</Typography>
		</Box>
	);
}
