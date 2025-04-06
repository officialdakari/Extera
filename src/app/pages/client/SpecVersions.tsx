import React, { ReactNode } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogTitle, Typography } from 'react-you-ui';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { SplashScreen } from '../../components/splash-screen';
import { getText } from '../../../lang';

export function SpecVersions({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
	return (
		<SpecVersionsLoader
			baseUrl={baseUrl}
			fallback={() => (
				<SplashScreen>
					<Box display='flex' flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap="10px">
						<CircularProgress />
						<Typography>{getText('connecting')}</Typography>
					</Box>
				</SplashScreen>
			)}
			error={(err, retry, ignore) => (
				<SplashScreen>
					<Box display='flex' flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap="10px">
						<Dialog open onClose={(e) => e.preventDefault()}>
							<DialogTitle>
								{getText('error.hs_connect')}
							</DialogTitle>
							<Button variant='filled-tonal' onClick={ignore}>
								{getText('btn.continue')}
							</Button>
							<Button onClick={retry}>
								{getText('btn.retry')}
							</Button>
						</Dialog>
					</Box>
				</SplashScreen>
			)}
		>
			{(versions) => <SpecVersionsProvider value={versions}>{children}</SpecVersionsProvider>}
		</SpecVersionsLoader>
	);
}
