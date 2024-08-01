import initMatrix from "../client/initMatrix";
import cons from "../client/state/cons";

export const enablePush = async () => {
    const mx = initMatrix.matrixClient;
    const ask = await fetch('https://extera-push.officialdakari.ru/application_server_key');
    const key = await ask.json();
    navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
        const options = {
            userVisibleOnly: true,
            applicationServerKey: new Uint8Array(
                key
            )
        };
        serviceWorkerRegistration.pushManager.subscribe(options).then(
            async (pushSubscription) => {
                console.log(pushSubscription);
                var base64 = btoa(
                    new Uint8Array(pushSubscription.getKey('auth'))
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                var base642 = btoa(
                    new Uint8Array(pushSubscription.getKey('p256dh'))
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                const k1 = await fetch(`https://extera-push.officialdakari.ru/createpushkey`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        endpoint: btoa(pushSubscription.endpoint),
                        auth: base64,
                        p256dh: base642
                    })
                });
                const { pushKey } = await k1.json();
                const { pushers } = await mx.getPushers();
                if (typeof pushKey === 'string' && !localStorage.pushkey && !pushers.find(x => x.pushkey == pushKey)) {
                    await mx.setPusher({
                        enabled: true,
                        app_display_name: cons.name,
                        app_id: cons.app_id,
                        data: {
                            url: 'https://extera-push.officialdakari.ru/_matrix/push/v1/notify',
                            brand: 'ExteraPush'
                        },
                        kind: 'http',
                        lang: 'en',
                        profile_tag: 'extera',
                        pushkey: pushKey,
                        device_display_name: cons.name
                    });
                    localStorage.pushkey = pushKey;
                }
            },
            (error) => {
                console.error(error);
            },
        );
    });
}

export const disablePush = async () => {
    const mx = initMatrix.matrixClient;
    if (typeof localStorage.pushkey === 'string') {
        await mx.removePusher(localStorage.pushkey, 'ru.officialdakari.extera');
        delete localStorage.pushkey;
    }
}