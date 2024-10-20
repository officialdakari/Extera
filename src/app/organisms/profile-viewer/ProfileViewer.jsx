import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openReusableContextMenu } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import {
    getUsername,
    getUsernameOfRoomMember,
    getPowerLabel,
    hasDevices,
} from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';
import colorMXID from '../../../util/colorMXID';

import Avatar from '../../atoms/avatar/Avatar';
import { color, config, Header, Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
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
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Button, ButtonGroup, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, TextField, Toolbar, Typography, useTheme } from '@mui/material';
import { AddCircleOutline, BlockOutlined, Check, Close, ExpandMore, KeyboardArrowDown, MessageOutlined, PersonAddDisabledOutlined, PersonAddOutlined, PersonOff, PersonRemoveOutlined } from '@mui/icons-material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import styled from '@emotion/styled';
import { LoadingButton } from '@mui/lab';
import UserSelect from '../../atoms/user-select/UserSelect';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    alignItems: 'flex-start',
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
    // Override media queries injected by theme.mixins.toolbar
    '@media all': {
        minHeight: 128,
    },
}));

function ModerationTools({ roomId, userId }) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    const roomMember = room.getMember(userId);
    const [open, setOpen] = useState(false);
    const [ban, setBan] = useState(false);
    const theme = useTheme();

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
            <Dialog
                open={open}
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: handleSubmit
                }}
            >
                <DialogTitle>
                    {
                        translate(
                            ban ? 'title.ban' : 'title.kick',
                            <b>{roomMember?.rawDisplayName ?? userId}</b>
                        )
                    }
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label={getText(ban ? 'label.profile_viewer.ban_reason' : 'label.profile_viewer.kick_reason')}
                        autoFocus
                        required
                        name='reason'
                        fullWidth
                        variant='outlined'
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{getText('btn.cancel')}</Button>
                    <Button type='submit'>{getText(ban ? 'btn.profile_viewer.ban' : 'btn.profile_viewer.kick')}</Button>
                </DialogActions>
            </Dialog>
            {canIKick && (
                <Button
                    onClick={handleKick}
                    color='error'
                    startIcon={<PersonRemoveOutlined />}
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                >
                    {getText('btn.profile_viewer.kick')}
                </Button>
            )}
            {canIBan && (
                <Button
                    onClick={handleBan}
                    color='error'
                    startIcon={<PersonOff />}
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                >
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
        return (
            <>
                {devices === null && <Typography variant='subtitle1'>{getText('session_info.loading')}</Typography>}
                {devices?.length === 0 && <Typography variant='subtitle1'>{getText('session_info.none')}</Typography>}
                {devices !== null &&
                    devices.map((device) => (
                        <ListItem key={device.deviceId}>
                            <ListItemText sx={{ userSelect: 'text' }}>
                                {device.getDisplayName() || device.deviceId}
                            </ListItemText>
                        </ListItem>
                    ))}
            </>
        );
    }

    return (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMore />}
            >
                {getText('session_info.item', devices?.length ?? 0)}
            </AccordionSummary>
            <AccordionDetails>
                <List>
                    {renderSessionChips()}
                </List>
            </AccordionDetails>
        </Accordion>
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

    const theme = useTheme();

    return (
        <>
            {(isInvitable && canIForceJoin && room.canInvite(mx.getUserId()) && isAdmin) && (
                <Button
                    onClick={forceJoin}
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                    startIcon={<AddCircleOutline />}
                    key='forceJoin'
                >
                    {getText('btn.profile_footer.force_join')}
                </Button>
            )}
            {(isInvited ? canIKick : room.canInvite(mx.getUserId())) && isInvitable && (
                <LoadingButton
                    key='invite'
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                    onClick={toggleInvite}
                    loading={isInviting}
                    startIcon={isInvited ? (
                        <PersonAddDisabledOutlined />
                    ) : (
                        <PersonAddOutlined />
                    )}
                >
                    {isInvited
                        ? `${getText(isInviting ? 'btn.profile_footer.disinviting' : 'btn.profile_footer.disinvite')}`
                        : `${getText(isInviting ? 'btn.profile_footer.inviting' : 'btn.profile_footer.invite')}`}
                </LoadingButton>
            )}
            {!isUserIgnored && (
                <LoadingButton
                    loading={isCreatingDM}
                    key='dm'
                    onClick={openDM}
                    startIcon={<MessageOutlined />}
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                >
                    {getText(isCreatingDM ? 'profile_footer.dm.creating' : 'btn.profile_footer.dm')}
                </LoadingButton>
            )}
            <LoadingButton
                loading={isIgnoring}
                key='ignore'
                onClick={toggleIgnore}
                startIcon={isUserIgnored ? (
                    <Check />
                ) : (
                    <BlockOutlined />
                )}
                sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                color='error'
            >
                {isUserIgnored
                    ? `${getText(isIgnoring ? 'btn.profile_footer.unignoring' : 'btn.profile_footer.unignore')}`
                    : `${getText(isIgnoring ? 'btn.profile_footer.ignoring' : 'btn.profile_footer.ignore')}`}
            </LoadingButton>
            {isBanned && canIKick && (
                <LoadingButton
                    sx={{ width: '100%', justifyContent: 'flex-start', paddingLeft: theme.spacing(3) }}
                    onClick={() => roomActions.unban(roomId, userId)}
                    startIcon={<Check />}
                >
                    {getText('btn.profile_footer.unban')}
                </LoadingButton>
            )}
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

    const [avStyle, setAvStyle] = useState('offline');
    const [statusMsg, setStatusMsg] = useState('');
    const user = mx.getUser(userId);

    useEffect(() => {
        if (user) {
            setStatusMsg(user.presenceStatusMsg);
            setAvStyle(user.presence);
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

        const theme = useTheme();

        return (
            <div className="profile-viewer">
                <Box grow='Yes'>
                    <AppBar
                        position='static'
                        sx={bannerUrl && {
                            background: `url(${bannerUrl}), #00000060`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            backgroundBlendMode: 'darken'
                        }}
                    >
                        <StyledToolbar>
                            <Box as='div' grow='Yes' className='profile-viewer__box'>
                                <div className="profile-viewer__user">
                                    <Avatar className={`presence-${avStyle}`} imageSrc={avatarUrl} text={username} bgColor={colorMXID(userId)} size="large" />
                                    <div className="profile-viewer__user__info">
                                        <UserSelect>
                                            <Box direction='Row'>
                                                <Typography variant='h6' component='span'>
                                                    {username}
                                                </Typography>
                                                <VerificationBadge userId={userId} userName={username} />
                                            </Box>
                                            <Typography variant="caption">{userId}</Typography>
                                        </UserSelect>
                                    </div>
                                    {/* <div className="profile-viewer__user__role">
                                        <Button
                                            onClick={canChangeRole ? handlePowerSelector : null}
                                            color='inherit'
                                            variant='contained'
                                            startIcon={canChangeRole ? <KeyboardArrowDown /> : null}
                                        >
                                            {`${getPowerLabel(powerLevel) || getText('generic.pl_member')} - ${powerLevel}`}
                                        </Button>
                                    </div> */}
                                </div>
                            </Box>
                            <IconButton
                                onClick={closeDialog}
                                size='large'
                                edge='end'
                            >
                                <Close />
                            </IconButton>
                        </StyledToolbar>
                    </AppBar>
                </Box>
                <DialogContent>
                    <Typography sx={{ userSelect: 'text' }} variant='body1'>{statusMsg}</Typography>
                    <SessionInfo userId={userId} />
                    <Accordion>
                        <AccordionSummary
                            expandIcon={<ExpandMore />}
                            disabled={!canChangeRole}
                        >
                            {`${getPowerLabel(powerLevel) || getText('generic.pl_member')} - ${powerLevel}`}
                        </AccordionSummary>
                        {canChangeRole && (
                            <AccordionDetails>
                                <PowerLevelSelector
                                    value={powerLevel}
                                    max={myPowerLevel}
                                    onSelect={(pl) => {
                                        closeMenu();
                                        handleChangePowerLevel(pl);
                                    }}
                                />
                            </AccordionDetails>
                        )}
                    </Accordion>
                    <div style={{ width: '100%', marginTop: theme.spacing(2), marginBottom: theme.spacing(2) }}>
                        {userId !== mx.getUserId() && (
                            <ProfileFooter roomId={roomId} userId={userId} onRequestClose={closeDialog} />
                        )}
                        {userId !== mx.getUserId() && (
                            <ModerationTools roomId={roomId} userId={userId} />
                        )}
                    </div>
                </DialogContent>
            </div>
        );
    };

    useBackButton(closeDialog);

    return (
        <Dialog
            //fullScreen={screenSize === ScreenSize.Mobile}
            open={isOpen}
            onClose={closeDialog}

        >
            {roomId ? renderProfile() : <div />}
        </Dialog>
    );
}

export default ProfileViewer;
