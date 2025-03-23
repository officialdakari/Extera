import React, { useEffect, useMemo, useState } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createTheme, Theme, ThemeProvider } from '@mui/material';
import MaterialDynamicColors from 'material-dynamic-colors';
import { IMaterialDynamicColorsThemeColor } from 'material-dynamic-colors/src/cdn/interfaces';
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
	const [accentColor] = useState('#e22216');
	const [colors, setColors] = useState<IMaterialDynamicColorsThemeColor | null>(null);
	const [theme, setTheme] = useState<Theme | null>(null);
	// const theme = useMemo(
	// 	() =>
	// 		createTheme({
	// 			palette: {
	// 				mode,
	// 			}
	// 		}),
	// 	[mode]
	// );

	useEffect(() => {
		MaterialDynamicColors(accentColor).then((c) => {
			if (mode === 'dark') {
				setColors(c.dark);
			} else {
				setColors(c.light);
			}
		});
	}, [accentColor, mode]);

	useEffect(() => {
		if (colors) {
			setTheme(createTheme({
				palette: {
					background: {
						default: colors.surface,
						paper: colors.surface,
					},
					primary: {
						main: colors.primary,
						light: colors.primary,
						dark: colors.primary,
					},
					secondary: {
						main: colors.secondary,
						light: colors.secondary,
						dark: colors.secondary,
					},
					action: {
						active: colors.onSurface,
						hover: colors.onSurface,
						selected: colors.onSurface,
						disabled: colors.onSurface,
						disabledBackground: colors.onSurface,
					},
					divider: colors.outline,
					text: {
						primary: colors.onSurface,
						secondary: colors.onSurface,
						disabled: colors.onSurface,
					},
					info: {
						main: colors.primary,
						light: colors.primary,
						dark: colors.primary,
					},
					success: {
						main: colors.primary,
						light: colors.primary,
						dark: colors.primary,
					},
					warning: {
						main: colors.primary,
						light: colors.primary,
						dark: colors.primary,
					},
					error: {
						main: colors.primary,
						light: colors.primary,
						dark: colors.primary,
					},
					mode,
				},
			}));
		}
	}, [colors, mode]);

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
