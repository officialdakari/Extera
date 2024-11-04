import { Box, Text, color, config } from 'folds';
import React from 'react';
import { SplashScreen } from '../components/splash-screen';
import { RandomFact } from '../../fact';
import { getText } from '../../lang';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

export function ConfigConfigLoading() {
    return (
        <SplashScreen>
            <Box grow="Yes" direction="Column" gap="400" alignItems="Center" justifyContent="Center">
                <CircularProgress />
                <Text>
                    {getText('loading')}
                </Text>
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
            <Box grow="Yes" direction="Column" gap="400" alignItems="Center" justifyContent="Center">
                <Dialog open>
                    <DialogTitle>
                        {getText('error.config_load')}
                    </DialogTitle>
                    <DialogContent>
                        {typeof error === 'object' &&
                            error &&
                            'message' in error &&
                            typeof error.message === 'string' && (
                                <Alert severity='error'>
                                    {error.message}
                                </Alert>
                            )}
                    </DialogContent>
                    <DialogActions>
                        <Button color='error' onClick={ignore}>
                            {getText('btn.continue')}
                        </Button>
                        <Button color='primary' onClick={retry}>
                            {getText('btn.retry')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </SplashScreen>
    );
}
