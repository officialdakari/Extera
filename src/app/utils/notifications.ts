export const removeNotifications = (roomId: string) => {
    if (navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.active)
                registration.active.postMessage({ action: 'closeNotification', room_id: roomId });
        });
    }
};