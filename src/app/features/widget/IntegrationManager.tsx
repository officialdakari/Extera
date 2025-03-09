import React, { useEffect } from "react";
import { EventTimeline, EventType } from "matrix-js-sdk";
import { useMatrixClient } from "../../hooks/useMatrixClient";

type IntegrationManagerProps = {
    url: string;
};

export default function IntegrationManager({ url }: IntegrationManagerProps) {
    const mx = useMatrixClient();
    const myUserId = mx?.getUserId();
    useEffect(() => {
        const onMessage = async (evt: MessageEvent<any>) => {
            const { data, source } = evt;
            const respond = (response: any) => {
                source?.postMessage({
                    ...data,
                    response
                }, {
                    targetOrigin: evt.origin
                });
            };
            const iframe = Array.from(document.getElementsByTagName('iframe'))
                .find(x => x.contentWindow === source || x.src === evt.origin);
            if (!iframe?.dataset.integrationManager) return null;
            console.log(data);
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
            } else if (data.action === 'kick') {
                mx?.kick(data.room_id, data.user_id).then(() => {
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
                const room = mx.getRoom(data.room_id);
                if (!room) return respond({ error: { message: 'No such room' } });
                const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                if (!state) return respond({ error: { message: 'No room state' } });
                const event = state?.getStateEvents(EventType.RoomMember, data.user_id);
                if (!event) return respond({ error: { message: 'No membership state' } });
                respond(event.getContent());
            } else if (data.action === 'read_events') {
                const room = mx.getRoom(data.room_id);
                if (!room) return respond({ error: { message: 'No such room' } });
                const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                if (!state) return respond({ error: { message: 'No room state' } });
                const event = state?.getStateEvents(data.type);
                respond({
                    events: event ? event.filter(x => data.state_key ? x.getStateKey() === data.state_key : true).map(s => s.getEffectiveEvent()) : []
                });
            } else if (data.action === 'bot_options') {
                const room = mx.getRoom(data.room_id);
                if (!room) return respond({ error: { message: 'No such room' } });
                const state = room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
                if (!state) return respond({ error: { message: 'No room state' } });
                const event = state?.getStateEvents('m.room.bot.options', data.user_id);
                if (!event) return respond({ error: { message: 'No state event' } });
                respond(event.getContent());
            } else if (data.action === 'set_bot_options') {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
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
                const room = mx.getRoom(data.room_id);
                if (!room) return respond({ error: { message: 'No such room' } });
                respond({
                    join_rule: room.getJoinRule()
                });
            } else if (data.action === 'set_plumbing_state') {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
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
            } else if (data.action === 'get_joined_members') {
                const room = mx.getRoom(data.room_id);
                if (!room) return respond({ error: { message: 'No such room' } });
                respond(room.getMembers().length);
            } else if (data.action === 'can_send_event') {
                const room = mx.getRoom(data.room_id);
                if (!room || !myUserId) return respond({ error: { message: 'No such room' } });
                respond(
                    data.is_state
                        ? room.currentState.maySendStateEvent(data.event_type, myUserId)
                        : room.currentState.maySendEvent(data.event_type, myUserId)
                );
            } else if (data.action === 'get_widgets') {
                const room = mx.getRoom(data.room_id);
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
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
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
                    const room = mx.getRoom(data.room_id);
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
            return null;
        };
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('message', onMessage);
        };
    });

    return (
        <iframe
            style={{ border: 'none', width: '100%', height: '100%' }}
            allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock"
            allowFullScreen
            data-integration-manager
            src={url}
            title='Integrations'
        />
    );
}