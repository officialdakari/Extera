import { Box, config, Header, Modal, Spinner, Text } from 'folds';
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
                <RandomFact />
            </Box>
        </SplashScreen>
    );
}

type ClientRootProps = {
    children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
    const [loading, setLoading] = useState(true);
    const { baseUrl } = getSecret();

    useEffect(() => {
        const handleStart = () => {
            initHotkeys();
            setLoading(false);
        };
        initMatrix.once('init_loading_finished', handleStart);
        if (!initMatrix.matrixClient) initMatrix.init();
        return () => {
            initMatrix.removeListener('init_loading_finished', handleStart);
        };
    }, []);

    const callWindowState = useState<any>(null);

    return (
        <SpecVersions baseUrl={baseUrl!}>
            {loading ? (
                <ClientRootLoading />
            ) : (
                <CallProvider value={callWindowState}>
                    <MatrixClientProvider value={initMatrix.matrixClient!}>
                        <CapabilitiesAndMediaConfigLoader>
                            {(capabilities, mediaConfig) => (
                                <CapabilitiesProvider value={capabilities ?? {}}>
                                    <MediaConfigProvider value={mediaConfig ?? {}}>
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
                </CallProvider>
            )}
        </SpecVersions>
    );
}
