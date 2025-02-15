import React, { useState, useEffect } from 'react';
import './DeviceManage.scss';
import dateFormat from 'dateformat';

import { Alert, Button, CircularProgress, DialogActions, DialogContent, IconButton, LinearProgress, TextField } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';

import initMatrix from '../../../client/initMatrix';
import { isCrossVerified } from '../../../util/matrixUtil';
import { openReusableDialog, openEmojiVerification } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { authRequest } from './AuthRequest';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import { useStore } from '../../hooks/useStore';
import { useDeviceList } from '../../hooks/useDeviceList';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';
import { accessSecretStorage } from './SecretStorageAccess';
import { getText, translate } from '../../../lang';

const promptDeviceName = async (deviceName) => new Promise((resolve) => {
    let isCompleted = false;

    const renderContent = (onComplete) => {
        const handleSubmit = (e) => {
            e.preventDefault();
            const name = e.target.session.value;
            if (typeof name !== 'string') onComplete(null);
            onComplete(name);
        };
        return (
            <form onSubmit={handleSubmit} className='rename-form'>
                <DialogContent>
                    <TextField defaultValue={deviceName} label={getText('label.session_name')} name="session" />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onComplete(null)}>{getText('btn.cancel')}</Button>
                    <Button color='primary' type='submit'>{getText('btn.save_device_name')}</Button>
                </DialogActions>
            </form>
        );
    };

    openReusableDialog(
        getText('text.edit_session_name'),
        (requestClose) => renderContent((name) => {
            isCompleted = true;
            resolve(name);
            requestClose();
        }),
        () => {
            if (!isCompleted) resolve(null);
        },
    );
});

