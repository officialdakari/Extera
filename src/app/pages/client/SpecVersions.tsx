import React, { ReactNode } from 'react';
import { Box, Dialog, config, Text, Button, Spinner } from 'folds';
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
                    <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
                        <Spinner variant="Secondary" size="600" />
                        <Text>{getText('connecting')}</Text>
                    </Box>
                </SplashScreen>
            )}
            error={(err, retry, ignore) => (
                <SplashScreen>
                    <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
                        <Dialog>
                            <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                                <Text>
                                    {getText('error.hs_connect')}
                                </Text>
                                <Button variant="Critical" onClick={retry}>
                                    <Text as="span" size="B400">
                                        {getText('btn.retry')}
                                    </Text>
                                </Button>
                                <Button variant="Critical" onClick={ignore} fill="Soft">
                                    <Text as="span" size="B400">
                                        {getText('btn.continue')}
                                    </Text>
                                </Button>
                            </Box>
                        </Dialog>
                    </Box>
                </SplashScreen>
            )}
        >
            {(versions) => <SpecVersionsProvider value={versions}>{children}</SpecVersionsProvider>}
        </SpecVersionsLoader>
    );
}
