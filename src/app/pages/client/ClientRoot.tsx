import { Box, config, Header, IconButton, Modal, Spinner, Text } from 'folds';
import React, { ReactElement, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import initMatrix from '../../../client/initMatrix';
import { initHotkeys } from '../../../client/event/hotkeys';
import { getSecret } from '../../../client/state/auth';
import { SplashScreen } from '../../components/splash-screen';
import { CapabilitiesAndMediaConfigLoader } from '../../components/CapabilitiesAndMediaConfigLoader';
import { CapabilitiesProvider } from '../../hooks/useCapabilities';
import { MediaConfigProvider } from '../../hooks/useMediaConfig';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';
import { SpecVersions } from './SpecVersions';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { RandomFact } from '../../../fact';
import Draggable from 'react-draggable';

import * as css from './ClientRoot.css';
import { CallProvider } from '../../hooks/useCall';
import { createModals, ModalsProvider } from '../../hooks/useModals';
import { Modals } from '../../components/modal/Modal';
import { getText } from '../../../lang';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab } from '@mui/material';
import Icon from '@mdi/react';
import { mdiPlus } from '@mdi/js';

function SystemEmojiFeature() {
    const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

    if (twitterEmoji) {
        document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
    } else {
        document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
    }

    return null;
}

function ClientRootLoading() {
    return (
        <SplashScreen>
            <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
                <Spinner variant="Secondary" size="600" />
                <Text>
                    {getText('loading')}
                </Text>
            </Box>
        </SplashScreen>
    );
}

type ClientRootProps = {
    children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(true);
    const [isError, setError] = useState(false);
    const { baseUrl } = getSecret();

    useEffect(() => {
        const handleStart = () => {
            initHotkeys();
            setLoading(false);
        };
        const handleReady = () => {
            setSyncing(false);
        };
        initMatrix.once('client_ready', handleStart);
        initMatrix.once('init_loading_finished', handleReady);
        if (!initMatrix.matrixClient) initMatrix.init().catch(() => setError(true));
        return () => {
            initMatrix.removeListener('client_ready', handleStart);
            initMatrix.removeListener('init_loading_finished', handleReady);
        };
    }, []);

    const callWindowState = useState<any>(null);
    const modals = createModals();

    useEffect(() => {

    }, [syncing, loading]);


    return (
        <SpecVersions baseUrl={baseUrl!}>
            {loading ? (
                <ClientRootLoading />
            ) : isError ? (
                <Dialog open={true}>
                    <DialogTitle>
                        Error
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Failed initializing Matrix client.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => location.reload()}>Reload</Button>
                        <Button onClick={() => initMatrix.clearCacheAndReload()} color='error'>Clear cache</Button>
                    </DialogActions>
                </Dialog>
            ) : (
                <CallProvider value={callWindowState}>
                    <ModalsProvider value={modals}>
                        <MatrixClientProvider value={initMatrix.matrixClient!}>
                            <CapabilitiesAndMediaConfigLoader>
                                {(capabilities, mediaConfig) => (
                                    <CapabilitiesProvider value={capabilities ?? {}}>
                                        <MediaConfigProvider value={mediaConfig ?? {}}>
                                            <Modals modals={modals} />
                                            {callWindowState[0] && (
                                                <Draggable
                                                    defaultPosition={{ x: 0, y: 0 }}
                                                    handle='.modal-header'
                                                >
                                                    <div className={css.DraggableContainer}>
                                                        <Modal variant="Surface" size="500">
                                                            <Header
                                                                className='modal-header'
                                                                style={{
                                                                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                                                    borderBottomWidth: config.borderWidth.B300,
                                                                }}
                                                                variant="Surface"
                                                                size="500"
                                                            >
                                                                <Box grow="Yes">
                                                                    <Text size="H4">Call</Text>
                                                                </Box>
                                                            </Header>
                                                            {callWindowState[0]}
                                                        </Modal>
                                                    </div>
                                                </Draggable>
                                            )}
                                            {children}
                                            <Windows />
                                            <Dialogs />
                                            <ReusableContextMenu />
                                            <SystemEmojiFeature />
                                        </MediaConfigProvider>
                                    </CapabilitiesProvider>
                                )}
                            </CapabilitiesAndMediaConfigLoader>
                        </MatrixClientProvider>
                    </ModalsProvider>
                </CallProvider>
            )}
        </SpecVersions>
    );
}
