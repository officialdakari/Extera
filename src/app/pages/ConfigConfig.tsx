import React from 'react';
import { Box, CircularProgress, DialogActions, Dialog, DialogContent, DialogTitle, Typography, Button } from 'react-you-ui';
import { SplashScreen } from '../components/splash-screen';
// import { RandomFact } from '../../fact';
import { getText } from '../../lang';

export function ConfigConfigLoading() {
	return (
		<SplashScreen>
			<Box display='flex' flexGrow={1} flexDirection="column" gap="10px" alignItems="center" justifyContent="center">
				<CircularProgress />
				<Typography>
					{getText('loading')}
				</Typography>
			</Box>
		</SplashScreen>
	);
}

type ConfigConfigErrorProps = {
	error: unknown;
	retry: () => void;
	ignore: () => void;
};
export function ConfigConfigError({ error, retry, ignore }: ConfigConfigErrorProps) {
	return (
		<SplashScreen>
			<Box display='flex' flexGrow={1} flexDirection="column" gap="400" alignItems="center" justifyContent="center">
				<Dialog open>
					<DialogTitle>
						{getText('error.config_load')}
					</DialogTitle>
					<DialogContent>
						{typeof error === 'object' &&
							error &&
							'message' in error &&
							typeof error.message === 'string' && (
								<Typography color='var(--md-sys-color-error)'>
									{error.message}
								</Typography>
							)}
					</DialogContent>
					<DialogActions>
						<Button variant='filled-tonal' onClick={ignore}>
							{getText('btn.continue')}
						</Button>
						<Button onClick={retry}>
							{getText('btn.retry')}
						</Button>
					</DialogActions>
				</Dialog>
			</Box>
		</SplashScreen>
	);
}
