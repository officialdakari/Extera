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
import { EventTimeline, EventType } from 'matrix-js-sdk';
import { usePowerLevels, usePowerLevelsAPI, usePowerLevelsContext, useRoomsPowerLevels } from '../../hooks/usePowerLevels';

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
                console.log(`Responding with`, response);
                source?.postMessage({
                    ...data,
                    response
                }, {
                    targetOrigin: evt.origin
                });
            };

            console.debug(evt);

            const iframe = Array.from(document.getElementsByTagName('iframe'))
                .find(x => x.contentWindow == source || x.src == evt.origin);

            if (!iframe) return console.error('no iframe');
            if (iframe.dataset.widget) {
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
            } else if (iframe.dataset.integrationManager) {
                if (data.action === 'invite') {
                    mx?.invite(data.room_id, data.user_id).then(() => {
                        respond({ success: true });
                    }).catch((err) => {
                        respond({
                            error: {
                                message: err.message,
                                _error: err.stack
                            }
                        });
                    });
                } else if (data.action === 'membership_state') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                    if (!state) return respond({ error: { message: 'No room state wtf' } });
                    const event = state?.getStateEvents(EventType.RoomMember, data.user_id);
                    if (!event) return respond({ error: { message: 'No membership state' } });
                    respond(event.getContent());
                } else if (data.action === 'read_events') {
                    console.debug(`read_events ${mx ? 'mx is yes' : 'no mx'}`);
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                    if (!state) return respond({ error: { message: 'No room state wtf' } });
                    const event = state?.getStateEvents(data.type);
                    respond({
                        events: event ? event.filter(x => data.state_key ? x.getStateKey() === data.state_key : true).map(s => s.getEffectiveEvent()) : []
                    });
                } else if (data.action === 'bot_options') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                    if (!state) return respond({ error: { message: 'No room state wtf' } });
                    const event = state?.getStateEvents('m.room.bot.options', data.user_id);
                    if (!event) return respond({ error: { message: 'No state event' } });
                    respond(event.getContent());
                } else if (data.action === 'set_bot_options') {
                    mx?.sendStateEvent(data.room_id, 'm.room.bot.options', data.content)
                        .then(() => {
                            respond({ success: true });
                        })
                        .catch((err) => {
                            respond({
                                error: {
                                    message: err.message,
                                    _error: err.stack
                                }
                            });
                        });
                } else if (data.action === 'set_bot_power') {
                    mx?.setPowerLevel(data.room_id, data.user_id, data.level)
                        .then(() => {
                            respond({ success: true });
                        })
                        .catch((err) => {
                            respond({
                                error: {
                                    message: err.message,
                                    _error: err.stack
                                }
                            });
                        });
                } else if (data.action === 'join_rules_state') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    respond({
                        join_rule: room.getJoinRule()
                    });
                } else if (data.action === 'set_plumbing_state') {
                    mx?.sendStateEvent(data.room_id, 'm.room.plumbing', { status: data.status })
                        .then(() => {
                            respond({ success: true });
                        })
                        .catch((err) => {
                            respond({
                                error: {
                                    message: err.message,
                                    _error: err.stack
                                }
                            });
                        });
                } else if (data.action === 'join_rules_state') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    respond(room.getMembers().length);
                } else if (data.action === 'can_send_event') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    const powerLevels = usePowerLevels(room);
                    const { getPowerLevel, canSendEvent, canSendStateEvent } = usePowerLevelsAPI(powerLevels);
                    const myUserId = mx?.getUserId();
                    respond(
                        myUserId
                            ? (data.is_state ?
                                canSendEvent(data.event_type, getPowerLevel(myUserId)) :
                                canSendStateEvent(data.event_type, getPowerLevel(myUserId))
                            )
                            : false
                    );
                } else if (data.action === 'get_widgets') {
                    const room = mx?.getRoom(data.room_id);
                    if (!room) return respond({ error: { message: 'No such room' } });
                    const timeline = room.getLiveTimeline();
                    const state = timeline.getState(EventTimeline.FORWARDS);
                    const widgetsEvents = [
                        ...(state?.getStateEvents('m.widget') ?? []),
                        ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
                    ];
                    respond(widgetsEvents.map(s => s.getEffectiveEvent()));
                } else if (data.action === 'set_widget') {
                    if (data.url) {
                        mx?.sendStateEvent(data.room_id, 'im.vector.modular.widgets', {
                            widget_id: data.widget_id,
                            type: data.type,
                            url: data.url,
                            name: data.name,
                            data: data.data
                        }, data.widget_id)
                            .then(() => {
                                respond({ success: true });
                            })
                            .catch((err) => {
                                respond({
                                    error: {
                                        message: err.message,
                                        _error: err.stack
                                    }
                                });
                            });
                    } else {
                        const room = mx?.getRoom(data.room_id);
                        if (!room) return respond({ error: { message: 'No such room' } });
                        const timeline = room.getLiveTimeline();
                        const state = timeline.getState(EventTimeline.FORWARDS);
                        const widgetsEvents = [
                            ...(state?.getStateEvents('m.widget') ?? []),
                            ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
                        ];
                        mx?.redactEvent(data.room_id, widgetsEvents.find(x => x.getContent().widget_id === data.widget_id)?.getId() ?? '')
                            .then(() => {
                                respond({ success: true });
                            })
                            .catch((err) => {
                                respond({
                                    error: {
                                        message: err.message,
                                        _error: err.stack
                                    }
                                });
                            });
                    }
                } else if (data.action === 'get_room_enc_state') {
                    respond(mx?.isRoomEncrypted(data.room_id) ?? false);
                } else if (data.action === 'send_event') {
                    if (typeof data.state_key === 'string') {
                        mx?.sendStateEvent(data.room_id, data.type, data.content, data.state_key)
                            .then(() => {
                                respond({ success: true });
                            })
                            .catch((err) => {
                                respond({
                                    error: {
                                        message: err.message,
                                        _error: err.stack
                                    }
                                });
                            });
                    } else {
                        mx?.sendEvent(data.room_id, data.type, data.content)
                            .then(() => {
                                respond({ success: true });
                            })
                            .catch((err) => {
                                respond({
                                    error: {
                                        message: err.message,
                                        _error: err.stack
                                    }
                                });
                            });
                    }
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
