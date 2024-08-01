import { useCallback } from "react";
import { useMatrixClient } from "./useMatrixClient";
import { UserEvent } from "matrix-js-sdk";

type PresenceData = {
    lastActiveAgo: number;
    lastPresenceTs?: number;
    presence: 'online' | 'offline' | 'unavailable';
    presenceStatusMsg?: string;
};

export const usePresences = () => {
    const mx = useMatrixClient();
    const presences: Record<string, PresenceData> = {};

    const getPresence = useCallback(
        async (userId: string) => {
            if (presences[userId]) {
                return presences[userId];
            }
            const presence = await mx.getPresence(userId);
            return {
                lastActiveAgo: presence.last_active_ago,
                presence: presence.presence,
                presenceStatusMsg: presence.status_msg
            }
        },
        [mx, presences]
    );

    mx.on(UserEvent.Presence, (ev, user) => {
        presences[user.userId] = {
            lastActiveAgo: user.lastActiveAgo,
            lastPresenceTs: user.lastPresenceTs,
            presence: user.presence,
            presenceStatusMsg: user.presenceStatusMsg
        };
    });

    return getPresence;
};