export const removeNotifications = (roomId: string) => {
    if (typeof window.Notification !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.active)
                registration.active.postMessage({ action: 'closeNotification', room_id: roomId });
        });
    } else if ((window as any).cordova?.plugins?.notification?.local) {
        (window as any).cordova?.plugins.notification.local.clear(roomIdToHash(roomId), () => {

        });
    }
};

export const roomIdToHash = (roomId: string) => {
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
        const char = roomId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
};