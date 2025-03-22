import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import { EventTimeline, RoomMemberEvent, MatrixEvent, RoomMember } from 'matrix-js-sdk';
import { Box } from 'folds';
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, styled, TextField, Toolbar, Typography, useTheme } from '@mui/material';
import { AddCircleOutline, BlockOutlined, Check, Close, ExpandMore, MessageOutlined, PersonAddDisabledOutlined, PersonAddOutlined, PersonOff, PersonRemoveOutlined } from '@mui/icons-material';
import { DeviceInfo } from 'matrix-js-sdk/lib/crypto/deviceinfo';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import * as roomActions from '../../../client/action/room';

import {
	getUsername,
	getUsernameOfRoomMember,
	getPowerLabel,
	hasDevices,
} from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';

import Avatar from '../../atoms/avatar/Avatar';
import PowerLevelSelector from '../../molecules/power-level-selector/PowerLevelSelector';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getDMRoomFor, getMxIdServer, mxcUrlToHttp } from '../../utils/matrix';
import { getText, translate } from '../../../lang';
import { BackButtonHandler } from '../../hooks/useBackButton';
import { VerificationBadge } from '../../components/verification-badge/VerificationBadge';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import UserSelect from '../../atoms/user-select/UserSelect';
import ActionListButton, { LoadingActionListButton } from '../../atoms/action-list-button/ActionListButton';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
	alignItems: 'flex-start',
	paddingTop: theme.spacing(1),
	paddingBottom: theme.spacing(2),
	// Override media queries injected by theme.mixins.toolbar
	'@media all': {
		minHeight: 128,
	},
}));

function ModerationTools({ roomId, userId }: { roomId: string, userId: string }) {
	const mx = useMatrixClient();
	const room = mx.getRoom(roomId);
	const roomMember = room?.getMember(userId);
	const [open, setOpen] = useState(false);
	const [ban, setBan] = useState(false);

	if (!room || !roomMember) return null;

	const myPowerLevel = room.getMember(mx.getUserId()!)?.powerLevel || 0;
	const powerLevel = roomMember?.powerLevel || 0;
	const canIKick =
		roomMember?.membership === 'join' &&
		room.currentState.hasSufficientPowerLevelFor('kick', myPowerLevel) &&
		powerLevel < myPowerLevel;
	const canIBan =
		['join', 'leave'].includes(roomMember.membership!) &&
		room.currentState.hasSufficientPowerLevelFor('ban', myPowerLevel) &&
		powerLevel < myPowerLevel;

	const handleKick = () => {
		setBan(false);
		setOpen(true);
	};

	const handleBan = () => {
		setBan(true);
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const reason = form.elements.namedItem('reason') as HTMLInputElement;
		const reasonValue = reason?.value.trim();
		if (ban) {
			roomActions.ban(roomId, userId, reasonValue !== '' ? reasonValue : undefined);
		} else {
			roomActions.kick(roomId, userId, reasonValue !== '' ? reasonValue : undefined);
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
						name='reason'
						fullWidth
						variant='outlined'
						sx={{ mt: 1 }}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>{getText('btn.cancel')}</Button>
					<Button color='error' type='submit'>{getText(ban ? 'btn.profile_viewer.ban' : 'btn.profile_viewer.kick')}</Button>
				</DialogActions>
			</Dialog>
			{canIKick && (
				<ActionListButton
					onClick={handleKick}
					color='error'
					startIcon={<PersonRemoveOutlined />}
				>
					{getText('btn.profile_viewer.kick')}
				</ActionListButton>
			)}
			{canIBan && (
				<ActionListButton
					onClick={handleBan}
					color='error'
					startIcon={<PersonOff />}
				>
					{getText('btn.profile_viewer.ban')}
				</ActionListButton>
			)}
		</>
	);
}
ModerationTools.propTypes = {
	roomId: PropTypes.string.isRequired,
	userId: PropTypes.string.isRequired,
};

function SessionInfo({ userId }: { userId: string }) {
	const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
	const mx = useMatrixClient();

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
	}, [mx, userId]);

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

