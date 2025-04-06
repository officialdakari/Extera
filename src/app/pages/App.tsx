import React, { useEffect, useMemo, useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createTheme, ThemeProvider } from 'react-you-ui';
import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfigProvider } from '../hooks/useClientConfig';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';
import { ScreenSizeProvider, useScreenSize } from '../hooks/useScreenSize';
import { NavContextProvider } from '../hooks/useHideableNav';
import settings from '../../client/state/settings';
import cons from '../../client/state/cons';

const queryClient = new QueryClient();

function App() {
	const [themeIndex, setThemeIndex] = useState(settings.themeIndex);
	const [useSystemTheme, setUseSystemTheme] = useState(settings.useSystemTheme);
	const mode = useMemo(
		() => {
			if (!useSystemTheme) {
				return themeIndex === 2 ? 'dark' : 'light';
			}
			return settings.darkModeQueryList.matches ? 'dark' : 'light';
		},
		[themeIndex, useSystemTheme]
	);
	const theme = useMemo(
		() =>
			createTheme('#e22216'),
		[]
	);
	const screenSize = useScreenSize();
	const [navHidden, setNavHidden] = useState(true);

	const updateTheme = () => {
		setThemeIndex(settings.themeIndex);
		setUseSystemTheme(settings.useSystemTheme);
	};

	useEffect(() => {
		settings.on(cons.events.settings.THEME_CHANGED, updateTheme);
		settings.on(cons.events.settings.SYSTEM_THEME_TOGGLED, updateTheme);
		return () => {
			settings.off(cons.events.settings.THEME_CHANGED, updateTheme);
			settings.off(cons.events.settings.SYSTEM_THEME_TOGGLED, updateTheme);
		};
	});

	return (
		<ThemeProvider theme={theme} scheme={mode}>
			<NavContextProvider value={[navHidden, setNavHidden]}>
				<ScreenSizeProvider value={screenSize}>
					<FeatureCheck>
						<ClientConfigLoader
							fallback={() => <ConfigConfigLoading />}
							error={(err, retry, ignore) => (
								<ConfigConfigError error={err} retry={retry} ignore={ignore} />
							)}
						>
							{(clientConfig) => (
								<ClientConfigProvider value={clientConfig}>
									<QueryClientProvider client={queryClient}>
										<JotaiProvider>
											<RouterProvider router={createRouter(clientConfig, screenSize)} />
										</JotaiProvider>
									</QueryClientProvider>
								</ClientConfigProvider>
							)}
						</ClientConfigLoader>
					</FeatureCheck>
				</ScreenSizeProvider>
			</NavContextProvider>
		</ThemeProvider>
	);
}

export default App;