function DeviceManage() {
    const TRUNCATED_COUNT = 4;
    const mx = initMatrix.matrixClient;
    const isCSEnabled = useCrossSigningStatus();
    const deviceList = useDeviceList();
    const [processing, setProcessing] = useState([]);
    const [truncated, setTruncated] = useState(true);
    const mountStore = useStore();
    mountStore.setItem(true);
    const isMeVerified = isCrossVerified(mx.deviceId);

    useEffect(() => {
        setProcessing([]);
    }, [deviceList]);

    const addToProcessing = (device) => {
        const old = [...processing];
        old.push(device.device_id);
        setProcessing(old);
    };

    const removeFromProcessing = () => {
        setProcessing([]);
    };

    const [unverified, setUnverified] = useState([]);
    const [verified, setVerified] = useState([]);
    const [noEncryption, setNoEncryption] = useState([]);

    useEffect(() => {
        setVerified([]);
        setUnverified([]);
        setNoEncryption([]);
        if (deviceList !== null)
            deviceList.sort((a, b) => b.last_seen_ts - a.last_seen_ts).forEach(async (device) => {
                const isVerified = await isCrossVerified(device.device_id);
                if (isVerified === true) {
                    setVerified((v) => [...v, device]);
                } else if (isVerified === false) {
                    setUnverified((v) => [...v, device]);
                } else {
                    setNoEncryption((v) => [...v, device]);
                }
            });
    }, [deviceList, setVerified, setUnverified, setNoEncryption]);

    if (deviceList === null) {
        return (
            <div className="device-manage">
                <div className="device-manage__loading">
                    <LinearProgress />
                </div>
            </div>
        );
    }

    const handleRename = async (device) => {
        const newName = await promptDeviceName(device.display_name);
        if (newName === null || newName.trim() === '') return;
        if (newName.trim() === device.display_name) return;
        addToProcessing(device);
        try {
            await mx.setDeviceDetails(device.device_id, {
                display_name: newName,
            });
        } catch {
            if (!mountStore.getItem()) return;
            removeFromProcessing(device);
        }
    };

    const handleRemove = async (device) => {
        const isConfirmed = await confirmDialog(
            getText('device_manage.logout.title', device.display_name),
            getText('device_manage.logout.warning', device.display_name),
            getText('btn.logout'),
            'error',
        );
        if (!isConfirmed) return;
        addToProcessing(device);
        await authRequest(getText('device_manage.logout.title', device.display_name), async (auth) => {
            await mx.deleteDevice(device.device_id, auth);
        });

        if (!mountStore.getItem()) return;
        removeFromProcessing(device);
    };

    const verifyWithKey = async (device) => {
        const keyData = await accessSecretStorage('Session verification');
        if (!keyData) return;
        addToProcessing(device);
        await mx.checkOwnCrossSigningTrust();
    };

    const verifyWithEmojis = async (deviceId) => {
        const req = await mx.requestVerification(mx.getUserId(), [deviceId]);
        openEmojiVerification(req, { userId: mx.getUserId(), deviceId });
    };

    const verify = (deviceId, isCurrentDevice) => {
        if (isCurrentDevice) {
            verifyWithKey(deviceId);
            return;
        }
        verifyWithEmojis(deviceId);
    };

    const renderDevice = (device, isVerified) => {
        const deviceId = device.device_id;
        const displayName = device.display_name;
        const lastIP = device.last_seen_ip;
        const lastTS = device.last_seen_ts;
        const isCurrentDevice = mx.deviceId === deviceId;
        const canVerify = isVerified === false && (isMeVerified || isCurrentDevice);

        return (
            <SettingTile
                key={deviceId}
                title={(
                    <Text style={{ color: isVerified !== false ? '' : 'var(--tc-danger-high)' }}>
                        {displayName}
                        <Text variant="b3" span>{`${displayName ? ' — ' : ''}${deviceId}`}</Text>
                        {isCurrentDevice && <Text span className="device-manage__current-label" variant="b3">{getText('text.session.current')}</Text>}
                    </Text>
                )}
                options={
                    processing.includes(deviceId)
                        ? <CircularProgress />
                        : (
                            <>
                                {(isCSEnabled && canVerify) && <Button onClick={() => verify(deviceId, isCurrentDevice)} variant='outlined' color="positive">{getText('btn.verify')}</Button>}
                                <IconButton onClick={() => handleRename(device)}><Edit /></IconButton>
                                <IconButton onClick={() => handleRemove(device)} color='error'><Delete /></IconButton>
                            </>
                        )
                }
                content=
                {lastTS && (
                    <Text variant="b3">
                        {
                            translate(
                                'device_manage.last_activity',
                                <span style={{ color: 'var(--tc-surface-normal)' }}>
                                    {dateFormat(new Date(lastTS), ' HH:MM, dd/mm/yyyy')}
                                </span>,
                                (lastIP ? getText('device_manage.last_activity.ip', lastIP) : '')
                            )
                        }
                    </Text>
                )}
            />
        );
    };

    return (
        <div className="device-manage">
            <div>
                <MenuHeader>{getText('text.session.unverified')}</MenuHeader>
                {!isMeVerified && isCSEnabled && (
                    <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
                        <Alert
                            severity='info'
                        >
                            {getText('device_manage.verify.title')}
                        </Alert>
                    </div>
                )}
                {isMeVerified && unverified.length > 0 && (
                    <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
                        <Alert
                            severity='info'
                        >
                            {getText('device_manage.tip')}
                        </Alert>
                    </div>
                )}
                {!isCSEnabled && (
                    <div style={{ padding: 'var(--sp-extra-tight) var(--sp-normal)' }}>
                        <Alert
                            severity='warning'
                        >
                            {getText('device_manage.crosssigning_tip')}
                        </Alert>
                    </div>
                )}
                {
                    unverified.length > 0
                        ? unverified.map((device) => renderDevice(device, false))
                        : <Text className="device-manage__info">{getText('text.session.no_unverified')}</Text>
                }
            </div>
            {noEncryption.length > 0 && (
                <div>
                    <MenuHeader>{getText('text.session.no_encryption')}</MenuHeader>
                    {noEncryption.map((device) => renderDevice(device, null))}
                </div>
            )}
            <div>
                <MenuHeader>{getText('text.session.verified')}</MenuHeader>
                {
                    verified.length > 0
                        ? verified.map((device, index) => {
                            if (truncated && index >= TRUNCATED_COUNT) return null;
                            return renderDevice(device, true);
                        })
                        : <Text className="device-manage__info">{getText('text.session.no_verified')}</Text>
                }
                {verified.length > TRUNCATED_COUNT && (
                    <Button fullWidth variant='text' onClick={() => setTruncated(!truncated)}>
                        {
                            getText(
                                truncated ? 'generic.view_more.count' : 'generic.view_less',
                                verified.length - 4
                            )
                        }
                    </Button>
                )}
                {deviceList.length > 0 && (
                    <Text className="device-manage__info" variant="b3">{getText('device_manage.name_warning')}</Text>
                )}
            </div>
        </div>
    );
}

export default DeviceManage;
