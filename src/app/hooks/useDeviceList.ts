/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import { CryptoEvent, IMyDevice } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export function useDeviceList() {
    const mx = useMatrixClient();
    const [deviceList, setDeviceList] = useState<IMyDevice[]>([]);

    useEffect(() => {
        let isMounted = true;

        const updateDevices = () => mx.getDevices().then((data) => {
            if (!isMounted) return;
            setDeviceList(data.devices || []);
        });
        updateDevices();

        const handleDevicesUpdate = (users: string[]) => {
            if (users.includes(mx.getUserId()!)) {
                updateDevices();
            }
        };

        mx.on(CryptoEvent.DevicesUpdated, handleDevicesUpdate);
        return () => {
            mx.removeListener(CryptoEvent.DevicesUpdated, handleDevicesUpdate);
            isMounted = false;
        };
    }, [mx]);
    return deviceList;
}
