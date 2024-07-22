import { Box, Text } from 'folds';
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
        <Box direction="Column" gap="500">
            <Text size="H2" priority="400">
                {getText('form.reset_password')}
            </Text>
            <PasswordResetForm defaultEmail={resetPasswordSearchParams.email} />
            <span data-spacing-node />

            <Text align="Center">
                {getText('password_reset.login_tip')} <Link to={getLoginPath(server)}>{getText('password_reset.login_link')}</Link>
            </Text>
        </Box>
    );
}
