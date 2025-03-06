/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-restricted-globals */
import { useAtomValue } from 'jotai';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IContent, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { parse } from 'url';
import { roomToUnreadAtom, unreadEqual, unreadInfoToUnread } from '../../state/room/roomToUnread';
import LogoSVG from '../../../../public/res/svg/cinny.svg';
import LogoUnreadSVG from '../../../../public/res/svg/cinny-unread.svg';
import LogoHighlightSVG from '../../../../public/res/svg/cinny-highlight.svg';
import NotificationSound from '../../../../public/sound/notification.ogg';
import InviteSound from '../../../../public/sound/invite.ogg';
import { setFavicon } from '../../utils/dom';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getInboxInvitesPath, getInboxNotificationsPath } from '../pathUtils';
import {
    getMemberDisplayName,
    getNotificationType,
    getUnreadInfo,
    isNotificationEvent,
} from '../../utils/room';
import { NotificationType, UnreadInfo } from '../../../types/matrix/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { useInboxNotificationsSelected } from '../../hooks/router/useInbox';
import { openJoinAlias, openProfileViewer, openShareMenu } from '../../../client/action/navigation';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import initMatrix from '../../../client/initMatrix';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { removeNotifications, roomIdToHash } from '../../utils/notifications';
import { markAsRead } from '../../../client/action/notifications';
import cons from '../../../client/state/cons';
import { getText } from '../../../lang';
import useCordova from '../../hooks/cordova';

function FaviconUpdater() {
    const roomToUnread = useAtomValue(roomToUnreadAtom);

    useEffect(() => {
        let notification = false;
        let highlight = false;
        roomToUnread.forEach((unread) => {
            if (unread.total > 0) {
                notification = true;
            }
            if (unread.highlight > 0) {
                highlight = true;
            }
        });

        if (notification) {
            setFavicon(highlight ? LogoHighlightSVG : LogoUnreadSVG);
        } else {
            setFavicon(LogoSVG);
        }
    }, [roomToUnread]);

    return null;
}

function InviteNotifications() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const invites = useAtomValue(allInvitesAtom);
    const perviousInviteLen = usePreviousValue(invites.length, 0);
    const mx = useMatrixClient();

    const navigate = useNavigate();
    const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

    const notify = useCallback(
        (count: number) => {
            const noti = new window.Notification('Invitation', {
                icon: LogoSVG,
                badge: LogoSVG,
                body: `You have ${count} new invitation request.`,
                silent: true,
            });

            noti.onclick = () => {
                if (!window.closed) navigate(getInboxInvitesPath());
                noti.close();
            };
        },
        [navigate]
    );

    const playSound = useCallback(() => {
        const audioElement = audioRef.current;
        audioElement?.play();
    }, []);

    useEffect(() => {
        if (invites.length > perviousInviteLen && mx.getSyncState() === 'SYNCING') {
            if (window.Notification !== undefined && Notification.permission === 'granted') {
                notify(invites.length - perviousInviteLen);
            }

            if (notificationSound) {
                playSound();
            }
        }
    }, [mx, invites, perviousInviteLen, notificationSound, notify, playSound]);

    return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} style={{ display: 'none' }}>
            <source src={InviteSound} type="audio/ogg" />
        </audio>
    );
}

function CustomThemes() {
    const [themes] = useSetting(settingsAtom, 'themes');

    return themes.map(
        theme => (
            theme.enabled && <link rel='stylesheet' href={theme.url} />
        )
    );
}

