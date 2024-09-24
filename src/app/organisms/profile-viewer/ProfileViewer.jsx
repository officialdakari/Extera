import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openReusableContextMenu } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

// TODO: Define that shit globally, do not ^C ^V from RoomNavItem.tsx
const styles = {
    'online': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#079d16', borderRadius: '50%' },
    'offline': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#737373', borderRadius: '50%' },
    'unavailable': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#b9a12d', borderRadius: '50%' }
};

import {
    getUsername,
    getUsernameOfRoomMember,
    getPowerLabel,
    hasDevices,
} from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Chip from '../../atoms/chip/Chip';
import Input from '../../atoms/input/Input';
import Avatar from '../../atoms/avatar/Avatar';
import { color, config, Button, IconButton as FoldsIconButton, Header, Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';
import PowerLevelSelector from '../../molecules/power-level-selector/PowerLevelSelector';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getDMRoomFor, getMxIdLocalPart, getMxIdServer } from '../../utils/matrix';
import { EventTimeline } from 'matrix-js-sdk';
import Banner from './Banner';
import { getText, translate } from '../../../lang';
import { useBackButton } from '../../hooks/useBackButton';
import { VerificationBadge } from '../../components/verification-badge/VerificationBadge';
import { Box } from 'folds';
import { mdiAccountCancelOutline, mdiAccountMinusOutline, mdiAccountPlusOutline, mdiBlockHelper, mdiCheck, mdiChevronDown, mdiChevronRight, mdiClose, mdiMessageOutline, mdiPlusCircleOutline, mdiShieldOutline } from '@mdi/js';
import Icon from '@mdi/react';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useAccountData } from '../../hooks/useAccountData';
import { AppBar, Dialog, DialogContent, DialogTitle, IconButton, Toolbar, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';

function ModerationTools({ roomId, userId }) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    const roomMember = room.getMember(userId);
    const [open, setOpen] = useState(false);
    const [ban, setBan] = useState(false);

    const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;
    const powerLevel = roomMember?.powerLevel || 0;
    const canIKick =
        roomMember?.membership === 'join' &&
        room.currentState.hasSufficientPowerLevelFor('kick', myPowerLevel) &&
        powerLevel < myPowerLevel;
    const canIBan =
        ['join', 'leave'].includes(roomMember?.membership) &&
        room.currentState.hasSufficientPowerLevelFor('ban', myPowerLevel) &&
        powerLevel < myPowerLevel;

    const handleKick = (e) => {
        setBan(false);
        setOpen(true);
    };

    const handleBan = (e) => {
        setBan(true);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const reason = e.target.elements['reason']?.value.trim();
        console.log(`!!! ${reason}`);
        if (ban) {
            roomActions.ban(roomId, userId, reason !== '' ? reason : undefined);
        } else {
            roomActions.kick(roomId, userId, reason !== '' ? reason : undefined);
        }
        setOpen(false);
    };

    return (
        <>
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <Modal variant="Surface" size='300' flexHeight>
                        <Header
                            style={{
                                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                borderBottomWidth: config.borderWidth.B300,
                            }}
                            variant="Surface"
                            size="500"
                        >
                            <Box grow="Yes">
                                <Text size="H4">
                                    {
                                        translate(
                                            ban ? 'title.ban' : 'title.kick',
                                            <b>{roomMember?.rawDisplayName ?? userId}</b>
                                        )
                                    }
                                </Text>
                            </Box>
                            <FoldsIconButton size="300" onClick={handleClose} radii="300">
                                <Icon size={1} path={mdiClose} />
                            </FoldsIconButton>
                        </Header>
                        <Box
                            as="form"
                            style={{ padding: config.space.S400 }}
                            direction="Column"
                            gap="400"
                            onSubmit={handleSubmit}
                        >
                            <Box direction="Column" gap="100">
                                <Input name="reason" placeholder={getText(ban ? 'label.profile_viewer.ban_reason' : 'label.profile_viewer.kick_reason')} variant="Secondary" autoComplete='off' />
                            </Box>
                            <Button
                                type="submit"
                                variant="Critical"
                            >
                                {getText(ban ? 'btn.profile_viewer.ban' : 'btn.profile_viewer.kick')}
                            </Button>
                        </Box>
                    </Modal>
                </OverlayCenter>
            </Overlay>
            {canIKick && (
                <Button onClick={handleKick} variant='Critical' fill='None' before={<Icon size={1} path={mdiAccountMinusOutline} />}>
                    {getText('btn.profile_viewer.kick')}
                </Button>
            )}
            {canIBan && (
                <Button onClick={handleBan} variant='Critical' fill='None' before={<Icon size={1} path={mdiAccountCancelOutline} />}>
                    {getText('btn.profile_viewer.ban')}
                </Button>
            )}
        </>
    );
}
ModerationTools.propTypes = {
    roomId: PropTypes.string.isRequired,
    userId: PropTypes.string.isRequired,
};

