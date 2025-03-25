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

	const [accentColor, setAccentColor] = useState(settings.getAccentColor());
	const colors = useMemo(() => themeFromSourceColor(argbFromHex(accentColor), []), [accentColor]);

	const theme = useMemo(() => createTheme({
		cssVariables: true,
		palette: {
			primary: {
				main: hexFromArgb(colors.schemes[mode].primaryContainer),
				dark: hexFromArgb(colors.schemes.dark.primaryContainer),
				light: hexFromArgb(colors.schemes.light.primaryContainer),
				contrastText: hexFromArgb(colors.schemes[mode].onPrimary),
			},
			secondary: {
				main: hexFromArgb(colors.schemes[mode].secondaryContainer),
				dark: hexFromArgb(colors.schemes.dark.secondaryContainer),
				light: hexFromArgb(colors.schemes.light.secondaryContainer),
				contrastText: hexFromArgb(colors.schemes[mode].onSecondary),
			},
			warning: {
				main: hexFromArgb(colors.schemes[mode].tertiaryContainer),
				dark: hexFromArgb(colors.schemes.dark.tertiaryContainer),
				light: hexFromArgb(colors.schemes.light.tertiaryContainer),
				contrastText: hexFromArgb(colors.schemes[mode].onTertiary),
			},
			error: {
				main: hexFromArgb(colors.schemes[mode].errorContainer),
				dark: hexFromArgb(colors.schemes.dark.errorContainer),
				light: hexFromArgb(colors.schemes.light.errorContainer),
				contrastText: hexFromArgb(colors.schemes[mode].onError),
			},
			background: {
				default: hexFromArgb(colors.schemes[mode].surfaceVariant),
				paper: hexFromArgb(colors.schemes[mode].surfaceVariant),
			},
			divider: hexFromArgb(colors.schemes[mode].outlineVariant),
			mode,
			contrastThreshold: 4.5,
		},
		components: {
			MuiButton: {
				styleOverrides: {
					root: {
						textTransform: 'none',
						borderRadius: '28px',
					},
				},
			},
			MuiAppBar: {
				styleOverrides: {
					root: {
						boxShadow: 'none',
					},
				},
			},
			MuiSwitch: {
				styleOverrides: {
					root: {
						padding: 8,
					},
					track: {
						borderRadius: 22 / 2,
						'&::before, &::after': {
							content: '""',
							position: 'absolute',
							top: '50%',
							transform: 'translateY(-50%)',
							width: 16,
							height: 16,
						},
						'&::before': {
							// backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
							// 	theme.palette.getContrastText(theme.palette.primary.main),
							// )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
							left: 12,
						},
						'&::after': {
							// backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
							// 	theme.palette.getContrastText(theme.palette.primary.main),
							// )}" d="M19,13H5V11H19V13Z" /></svg>')`,
							right: 12,
						},
					},
					thumb: {
						boxShadow: 'none',
						width: 16,
						height: 16,
						margin: 2,
					}
				},
			},
		},
	}), [mode, colors]);

	const screenSize = useScreenSize();
	const [navHidden, setNavHidden] = useState(true);

	const updateTheme = () => {
		setThemeIndex(settings.themeIndex);
		setUseSystemTheme(settings.useSystemTheme);
		setAccentColor(settings.accentColor);
	};

	useEffect(() => {
		settings.on(cons.events.settings.THEME_CHANGED, updateTheme);
		settings.on(cons.events.settings.SYSTEM_THEME_TOGGLED, updateTheme);
		settings.on(cons.events.settings.ACCENT_COLOR_CHANGED, updateTheme);
		return () => {
			settings.off(cons.events.settings.THEME_CHANGED, updateTheme);
			settings.off(cons.events.settings.SYSTEM_THEME_TOGGLED, updateTheme);
			settings.off(cons.events.settings.ACCENT_COLOR_CHANGED, updateTheme);
		};
	});

	return theme && (
		<ThemeProvider theme={theme}>
			<style>
				{`:root {
					--mui-palette-background-variant: ${hexFromArgb(colors.schemes[mode].surface)};
				}`}
			</style>
			{/* ^ This is terrible, but it works */}
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