function MessageNotifications() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const notifRef = useRef<Notification>();
    const unreadCacheRef = useRef<Map<string, UnreadInfo>>(new Map());
    const mx = useMatrixClient();
    const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
    const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

    const navigate = useNavigate();
    const notificationSelected = useInboxNotificationsSelected();
    const selectedRoomId = useSelectedRoom();

    const notify = useCallback(
        ({
            roomName,
            roomAvatar,
            roomId,
            username,
            content,
            eventType
        }: {
            roomName: string;
            roomAvatar?: string;
            username: string;
            roomId: string;
            eventId: string;
            content: IContent;
            eventType: string;
        }) => {
            if (window.Notification !== undefined && Notification.permission === 'granted') {
                const noti = new window.Notification(roomName, {
                    icon: roomAvatar,
                    badge: roomAvatar,
                    body: `New inbox notification from ${username}`,
                    silent: true,
                });

                noti.onclick = () => {
                    if (!window.closed) navigate(getInboxNotificationsPath());
                    noti.close();
                    notifRef.current = undefined;
                };

                notifRef.current?.close();
                notifRef.current = noti;
            } else if (typeof (window as any).cordova?.plugins.notification.local !== 'undefined') {
                const plugin = (window as any).cordova.plugins.notification;
                let message = typeof content.body === 'string' ? content.body : 'Unsupported message';
                if (content.msgtype === 'm.image') message = `[Image${typeof content.filename === 'string' ? `: ${content.filename}` : ''}] ${message}`;
                else if (content.msgtype === 'm.video') message = `[Video${typeof content.filename === 'string' ? `: ${content.filename}` : ''}] ${message}`;
                else if (content.msgtype === 'm.audio') message = `[Audio${typeof content.filename === 'string' ? `: ${content.filename}` : ''}] ${message}`;
                else if (content.msgtype === 'm.file') message = `[File${typeof content.filename === 'string' ? `: ${content.filename}` : ''}] ${message}`;
                if (eventType === 'm.room.encrypted') message = `Encrypted message`;
                const id = roomIdToHash(roomId);
                const text = [
                    { person: username, message }
                ];
                plugin.local.hasPermission((granted: boolean) => {
                    if (granted) {
                        plugin.local.isPresent(id, (isPresent: boolean) => {
                            if (isPresent) {
                                plugin.local.update({
                                    id,
                                    text
                                });
                            } else {
                                plugin.local.schedule({
                                    id,
                                    title: roomName,
                                    icon: roomAvatar ? mxcUrlToHttp(mx, roomAvatar, 96, 96, 'scale', true) : undefined,
                                    text,
                                    data: {
                                        roomId
                                    },
                                    actions: [
                                        { id: 'read', title: 'Mark as read' }
                                    ]
                                });
                            }
                        });
                    }
                })
            }
        },
        [mx, navigate]
    );

    const playSound = useCallback(() => {
        const audioElement = audioRef.current;
        audioElement?.play();
    }, []);

    useEffect(() => {
        const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = async (
            mEvent,
            room,
            toStartOfTimeline,
            removed,
            data
        ) => {
            if (
                mx.getSyncState() !== 'SYNCING' ||
                selectedRoomId === room?.roomId ||
                notificationSelected ||
                !room ||
                !data.liveEvent ||
                room.isSpaceRoom() ||
                !isNotificationEvent(mEvent) ||
                getNotificationType(mx, room.roomId) === NotificationType.Mute
            )
                return;

            if (mEvent.getType() !== 'm.room.message' && mEvent.getType() !== 'm.room.encrypted') return;

            await mx.decryptEventIfNeeded(mEvent, {
                forceRedecryptIfUntrusted: true
            });
            const sender = mEvent.getSender();
            const eventId = mEvent.getId();
            if (!sender || !eventId || mEvent.getSender() === mx.getUserId()) return;
            const unreadInfo = getUnreadInfo(room);
            const cachedUnreadInfo = unreadCacheRef.current.get(room.roomId);
            unreadCacheRef.current.set(room.roomId, unreadInfo);

            if (unreadInfo.total === 0) return;
            if (
                cachedUnreadInfo &&
                unreadEqual(unreadInfoToUnread(cachedUnreadInfo), unreadInfoToUnread(unreadInfo))
            ) {
                return;
            }

            if (showNotifications) {
                const avatarMxc =
                    room.getAvatarFallbackMember()?.getMxcAvatarUrl() ?? room.getMxcAvatarUrl();
                notify({
                    roomName: room.name ?? 'Unknown',
                    roomAvatar: avatarMxc
                        ? mxcUrlToHttp(mx, avatarMxc, 96, 96, 'crop') ?? undefined
                        : undefined,
                    username: getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender,
                    roomId: room.roomId,
                    eventId,
                    content: mEvent.getContent(),
                    eventType: mEvent.getType()
                });
            }

            if (notificationSound) {
                playSound();
            }
        };
        mx.on(RoomEvent.Timeline, handleTimelineEvent);
        return () => {
            mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
        };
    }, [
        mx,
        notificationSound,
        notificationSelected,
        showNotifications,
        playSound,
        notify,
        selectedRoomId,
    ]);

    return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} style={{ display: 'none' }}>
            <source src={NotificationSound} type="audio/ogg" />
        </audio>
    );
}

