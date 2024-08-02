import { useEffect, useState, useCallback } from "react";
import { useMatrixClient } from "./useMatrixClient";
import { ClientEvent, EventType, MatrixEvent, MatrixEventEvent, User, UserEvent } from "matrix-js-sdk";

type PresenceData = {
    lastActiveAgo: number;
    lastPresenceTs?: number;
    presence: 'online' | 'offline' | 'unavailable' | string;
    presenceStatusMsg?: string;
};

export const usePresences = () => {
    const mx = useMatrixClient();
    const [presences, setPresences] = useState<Record<string, PresenceData>>({});

    const getPresence = useCallback(async (userId: string) => {
        if (presences[userId]) {
            return presences[userId];
        }
        const presence = await mx.getPresence(userId);
        return {
            lastActiveAgo: presence.last_active_ago,
            presence: presence.presence,
            presenceStatusMsg: presence.status_msg
        };
    }, [mx, presences]);

    useEffect(() => {
        const handlePresence = (ev: MatrixEvent) => {
            if (ev.getType() !== 'm.presence') return;
            if (!ev.sender || typeof ev.sender?.userId !== 'string') return;
            const content = ev.getContent();
            setPresences({
                ...presences,
                [ev.sender.userId]: {
                    lastActiveAgo: content.last_active_ago,
                    lastPresenceTs: content.last_presence_ts,
                    presence: content.presence,
                    presenceStatusMsg: content.status_msg
                }
            });
        };

        mx.on(ClientEvent.Event, handlePresence);

        return () => {
            mx.removeListener(ClientEvent.Event, handlePresence);
        };
    }, [mx]);

    return getPresence;
};