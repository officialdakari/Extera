function fetchFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open("CinnyDB", 1);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction("tokens", "readonly");
            const store = transaction.objectStore("tokens");
            const getRequest = store.get(1);

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    resolve(getRequest.result);
                } else {
                    reject(new Error("No data found"));
                }
            };

            getRequest.onerror = function (error) {
                reject(error);
            };
        };

        dbRequest.onerror = function (error) {
            reject(error);
        };
    });
}

async function isClientOpen() {
    const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true // включает неуправляемые воркером вкладки
    });
    return clientList.length > 0;
}

self.addEventListener("push", async (event) => {
    const { baseUrl, accessToken } = await fetchFromIndexedDB();
    if (typeof baseUrl !== 'string' || typeof accessToken !== 'string') return;
    if (await isClientOpen()) return;
    var { prio, event_id, room_id, sender_display_name, sender, content, room_name, type } = JSON.parse(event.data.text());
    if (!type || !content || !sender) {
        const eventResponse = await fetch(`${baseUrl}/_matrix/client/v3/rooms/${room_id}/event/${event_id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!eventResponse.ok) return;
        const c = await eventResponse.json();
        content = c.content;
        type = c.type;
        sender = c.sender;
    }
    if (type !== 'm.room.message' && type !== 'm.room.encrypted') return;
    var senderName = sender_display_name ?? sender;
    if (!sender_display_name) {
        try {
            const profileResponse = await fetch(`${baseUrl}/_matrix/client/r0/profile/${sender}`);
            if (profileResponse.ok) {
                const body = await profileResponse.json();
                if (typeof body.displayname === 'string') {
                    senderName = body.displayname;
                }
            }
        } catch (error) {

        }
    }

    const notifications = await self.registration.getNotifications({ includeTriggered: true });
    const targetNotification = notifications.find(n => n.data && n.data.event_id == event_id && n.data.room_id == room_id);

    if (targetNotification) return;

    const name = typeof room_name === 'string' ? room_name : room_id;
    var body = `New ${type == 'm.room.encrypted' ? 'encrypted message' : 'message'}`;

    if (['m.text', 'm.notice'].includes(content?.msgtype)) {
        body = content.body;
    }

    self.registration.showNotification(`${senderName}${name ? ` @ ${name}` : ''}`, {
        body,
        data: {
            event_id,
            room_id
        }
    });
});

self.addEventListener('message', async (event) => {
    const { action, room_id } = event.data;

    if (action === 'closeNotification') {
        const notifications = await self.registration.getNotifications({ includeTriggered: true });
        const targetNotifications = notifications.filter(n => n.data && n.data.room_id == room_id);

        for (const notification of targetNotifications) {
            notification.close();
        }
    }
});

self.addEventListener('notificationclick', async (event) => {
    clients.openWindow('/#/');
});