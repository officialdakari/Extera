import { Avatar, AvatarImage, Box } from 'folds';
import { IIdentityProvider, createClient } from 'matrix-js-sdk';
import React, { useMemo } from 'react';
import { Button, Typography } from 'react-you-ui';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { getText } from '../../../lang';
import { mxcUrlToHttp } from '../../utils/matrix';

type SSOLoginProps = {
	providers: IIdentityProvider[];
	asIcons?: boolean;
	redirectUrl: string;
};
export function SSOLogin({ providers, redirectUrl, asIcons }: SSOLoginProps) {
	const discovery = useAutoDiscoveryInfo();
	const baseUrl = discovery['m.homeserver'].base_url;
	const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

	const getSSOIdUrl = (ssoId: string): string => mx.getSsoLoginUrl(redirectUrl, 'sso', ssoId);

	const anyAsBtn = providers.find(
		(provider) => !provider.icon || !mxcUrlToHttp(mx, provider.icon, 96, 96, 'crop')
	);

	return (
		<Box justifyContent="Center" gap="600" wrap="Wrap">
			{providers.map((provider) => {
				const { id, name, icon } = provider;
				const iconUrl = icon && mxcUrlToHttp(mx, icon, 96, 96, 'crop');

				const buttonTitle = getText('sso.continue_with', name);

				if (!anyAsBtn && iconUrl && asIcons) {
					return (
						<Avatar
							style={{ cursor: 'pointer' }}
							key={id}
							as="a"
							href={getSSOIdUrl(id)}
							aria-label={buttonTitle}
							size="300"
							radii="300"
						>
							<AvatarImage src={iconUrl} alt={name} title={buttonTitle} />
						</Avatar>
					);
				}

				return (
					<Button
						style={{ width: '100%' }}
						key={id}
						href={getSSOIdUrl(id)}
						variant="filled"
					>
						{iconUrl && (
							<Avatar size="200" radii="300">
								<AvatarImage src={iconUrl} alt={name} />
							</Avatar>
						)}
						<Typography variant="span" size="large">
							{buttonTitle}
						</Typography>
					</Button>
				);
			})}
		</Box>
	);
}
