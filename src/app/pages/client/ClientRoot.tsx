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
import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';
import { Modals } from '../../components/modal/Modal';
import { usePermission } from '../../hooks/usePermission';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { Permissions } from '../../state/widgetPermissions';

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
    const mx = initMatrix.matrixClient;

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
    const modals = createModals();

    // todo refactor that shit
    // TODO means I will never do that
    useEffect(() => {
        const onMessage = async (evt: MessageEvent<any>) => {
            const { data, source } = evt;
            const respond = (response: any) => {
                source?.postMessage({
                    ...data,
                    response
                });
            };

            const iframe = Array.from(document.getElementsByTagName('iframe'))
                .find(x => x.contentWindow == source);

            if (!iframe) return console.error('no iframe');
            const roomId = iframe.dataset.widgetRoomId;
            if (typeof roomId !== 'string') return;
            const widgetKey = `${iframe.dataset.widgetRoomId}_${iframe.dataset.widgetEventId}`;
            // это говно       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            const [perms, setPerms] = usePermission(widgetKey, {});
            const getPermission = async (key: keyof Permissions) => {
                if (typeof perms[key] === 'undefined') {
                    const result = await confirmDialog('Widget permission', `Allow ${iframe.dataset.widgetRoomName} to ${key}?`, 'Yes', 'positive');
                    setPerms((x: Permissions) => {
                        x[key] = result;
                        return x;
                    });
                }
                return perms[key];
            };

            console.debug('!!!!', data);

            if (data.api === 'fromWidget') {
                if (data.action === 'supported_api_versions') {
                    respond({
                        supported_versions: ['0.0.1', '0.0.2']
                    });
                } else if (data.action === 'content_loaded') {
                    respond({ success: true });
                } else if (data.action === 'send_event') {
                    if (!(await getPermission('sendEvents'))) {
                        return respond({
                            error: {
                                message: 'Forbidden'
                            }
                        });
                    }
                    mx?.sendMessage(roomId, data.event).then(() => {
                        respond({ success: true });
                    });
                }
            }
        };
        window.addEventListener('message', onMessage);

        return () => {
            window.removeEventListener('message', onMessage);
        };
    }, []);

    return (
        <SpecVersions baseUrl={baseUrl!}>
            {loading ? (
                <ClientRootLoading />
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