function ProfileFooter({ roomId, userId, onRequestClose }: { roomId: string, userId: string, onRequestClose: () => void }) {
	const mx = useMatrixClient();

	const [isCreatingDM, setIsCreatingDM] = useState(false);
	const [isIgnoring, setIsIgnoring] = useState(false);
	const [ignorePolicies] = useSetting(settingsAtom, 'ignorePolicies');
	const [isUserIgnored, setIsUserIgnored] = useState(ignorePolicies ? (!!roomActions.isIgnored(userId)) : mx.isUserIgnored(userId));
	const [isAdmin, setIsAdmin] = useState(false);

	const isMountedRef = useRef(true);
	const { navigateRoom } = useRoomNavigate();
	const room = mx.getRoom(roomId);
	const member = room?.getMember(userId);
	const isInvitable = member?.membership !== 'join' && member?.membership !== 'ban';

	useEffect(() => {
		mx.isSynapseAdministrator().then(setIsAdmin);
	}, [mx]);

	const [isInviting, setIsInviting] = useState(false);
	const [isInvited, setIsInvited] = useState(member?.membership === 'invite');

	useEffect(() => {
		setIsUserIgnored(mx.isUserIgnored(userId));
		setIsIgnoring(false);
		setIsInviting(false);
	}, [mx, userId]);

	if (!room || !member) return null;

	const myPowerlevel = room.getMember(mx.getUserId()!)?.powerLevel || 0;
	const userPL = room.getMember(userId)?.powerLevel || 0;
	const canIKick =
		room.currentState.hasSufficientPowerLevelFor('kick', myPowerlevel) && userPL < myPowerlevel;
	const canIForceJoin = getMxIdServer(userId) === getMxIdServer(mx.getUserId()!);

	const isBanned = member?.membership === 'ban';

	const onCreated = (dmRoomId: string) => {
		if (isMountedRef.current === false) return;
		setIsCreatingDM(false);
		navigateRoom(dmRoomId);
		onRequestClose();
	};

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
		} catch (err) {
			setIsIgnoring(false);
			console.error('Failed ignore', err);
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
		if (!token) return;
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
			{(isInvitable && canIForceJoin && room.canInvite(mx.getUserId()!) && isAdmin) && (
				<ActionListButton
					onClick={forceJoin}
					startIcon={<AddCircleOutline />}
					key='forceJoin'
				>
					{getText('btn.profile_footer.force_join')}
				</ActionListButton>
			)}
			{(isInvited ? canIKick : room.canInvite(mx.getUserId()!)) && isInvitable && (
				<LoadingActionListButton
					key='invite'
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
				</LoadingActionListButton>
			)}
			{!isUserIgnored && (
				<LoadingActionListButton
					loading={isCreatingDM}
					key='dm'
					onClick={openDM}
					startIcon={<MessageOutlined />}
				>
					{getText(isCreatingDM ? 'profile_footer.dm.creating' : 'btn.profile_footer.dm')}
				</LoadingActionListButton>
			)}
			<LoadingActionListButton
				loading={isIgnoring}
				key='ignore'
				onClick={toggleIgnore}
				startIcon={isUserIgnored ? (
					<Check />
				) : (
					<BlockOutlined />
				)}
				color='error'
			>
				{isUserIgnored
					? `${getText(isIgnoring ? 'btn.profile_footer.unignoring' : 'btn.profile_footer.unignore')}`
					: `${getText(isIgnoring ? 'btn.profile_footer.ignoring' : 'btn.profile_footer.ignore')}`}
			</LoadingActionListButton>
			{isBanned && canIKick && (
				<LoadingActionListButton
					onClick={() => roomActions.unban(roomId, userId)}
					startIcon={<Check />}
				>
					{getText('btn.profile_footer.unban')}
				</LoadingActionListButton>
			)}
		</>
	);
}