function SessionInfo({ userId }) {
    const [devices, setDevices] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const mx = initMatrix.matrixClient;

    useEffect(() => {
        let isUnmounted = false;

        async function loadDevices() {
            try {
                await mx.downloadKeys([userId], true);
                const myDevices = mx.getStoredDevicesForUser(userId);

                if (isUnmounted) return;
                setDevices(myDevices);
            } catch {
                setDevices([]);
            }
        }
        loadDevices();

        return () => {
            isUnmounted = true;
        };
    }, [userId]);

    function renderSessionChips() {
        if (!isVisible) return null;
        return (
            <div className="session-info__chips">
                {devices === null && <Text variant="b2">{getText('session_info.loading')}</Text>}
                {devices?.length === 0 && <Text variant="b2">{getText('session_info.none')}</Text>}
                {devices !== null &&
                    devices.map((device) => (
                        <Chip
                            key={device.deviceId}
                            iconSrc={mdiShieldOutline}
                            text={device.getDisplayName() || device.deviceId}
                        />
                    ))}
            </div>
        );
    }

    return (
        <div className="session-info" style={{ borderColor: color.Surface.ContainerLine }}>
            <MenuItem
                onClick={() => setIsVisible(!isVisible)}
                iconSrc={isVisible ? mdiChevronDown : mdiChevronRight}
            >
                <Text variant="b2">{getText('session_info.item', devices?.length ?? 0)}</Text>
            </MenuItem>
            {renderSessionChips()}
        </div>
    );
}

SessionInfo.propTypes = {
    userId: PropTypes.string.isRequired,
};

