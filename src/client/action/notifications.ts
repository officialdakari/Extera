import { ReceiptType } from 'matrix-js-sdk';
import { removeNotifications } from '../../app/utils/notifications';
import initMatrix from '../initMatrix';

// eslint-disable-next-line import/prefer-default-export
export async function markAsRead(roomId: string, threadId?: string, privateReceipt?: boolean) {
    const mx = initMatrix.matrixClient!;
    const room = mx.getRoom(roomId);
    if (!room) return;

    removeNotifications(roomId);

    if (!threadId) {
        const timeline = room.getLiveTimeline().getEvents();
        const readEventId = room.getEventReadUpTo(mx.getUserId()!);

        const getLatestValidEvent = () => {
            for (let i = timeline.length - 1; i >= 0; i -= 1) {
                const latestEvent = timeline[i];
                if (latestEvent.getId() === readEventId) return null;
                if (!latestEvent.isSending()) return latestEvent;
            }
            return null;
        };
        if (timeline.length === 0) return;
        const latestEvent = getLatestValidEvent();
        if (latestEvent === null) return;

        await mx.sendReadReceipt(latestEvent, privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read);
    } else {
        const thread = room.getThread(threadId);
        if (!thread) return;
        const timeline = thread.getUnfilteredTimelineSet().getLiveTimeline().getEvents();
        const readEventId = thread.getEventReadUpTo(mx.getUserId()!);

        const getLatestValidEvent = () => {
            for (let i = timeline.length - 1; i >= 0; i -= 1) {
                const latestEvent = timeline[i];
                if (latestEvent.getId() === readEventId) return null;
                if (!latestEvent.isSending()) return latestEvent;
            }
        };

        if (timeline.length === 0) return;
        const latestEvent = getLatestValidEvent();
        if (!latestEvent) return;

        await mx.sendReadReceipt(latestEvent, privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read);
    }
}