function useToggleDialog() {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [roomId, setRoomId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const loadProfile = (uId: string, rId: string) => {
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

	return { isOpen, roomId, userId, closeDialog, afterClose };
}

function useRerenderOnProfileChange(roomId: string, userId: string) {
	const mx = useMatrixClient();
	const [, forceUpdate] = useForceUpdate();
	useEffect(() => {
		const handleProfileChange = (mEvent: MatrixEvent, member: RoomMember) => {
			if (
				mEvent.getRoomId() === roomId &&
				(member.userId === userId || member.userId === mx.getUserId())
			) {
				forceUpdate();
			}
		};
		mx.on(RoomMemberEvent.PowerLevel, handleProfileChange);
		mx.on(RoomMemberEvent.Membership, handleProfileChange);
		return () => {
			mx.removeListener(RoomMemberEvent.PowerLevel, handleProfileChange);
			mx.removeListener(RoomMemberEvent.Membership, handleProfileChange);
		};
	}, [mx, roomId, userId, forceUpdate]);
}

function ProfileViewer() {
	const { isOpen, roomId, userId, closeDialog } = useToggleDialog();
	const screenSize = useScreenSize();
	const theme = useTheme();
	useRerenderOnProfileChange(roomId!, userId!);

	const mx = useMatrixClient();
	const room = mx.getRoom(roomId!);

	const [avStyle, setAvStyle] = useState('offline');
	const [statusMsg, setStatusMsg] = useState('');
	const user = mx.getUser(userId!);

	useEffect(() => {
		if (user) {
			setStatusMsg(user?.presenceStatusMsg || '');
			setAvStyle(user.presence);
		}
	}, [mx, user]);

	const renderProfile = () => {
		const roomMember = room?.getMember(userId!);
		const username = roomMember ? getUsernameOfRoomMember(roomMember) : getUsername(userId!);
		const avatarMxc = roomMember?.getMxcAvatarUrl?.() || mx.getUser(userId!)?.avatarUrl;
		const avatarUrl =
			avatarMxc && avatarMxc !== 'null' ? mxcUrlToHttp(mx, avatarMxc, 80, 80, 'crop') : null;

		const powerLevel = roomMember?.powerLevel || 0;
		const myPowerLevel = room?.getMember(mx.getUserId()!)?.powerLevel || 0;

		const roomState = room?.getLiveTimeline()?.getState(EventTimeline.FORWARDS);
		const membership = roomState?.getStateEvents('m.room.member', userId!);
		const membershipContent = membership?.getContent() ?? {};

		let bannerUrl;

		if (typeof membershipContent[cons.EXTERA_BANNER_URL] === 'string' && membershipContent[cons.EXTERA_BANNER_URL].startsWith('mxc://')) {
			bannerUrl = mxcUrlToHttp(mx, membershipContent[cons.EXTERA_BANNER_URL]);
		}

		const canChangeRole =
			room?.currentState.maySendEvent('m.room.power_levels', mx.getUserId()!) &&
			(powerLevel < myPowerLevel || userId === mx.getUserId());

		const handleChangePowerLevel = async (newPowerLevel: number) => {
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
					'warning'
				);
				if (!isConfirmed) return;
				roomActions.setPowerLevel(roomId, userId, newPowerLevel);
			} else {
				roomActions.setPowerLevel(roomId, userId, newPowerLevel);
			}
		};

		return (
			<div className="profile-viewer">
				<Box grow='Yes'>
					<AppBar
						position='static'
						className={bannerUrl ? 'appbar__has-banner' : undefined}
						sx={bannerUrl ? {
							background: `url(${bannerUrl}), #00000060`,
							backgroundRepeat: 'no-repeat',
							backgroundSize: 'cover',
							backgroundBlendMode: 'darken'
						} : undefined}
					>
						<StyledToolbar>
							<Box as='div' grow='Yes' className='profile-viewer__box'>
								<div className="profile-viewer__user">
									<Avatar avatarClassName={`presence-${avStyle}`} imageSrc={avatarUrl} text={username} bgColor={colorMXID(userId)} size="large" />
									<div className="profile-viewer__user__info">
										<UserSelect>
											<Box direction='Row'>
												<Typography variant='h6' component='span'>
													{username}
												</Typography>
												<VerificationBadge userId={userId!} userName={username} />
											</Box>
											<Typography variant="caption">{userId}</Typography>
										</UserSelect>
									</div>
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
					<SessionInfo userId={userId!} />
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
										handleChangePowerLevel(pl);
									}}
								/>
							</AccordionDetails>
						)}
					</Accordion>
					<div style={{ width: '100%', marginTop: theme.spacing(2), marginBottom: theme.spacing(2) }}>
						{userId !== mx.getUserId() && (
							<ProfileFooter roomId={roomId!} userId={userId!} onRequestClose={closeDialog} />
						)}
						{userId !== mx.getUserId() && (
							<ModerationTools roomId={roomId!} userId={userId!} />
						)}
					</div>
				</DialogContent>
			</div>
		);
	};

	return (
		<Dialog
			fullWidth
			fullScreen={screenSize === ScreenSize.Mobile}
			maxWidth={screenSize !== ScreenSize.Mobile ? 'sm' : undefined}
			open={isOpen}
			onClose={closeDialog}
		>
			{isOpen && <BackButtonHandler callback={closeDialog} id='profile-viewer' />}
			{roomId ? renderProfile() : <div />}
		</Dialog>
	);
}

export default ProfileViewer;