function ProfileFooter({ roomId, userId, onRequestClose }) {
    const [isCreatingDM, setIsCreatingDM] = useState(false);
    const [isIgnoring, setIsIgnoring] = useState(false);
    const [ignorePolicies] = useSetting(settingsAtom, 'ignorePolicies');
    const [isUserIgnored, setIsUserIgnored] = useState(ignorePolicies ? (roomActions.isIgnored(userId) ? true : false) : initMatrix.matrixClient.isUserIgnored(userId));
    const [isAdmin, setIsAdmin] = useState(false);

    if (ignorePolicies) {
        useAccountData(cons.IGNORE_POLICIES);
    }

    const isMountedRef = useRef(true);
    const mx = initMatrix.matrixClient;
    const { navigateRoom } = useRoomNavigate();
    const room = mx.getRoom(roomId);
    const member = room.getMember(userId);
    const isInvitable = member?.membership !== 'join' && member?.membership !== 'ban';

    useEffect(() => {
        mx.isSynapseAdministrator().then(setIsAdmin);
    }, [mx]);

    const [isInviting, setIsInviting] = useState(false);
    const [isInvited, setIsInvited] = useState(member?.membership === 'invite');

    const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel || 0;
    const userPL = room.getMember(userId)?.powerLevel || 0;
    const canIKick =
        room.currentState.hasSufficientPowerLevelFor('kick', myPowerlevel) && userPL < myPowerlevel;
    const canIForceJoin = getMxIdServer(userId) === getMxIdServer(mx.getUserId());

    const isBanned = member?.membership === 'ban';

    const onCreated = (dmRoomId) => {
        if (isMountedRef.current === false) return;
        setIsCreatingDM(false);
        navigateRoom(dmRoomId);
        onRequestClose();
    };

    useEffect(() => {
        setIsUserIgnored(initMatrix.matrixClient.isUserIgnored(userId));
        setIsIgnoring(false);
        setIsInviting(false);
    }, [userId]);

    const openDM = async () => {
        // Check and open if user already have a DM with userId.
        const dmRoomId = getDMRoomFor(mx, userId)?.roomId;
        if (dmRoomId) {
            navigateRoom(dmRoomId);
            onRequestClose();
            return;
        }

        // Create new DM
        try {
            setIsCreatingDM(true);
            const result = await roomActions.createDM(userId, await hasDevices(userId));
            onCreated(result.room_id);
        } catch {
            if (isMountedRef.current === false) return;
            setIsCreatingDM(false);
        }
    };

    const toggleIgnore = async () => {
        const isIgnored = roomActions.isIgnored(userId) || mx.getIgnoredUsers().includes(userId);

        try {
            setIsIgnoring(true);
            if (isIgnored) {
                await roomActions.unignore([userId]);
            } else {
                await roomActions.ignore([userId]);
            }

            if (isMountedRef.current === false) return;
            setIsUserIgnored(!isIgnored);
            setIsIgnoring(false);
        } catch {
            setIsIgnoring(false);
        }
    };

    const toggleInvite = async () => {
        try {
            setIsInviting(true);
            let isInviteSent = false;
            if (isInvited) await roomActions.kick(roomId, userId);
            else {
                await roomActions.invite(roomId, userId);
                isInviteSent = true;
            }
            if (isMountedRef.current === false) return;
            setIsInvited(isInviteSent);
            setIsInviting(false);
        } catch {
            setIsInviting(false);
        }
    };

    const forceJoin = async () => {
        const token = mx.getAccessToken();
        const baseUrl = mx.getHomeserverUrl();
        if (!token) return console.error('no token');
        const response = await fetch(`${baseUrl}/_synapse/admin/v1/join/${roomId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            method: 'POST',
            body: JSON.stringify({
                user_id: userId
            })
        });
        if (!response.ok) {
            alert(`Failed to force-join`);
        }
    };

    return (
        <>
            {(isInvitable && canIForceJoin && room.canInvite(mx.getUserId()) && isAdmin) && (
                <Button
                    before={<Icon size={1} path={mdiPlusCircleOutline} />}
                    variant='Success'
                    fill='None'
                    onClick={forceJoin}
                >
                    {getText('btn.profile_footer.force_join')}
                </Button>
            )}
            {!isUserIgnored && (
                <Button variant='Primary' fill='None' onClick={openDM} disabled={isCreatingDM} before={<Icon size={1} path={mdiMessageOutline} />}>
                    {getText(isCreatingDM ? 'profile_footer.dm.creating' : 'btn.profile_footer.dm')}
                </Button>
            )}
            {isBanned && canIKick && (
                <Button before={<Icon size={1} path={mdiCheck} />} variant='Success' fill='None' onClick={() => roomActions.unban(roomId, userId)}>
                    {getText('btn.profile_footer.unban')}
                </Button>
            )}
            {(isInvited ? canIKick : room.canInvite(mx.getUserId())) && isInvitable && (
                <Button variant='Primary' fill='None' before={<Icon size={1} path={mdiAccountPlusOutline} />} onClick={toggleInvite} disabled={isInviting}>
                    {isInvited
                        ? `${getText(isInviting ? 'btn.profile_footer.disinviting' : 'btn.profile_footer.disinvite')}`
                        : `${getText(isInviting ? 'btn.profile_footer.inviting' : 'btn.profile_footer.invite')}`}
                </Button>
            )}
            <Button
                before={<Icon size={1} path={isUserIgnored ? mdiCheck : mdiBlockHelper} />}
                variant={isUserIgnored ? 'Success' : 'Critical'}
                fill='None'
                onClick={toggleIgnore}
                disabled={isIgnoring}
            >
                {isUserIgnored
                    ? `${getText(isIgnoring ? 'btn.profile_footer.unignoring' : 'btn.profile_footer.unignore')}`
                    : `${getText(isIgnoring ? 'btn.profile_footer.ignoring' : 'btn.profile_footer.ignore')}`}
            </Button>
        </>
    );
}
ProfileFooter.propTypes = {
    roomId: PropTypes.string.isRequired,
    userId: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

function useToggleDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const loadProfile = (uId, rId) => {
            setIsOpen(true);
            setUserId(uId);
            setRoomId(rId);
        };
        navigation.on(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
        return () => {
            navigation.removeListener(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
        };
    }, []);

    const closeDialog = () => setIsOpen(false);

    const afterClose = () => {
        setUserId(null);
        setRoomId(null);
    };

    return [isOpen, roomId, userId, closeDialog, afterClose];
}

function useRerenderOnProfileChange(roomId, userId) {
    const mx = initMatrix.matrixClient;
    const [, forceUpdate] = useForceUpdate();
    useEffect(() => {
        const handleProfileChange = (mEvent, member) => {
            if (
                mEvent.getRoomId() === roomId &&
                (member.userId === userId || member.userId === mx.getUserId())
            ) {
                forceUpdate();
            }
        };
        mx.on('RoomMember.powerLevel', handleProfileChange);
        mx.on('RoomMember.membership', handleProfileChange);
        return () => {
            mx.removeListener('RoomMember.powerLevel', handleProfileChange);
            mx.removeListener('RoomMember.membership', handleProfileChange);
        };
    }, [roomId, userId]);
}

function ProfileViewer() {
    const [isOpen, roomId, userId, closeDialog, handleAfterClose] = useToggleDialog();
    const screenSize = useScreenSize();
    useRerenderOnProfileChange(roomId, userId);

    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);

    const [avStyle, setAvStyle] = useState({});
    const [statusMsg, setStatusMsg] = useState('');
    const user = mx.getUser(userId);

    useEffect(() => {
        if (user) {
            setStatusMsg(user.presenceStatusMsg);
            setAvStyle(styles[user.presence] ?? styles.offline);
        }
    }, [mx, user]);

    const renderProfile = () => {
        const roomMember = room.getMember(userId);
        const username = roomMember ? getUsernameOfRoomMember(roomMember) : getUsername(userId);
        const avatarMxc = roomMember?.getMxcAvatarUrl?.() || mx.getUser(userId)?.avatarUrl;
        const avatarUrl =
            avatarMxc && avatarMxc !== 'null' ? mx.mxcUrlToHttp(avatarMxc, 80, 80, 'crop') : null;

        const powerLevel = roomMember?.powerLevel || 0;
        const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;

        const roomState = room.getLiveTimeline().getState(EventTimeline.FORWARDS);
        const membership = roomState.getStateEvents('m.room.member', userId);
        const membershipContent = membership?.getContent() ?? {};

        var bannerUrl;

        console.log(membershipContent);

        if (typeof membershipContent[cons.EXTERA_BANNER_URL] === 'string' && membershipContent[cons.EXTERA_BANNER_URL].startsWith('mxc://')) {
            bannerUrl = mx.mxcUrlToHttp(membershipContent[cons.EXTERA_BANNER_URL], false, false, false, false, true, true);
        }

        const canChangeRole =
            room.currentState.maySendEvent('m.room.power_levels', mx.getUserId()) &&
            (powerLevel < myPowerLevel || userId === mx.getUserId());

        const handleChangePowerLevel = async (newPowerLevel) => {
            if (newPowerLevel === powerLevel) return;
            const SHARED_POWER_MSG =
                getText('shared_pl_warning');
            const DEMOTING_MYSELF_MSG =
                getText('self_demote_warning');

            const isSharedPower = newPowerLevel === myPowerLevel;
            const isDemotingMyself = userId === mx.getUserId();
            if (isSharedPower || isDemotingMyself) {
                const isConfirmed = await confirmDialog(
                    getText('profile_viewer.change_power_level.title'),
                    isSharedPower ? SHARED_POWER_MSG : DEMOTING_MYSELF_MSG,
                    getText('btn.profile_viewer.change_pl'),
                    'caution'
                );
                if (!isConfirmed) return;
                roomActions.setPowerLevel(roomId, userId, newPowerLevel);
            } else {
                roomActions.setPowerLevel(roomId, userId, newPowerLevel);
            }
        };

        const handlePowerSelector = (e) => {
            openReusableContextMenu('bottom', getEventCords(e, '.btn-surface'), (closeMenu) => (
                <PowerLevelSelector
                    value={powerLevel}
                    max={myPowerLevel}
                    onSelect={(pl) => {
                        closeMenu();
                        handleChangePowerLevel(pl);
                    }}
                />
            ));
        };

        return (
            <div className="profile-viewer">
                {bannerUrl && <Banner noBorder={true} url={bannerUrl} />}
                <div className="profile-viewer__user">
                    <Avatar style={avStyle} imageSrc={avatarUrl} text={username} bgColor={colorMXID(userId)} size="large" />
                    <div className="profile-viewer__user__info">
                        <Box direction='Row'>
                            <Text variant="s1" weight="medium">
                                {username}
                            </Text>
                            <VerificationBadge userId={userId} userName={username} />
                        </Box>
                        <Text variant="b2">{userId}</Text>
                    </div>
                    <div className="profile-viewer__user__role">
                        <Text variant="b3">{getText('profile_viewer.power_level')}</Text>
                        <Button
                            onClick={canChangeRole ? handlePowerSelector : null}
                            fill='Soft'
                            variant='Secondary'
                            before={canChangeRole ? <Icon size={1} path={mdiChevronDown} /> : null}
                        >
                            {`${getPowerLabel(powerLevel) || getText('generic.pl_member')} - ${powerLevel}`}
                        </Button>
                    </div>
                </div>
                <Text>{statusMsg}</Text>
                <SessionInfo userId={userId} />
                <div class="action-list" style={{ borderColor: color.Surface.ContainerLine }}>
                    {userId !== mx.getUserId() && (
                        <ProfileFooter roomId={roomId} userId={userId} onRequestClose={closeDialog} />
                    )}
                    <ModerationTools roomId={roomId} userId={userId} />
                </div>
            </div>
        );
    };

    useBackButton(closeDialog);

    return (
        <Dialog
            fullScreen={screenSize === ScreenSize.Mobile}
            open={isOpen}
            onClose={closeDialog}
        >
            <AppBar position='relative'>
                <Toolbar>
                    <Typography variant='h6' component='div' flexGrow={1}>
                        {userId}
                    </Typography>
                    <IconButton
                        onClick={closeDialog}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <DialogContent dividers>
                {roomId ? renderProfile() : <div />}
            </DialogContent>
        </Dialog>
    );
}

export default ProfileViewer;
