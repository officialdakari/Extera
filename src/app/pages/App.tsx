import React, { useEffect, useMemo, useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities';

import { createTheme, ThemeProvider } from '@mui/material';
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
	const mode = useMemo(() => {
		if (!useSystemTheme) {
			return themeIndex === 2 ? 'dark' : 'light';
		}
		return settings.darkModeQueryList.matches ? 'dark' : 'light';
	}, [themeIndex, useSystemTheme]);

	const [accentColor] = useState('#d70060');
	const [colors] = useState(themeFromSourceColor(argbFromHex(accentColor), []));

	const theme = useMemo(() => createTheme({
		cssVariables: {
			cssVarPrefix: 'mui',
		},
		palette: {
			primary: {
				main: hexFromArgb(colors.schemes[mode].primary),
				dark: hexFromArgb(colors.schemes.dark.primary),
				light: hexFromArgb(colors.schemes.light.primary),
				contrastText: hexFromArgb(colors.schemes[mode].onPrimary),
			},
			secondary: {
				main: hexFromArgb(colors.schemes[mode].secondary),
				dark: hexFromArgb(colors.schemes.dark.secondary),
				light: hexFromArgb(colors.schemes.light.secondary),
				contrastText: hexFromArgb(colors.schemes[mode].onSecondary),
			},
			warning: {
				main: hexFromArgb(colors.schemes[mode].tertiary),
				dark: hexFromArgb(colors.schemes.dark.tertiary),
				light: hexFromArgb(colors.schemes.light.tertiary),
				contrastText: hexFromArgb(colors.schemes[mode].onTertiary),
			},
			error: {
				main: hexFromArgb(colors.schemes[mode].error),
				dark: hexFromArgb(colors.schemes.dark.error),
				light: hexFromArgb(colors.schemes.light.error),
				contrastText: hexFromArgb(colors.schemes[mode].onError),
			},
			background: {
				default: hexFromArgb(colors.schemes[mode].surface),
				paper: hexFromArgb(colors.schemes[mode].surface),
			},
			divider: hexFromArgb(colors.schemes[mode].outlineVariant),
			mode,
		},
	}), [mode, colors]);

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

	return theme && (
		<ThemeProvider theme={theme}>
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