type ClientNonUIFeaturesProps = {
    children: ReactNode;
};

export function ClientNonUIFeatures({ children }: ClientNonUIFeaturesProps) {
    const [pushes] = useSetting(settingsAtom, 'pushesEnabled');
    const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');
    const roomId = useSelectedRoom();
    const mx = initMatrix.matrixClient;
    const { navigateRoom } = useRoomNavigate();

    useEffect(() => {
        const clickHandler = async (ev: any) => {
            const href = ev.target.getAttribute('data-mention-href') ?? ev.target.getAttribute('href');
            if (typeof href !== 'string') return;
            const url = parse(href as string);
            if (ev.target.tagName?.toLowerCase() === 'a' || ev.target.tagName?.toLowerCase() === 'span') {
                if (url.hostname === 'matrix.to' && typeof url.hash === 'string' && url.hash.length > 3) {
                    ev.preventDefault();
                    const [id, evId] = url.hash.slice(2).split('?')[0].split('/');
                    const type = id[0];
                    if (type === '@') {
                        openProfileViewer(id, roomId);
                    } else if ((type === '!' || type === '#') && typeof evId === 'string') {
                        // eslint-disable-next-line @typescript-eslint/no-shadow
                        let roomId;
                        if (type === '!') {
                            roomId = id;
                        } else if (type === '#') {
                            const a = await mx?.getRoomIdForAlias(id);
                            if (typeof a?.room_id === 'string') roomId = a.room_id;
                        }
                        if (typeof roomId === 'string')
                            navigateRoom(id, evId);
                    } else if (type === '#') {
                        openJoinAlias(id);
                    }
                    return;
                }
            }
            if (ev.target.tagName?.toLowerCase() === 'a') {
                if (url.host && !cons.trustedDomains.includes(url.host!) && !cons.trustedDomains.includes(url.hostname!)) {
                    ev.preventDefault();
                    if (await confirmDialog(getText('go_link.title'), `${getText('go_link.desc')}\n\n${href}`, getText('go_link.yes'), 'error')) {
                        window.open(href, '_blank');
                    }
                }
            }
        };
        addEventListener('click', clickHandler);
        return () => {
            removeEventListener('click', clickHandler);
        };
    }, [mx, navigateRoom, roomId]);

    // todo refactor that shit
    // TODO means I will never do that
    // useEffect(() => {
    //     const onMessage = async (evt: MessageEvent<any>) => {
    //         const { data, source } = evt;
    //         const respond = (response: any) => {
    //             source?.postMessage({
    //                 ...data,
    //                 response
    //             }, {
    //                 targetOrigin: evt.origin
    //             });
    //         };

    //         const iframe = Array.from(document.getElementsByTagName('iframe'))
    //             .find(x => x.contentWindow === source || x.src === evt.origin);

    //         if (!iframe) return;
    //         if (iframe.dataset.widget) {
    //             const roomId = iframe.dataset.widgetRoomId;
    //             if (typeof roomId !== 'string') return;
    //             const widgetKey = `${iframe.dataset.widgetRoomId}_${iframe.dataset.widgetEventId}`;
    //             // это говно       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //             const [perms, setPerms] = useSetPermission(widgetKey, {});
    //             const getPermission = async (key: keyof Permissions) => {
    //                 if (typeof perms[key] === 'undefined') {
    //                     const result = await confirmDialog('Widget permission', `Allow ${iframe.dataset.widgetRoomName} to ${key}?`, 'Yes', 'success');
    //                     setPerms((x: Permissions) => {
    //                         x[key] = result;
    //                         return x;
    //                     });
    //                 }
    //                 return perms[key];
    //             };

    //             if (data.api === 'fromWidget') {
    //                 if (data.action === 'supported_api_versions') {
    //                     respond({
    //                         supported_versions: ['0.0.1', '0.0.2']
    //                     });
    //                 } else if (data.action === 'content_loaded') {
    //                     respond({ success: true });
    //                 } else if (data.action === 'send_event') {
    //                     if (!(await getPermission('sendEvents'))) {
    //                         return respond({
    //                             error: {
    //                                 message: 'Forbidden'
    //                             }
    //                         });
    //                     }
    //                     mx?.sendMessage(roomId, data.event).then(() => {
    //                         respond({ success: true });
    //                     });
    //                 }
    //             }
    //         } else if (iframe.dataset.integrationManager) {
    //             if (data.action === 'invite') {
    //                 mx?.invite(data.room_id, data.user_id).then(() => {
    //                     respond({ success: true });
    //                 }).catch((err) => {
    //                     respond({
    //                         error: {
    //                             message: err.message,
    //                             _error: err.stack
    //                         }
    //                     });
    //                 });
    //             } else if (data.action === 'membership_state') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
    //                 if (!state) return respond({ error: { message: 'No room state' } });
    //                 const event = state?.getStateEvents(EventType.RoomMember, data.user_id);
    //                 if (!event) return respond({ error: { message: 'No membership state' } });
    //                 respond(event.getContent());
    //             } else if (data.action === 'read_events') {
    //                 console.debug(`read_events ${mx ? 'mx is yes' : 'no mx'}`);
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
    //                 if (!state) return respond({ error: { message: 'No room state' } });
    //                 const event = state?.getStateEvents(data.type);
    //                 respond({
    //                     events: event ? event.filter(x => data.state_key ? x.getStateKey() === data.state_key : true).map(s => s.getEffectiveEvent()) : []
    //                 });
    //             } else if (data.action === 'bot_options') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
    //                 if (!state) return respond({ error: { message: 'No room state' } });
    //                 const event = state?.getStateEvents('m.room.bot.options', data.user_id);
    //                 if (!event) return respond({ error: { message: 'No state event' } });
    //                 respond(event.getContent());
    //             } else if (data.action === 'set_bot_options') {
    //                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //                 // @ts-ignore
    //                 mx?.sendStateEvent(data.room_id, 'm.room.bot.options', data.content)
    //                     .then(() => {
    //                         respond({ success: true });
    //                     })
    //                     .catch((err) => {
    //                         respond({
    //                             error: {
    //                                 message: err.message,
    //                                 _error: err.stack
    //                             }
    //                         });
    //                     });
    //             } else if (data.action === 'set_bot_power') {
    //                 mx?.setPowerLevel(data.room_id, data.user_id, data.level)
    //                     .then(() => {
    //                         respond({ success: true });
    //                     })
    //                     .catch((err) => {
    //                         respond({
    //                             error: {
    //                                 message: err.message,
    //                                 _error: err.stack
    //                             }
    //                         });
    //                     });
    //             } else if (data.action === 'join_rules_state') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 respond({
    //                     join_rule: room.getJoinRule()
    //                 });
    //             } else if (data.action === 'set_plumbing_state') {
    //                 // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //                 // @ts-ignore
    //                 mx?.sendStateEvent(data.room_id, 'm.room.plumbing', { status: data.status })
    //                     .then(() => {
    //                         respond({ success: true });
    //                     })
    //                     .catch((err) => {
    //                         respond({
    //                             error: {
    //                                 message: err.message,
    //                                 _error: err.stack
    //                             }
    //                         });
    //                     });
    //             } else if (data.action === 'join_rules_state') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 respond(room.getMembers().length);
    //             } else if (data.action === 'can_send_event') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 const powerLevels = usePowerLevels(room);
    //                 const { getPowerLevel, canSendEvent, canSendStateEvent } = usePowerLevelsAPI(powerLevels);
    //                 const myUserId = mx?.getUserId();
    //                 respond(
    //                     myUserId
    //                         ? (data.is_state ?
    //                             canSendEvent(data.event_type, getPowerLevel(myUserId)) :
    //                             canSendStateEvent(data.event_type, getPowerLevel(myUserId))
    //                         )
    //                         : false
    //                 );
    //             } else if (data.action === 'get_widgets') {
    //                 const room = mx?.getRoom(data.room_id);
    //                 if (!room) return respond({ error: { message: 'No such room' } });
    //                 const timeline = room.getLiveTimeline();
    //                 const state = timeline.getState(EventTimeline.FORWARDS);
    //                 const widgetsEvents = [
    //                     ...(state?.getStateEvents('m.widget') ?? []),
    //                     ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
    //                 ];
    //                 respond(widgetsEvents.map(s => s.getEffectiveEvent()));
    //             } else if (data.action === 'set_widget') {
    //                 if (data.url) {
    //                     //@ts-ignore
    //                     mx?.sendStateEvent(data.room_id, 'im.vector.modular.widgets', {
    //                         widget_id: data.widget_id,
    //                         type: data.type,
    //                         url: data.url,
    //                         name: data.name,
    //                         data: data.data
    //                     }, data.widget_id)
    //                         .then(() => {
    //                             respond({ success: true });
    //                         })
    //                         .catch((err) => {
    //                             respond({
    //                                 error: {
    //                                     message: err.message,
    //                                     _error: err.stack
    //                                 }
    //                             });
    //                         });
    //                 } else {
    //                     const room = mx?.getRoom(data.room_id);
    //                     if (!room) return respond({ error: { message: 'No such room' } });
    //                     const timeline = room.getLiveTimeline();
    //                     const state = timeline.getState(EventTimeline.FORWARDS);
    //                     const widgetsEvents = [
    //                         ...(state?.getStateEvents('m.widget') ?? []),
    //                         ...(state?.getStateEvents('im.vector.modular.widgets') ?? [])
    //                     ];
    //                     mx?.redactEvent(data.room_id, widgetsEvents.find(x => x.getContent().widget_id === data.widget_id)?.getId() ?? '')
    //                         .then(() => {
    //                             respond({ success: true });
    //                         })
    //                         .catch((err) => {
    //                             respond({
    //                                 error: {
    //                                     message: err.message,
    //                                     _error: err.stack
    //                                 }
    //                             });
    //                         });
    //                 }
    //             } else if (data.action === 'get_room_enc_state') {
    //                 respond(mx?.isRoomEncrypted(data.room_id) ?? false);
    //             } else if (data.action === 'send_event') {
    //                 if (typeof data.state_key === 'string') {
    //                     mx?.sendStateEvent(data.room_id, data.type, data.content, data.state_key)
    //                         .then(() => {
    //                             respond({ success: true });
    //                         })
    //                         .catch((err) => {
    //                             respond({
    //                                 error: {
    //                                     message: err.message,
    //                                     _error: err.stack
    //                                 }
    //                             });
    //                         });
    //                 } else {
    //                     mx?.sendEvent(data.room_id, data.type, data.content)
    //                         .then(() => {
    //                             respond({ success: true });
    //                         })
    //                         .catch((err) => {
    //                             respond({
    //                                 error: {
    //                                     message: err.message,
    //                                     _error: err.stack
    //                                 }
    //                             });
    //                         });
    //                 }
    //             }
    //         }
    //     };
    //     window.addEventListener('message', onMessage);

    //     return () => {
    //         window.removeEventListener('message', onMessage);
    //     };
    // }, []);

    const cordova = useCordova();
    const plugin = cordova?.plugins?.notification?.local;
    // eslint-disable-next-line consistent-return
    const callback = useCallback((notification: any) => {
        const roomId = notification?.data?.roomId;
        if (typeof roomId === 'string') {
            removeNotifications(roomId);
            markAsRead(roomId, undefined, ghostMode);
        }
    }, [ghostMode]);

    if (plugin) {
        plugin.on('read', callback);
    }

    const openwith = cordova ? cordova.openwith : null;

    if (cordova && openwith) {
        const intentHandler = (intent: any) => {
            openShareMenu(intent.items);
        };
        openwith.init(console.log, console.error);
        openwith.addHandler(intentHandler);
    }

    return (
        <>
            <FaviconUpdater />
            <CustomThemes />

            {!pushes && (typeof window.Notification !== 'undefined' || typeof (window as any).cordova?.plugins?.notification?.local) && (
                <>
                    <MessageNotifications />
                    <InviteNotifications />
                </>
            )}
            {children}
        </>
    );
}
