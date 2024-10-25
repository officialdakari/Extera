import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './InviteUser.scss';

import initMatrix from '../../../client/initMatrix';
import * as roomActions from '../../../client/action/room';
import { hasDevices } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import RoomTile from '../../molecules/room-tile/RoomTile';

import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getDMRoomFor, getRoomNameOrId } from '../../utils/matrix';
import { getText } from '../../../lang';
import { BackButtonHandler, useBackButton } from '../../hooks/useBackButton';
import { mdiAccount, mdiClose } from '@mdi/js';
import { AppBar, Button, CircularProgress, Dialog, DialogContent, Divider, IconButton, LinearProgress, TextField, Toolbar, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { SearchContainer, SearchIcon, SearchIconWrapper, SearchInputBase } from '../../atoms/search/Search';

function InviteUser({ isOpen, roomId, searchTerm, onRequestClose }) {
    const [isSearching, updateIsSearching] = useState(false);
    const [searchQuery, updateSearchQuery] = useState({});
    const [users, updateUsers] = useState([]);

    const [procUsers, updateProcUsers] = useState(new Set()); // proc stands for processing.
    const [procUserError, updateUserProcError] = useState(new Map());

    const [createdDM, updateCreatedDM] = useState(new Map());
    const [roomIdToUserId, updateRoomIdToUserId] = useState(new Map());

    const [invitedUserIds, updateInvitedUserIds] = useState(new Set());

    const usernameRef = useRef(null);

    const mx = initMatrix.matrixClient;
    const { navigateRoom } = useRoomNavigate();

    function getMapCopy(myMap) {
        const newMap = new Map();
        myMap.forEach((data, key) => {
            newMap.set(key, data);
        });
        return newMap;
    }
    function addUserToProc(userId) {
        procUsers.add(userId);
        updateProcUsers(new Set(Array.from(procUsers)));
    }
    function deleteUserFromProc(userId) {
        procUsers.delete(userId);
        updateProcUsers(new Set(Array.from(procUsers)));
    }

    function onDMCreated(newRoomId) {
        const myDMPartnerId = roomIdToUserId.get(newRoomId);
        if (typeof myDMPartnerId === 'undefined') return;

        createdDM.set(myDMPartnerId, newRoomId);
        roomIdToUserId.delete(newRoomId);

        deleteUserFromProc(myDMPartnerId);
        updateCreatedDM(getMapCopy(createdDM));
        updateRoomIdToUserId(getMapCopy(roomIdToUserId));
    }

    async function searchUser(username) {
        const inputUsername = username.trim();
        if (isSearching || inputUsername === '' || inputUsername === searchQuery.username) return;
        const isInputUserId = inputUsername[0] === '@' && inputUsername.indexOf(':') > 1;
        updateIsSearching(true);
        updateSearchQuery({ username: inputUsername });

        if (isInputUserId) {
            try {
                const result = await mx.getProfileInfo(inputUsername);
                updateUsers([
                    {
                        user_id: inputUsername,
                        display_name: result.displayname,
                        avatar_url: result.avatar_url,
                    },
                ]);
            } catch (e) {
                updateSearchQuery({ error: getText('error.invite.not_found', inputUsername) });
            }
        } else {
            try {
                const result = await mx.searchUserDirectory({
                    term: inputUsername,
                    limit: 20,
                });
                if (result.results.length === 0) {
                    updateSearchQuery({ error: getText('generic.no_matches.2', inputUsername) });
                    updateIsSearching(false);
                    return;
                }
                updateUsers(result.results);
            } catch (e) {
                updateSearchQuery({ error: 'Something went wrong!' });
            }
        }
        updateIsSearching(false);
    }

    async function createDM(userId) {
        if (mx.getUserId() === userId) return;
        const dmRoomId = getDMRoomFor(mx, userId)?.roomId;
        if (dmRoomId) {
            navigateRoom(dmRoomId);
            onRequestClose();
            return;
        }

        try {
            addUserToProc(userId);
            procUserError.delete(userId);
            updateUserProcError(getMapCopy(procUserError));

            const result = await roomActions.createDM(userId, await hasDevices(userId));
            roomIdToUserId.set(result.room_id, userId);
            updateRoomIdToUserId(getMapCopy(roomIdToUserId));
            onDMCreated(result.room_id);
        } catch (e) {
            deleteUserFromProc(userId);
            if (typeof e.message === 'string') procUserError.set(userId, e.message);
            else procUserError.set(userId, 'Something went wrong!');
            updateUserProcError(getMapCopy(procUserError));
        }
    }

    async function inviteToRoom(userId) {
        if (typeof roomId === 'undefined') return;
        try {
            addUserToProc(userId);
            procUserError.delete(userId);
            updateUserProcError(getMapCopy(procUserError));

            await roomActions.invite(roomId, userId);

            invitedUserIds.add(userId);
            updateInvitedUserIds(new Set(Array.from(invitedUserIds)));
            deleteUserFromProc(userId);
        } catch (e) {
            deleteUserFromProc(userId);
            if (typeof e.message === 'string') procUserError.set(userId, e.message);
            else procUserError.set(userId, 'Something went wrong!');
            updateUserProcError(getMapCopy(procUserError));
        }
    }

    function renderUserList() {
        const renderOptions = (userId) => {
            const messageJSX = (message, isPositive) => (
                <Typography color={isPositive ? 'primary' : 'error'} variant='body2'>
                    {message}
                </Typography>
            );

            if (mx.getUserId() === userId) return null;
            if (procUsers.has(userId)) {
                return <CircularProgress />;
            }
            if (createdDM.has(userId)) {
                // eslint-disable-next-line max-len
                return (
                    <Button
                        onClick={() => {
                            navigateRoom(createdDM.get(userId));
                            onRequestClose();
                        }}
                    >
                        {getText('btn.open')}
                    </Button>
                );
            }
            if (invitedUserIds.has(userId)) {
                return messageJSX('Invited', true);
            }
            if (typeof roomId === 'string') {
                const member = mx.getRoom(roomId).getMember(userId);
                if (member !== null) {
                    const userMembership = member.membership;
                    switch (userMembership) {
                        case 'join':
                            return messageJSX(getText('invite.joined'), true);
                        case 'invite':
                            return messageJSX(getText('invite.invited'), true);
                        case 'ban':
                            return messageJSX(getText('invite.banned'), false);
                        default:
                    }
                }
            }
            return typeof roomId === 'string' ? (
                <Button onClick={() => inviteToRoom(userId)} variant='contained' color="primary">
                    {getText('btn.invite')}
                </Button>
            ) : (
                <Button onClick={() => createDM(userId)} variant='contained' color="primary">
                    {getText('btn.dm')}
                </Button>
            );
        };
        const renderError = (userId) => {
            if (!procUserError.has(userId)) return null;
            return (
                <Typography color='error'>
                    {procUserError.get(userId)}
                </Typography>
            );
        };

        return users.map((user) => {
            const userId = user.user_id;
            const name = typeof user.display_name === 'string' ? user.display_name : userId;
            return (
                <RoomTile
                    key={userId}
                    avatarSrc={
                        typeof user.avatar_url === 'string'
                            ? mx.mxcUrlToHttp(user.avatar_url, 42, 42, 'crop')
                            : null
                    }
                    name={name}
                    id={userId}
                    options={renderOptions(userId)}
                    desc={renderError(userId)}
                />
            );
        });
    }

    useEffect(() => {
        if (isOpen && typeof searchTerm === 'string') searchUser(searchTerm);
        return () => {
            updateIsSearching(false);
            updateSearchQuery({});
            updateUsers([]);
            updateProcUsers(new Set());
            updateUserProcError(new Map());
            updateCreatedDM(new Map());
            updateRoomIdToUserId(new Map());
            updateInvitedUserIds(new Set());
        };
    }, [isOpen, searchTerm]);

    return (
        <Dialog
            open={isOpen}
            onClose={onRequestClose}
        >
            {isOpen && <BackButtonHandler callback={onRequestClose} id='invite-user' />}
            <AppBar position='relative'>
                <Toolbar>
                    <Typography
                        variant='h6'
                        component='div'
                        flexGrow={1}
                    >
                        {
                            typeof roomId === 'string'
                                ? getText('invite.title', getRoomNameOrId(mx, roomId))
                                : getText('invite.dm')
                        }
                    </Typography>
                    <IconButton
                        onClick={onRequestClose}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        searchUser(usernameRef.current.value);
                    }}
                >
                    <SearchContainer>
                        <SearchIconWrapper>
                            <SearchIcon />
                        </SearchIconWrapper>
                        <SearchInputBase
                            placeholder={getText('label.name_or_id')}
                            inputProps={{ 'aria-label': 'search' }}
                            inputRef={usernameRef}
                        />
                    </SearchContainer>
                    {/* <TextField
                        value={searchTerm}
                        inputRef={usernameRef}
                        label={getText('label.name_or_id')}
                    />
                    <LoadingButton
                        loading={isSearching}
                        type='submit'
                        variant='contained'
                    >
                        {getText('btn.invite.search')}
                    </LoadingButton> */}
                </form>
                <div className="invite-user__content">
                    {typeof searchQuery.username !== 'undefined' && isSearching && (
                        <LinearProgress />
                    )}
                    {users.length !== 0 && renderUserList()}
                </div>
            </DialogContent>
        </Dialog>
        // <PopupWindow
        //     isOpen={isOpen}
        //     title={typeof roomId === 'string' ? getText('invite.title', mx.getRoom(roomId).name) : getText('invite.dm')}
        //     contentOptions={<IconButton src={mdiClose} onClick={onRequestClose} tooltip="Close" />}
        //     onRequestClose={onRequestClose}
        // >
        //     <div className="invite-user">
        //         <form
        //             className="invite-user__form"
        //             onSubmit={(e) => {
        //                 e.preventDefault();
        //                 searchUser(usernameRef.current.value);
        //             }}
        //         >
        //             <Input value={searchTerm} forwardRef={usernameRef} label={getText('label.name_or_id')} />
        //             <Button disabled={isSearching} iconSrc={mdiAccount} variant="primary" type="submit">
        //                 {getText('btn.invite.search')}
        //             </Button>
        //         </form>
        //         <div className="invite-user__search-status">
        //             {typeof searchQuery.username !== 'undefined' && isSearching && (
        //                 <div className="flex--center">
        //                     <Spinner size="small" />
        //                     <Text variant="b2">{getText('invite.searching', searchQuery.username)}</Text>
        //                 </div>
        //             )}
        //             {typeof searchQuery.username !== 'undefined' && !isSearching && (
        //                 <Text variant="b2">{getText('invite.result', searchQuery.username)}</Text>
        //             )}
        //             {searchQuery.error && (
        //                 <Text className="invite-user__search-error" variant="b2">
        //                     {searchQuery.error}
        //                 </Text>
        //             )}
        //         </div>
        //         {users.length !== 0 && <div className="invite-user__content">{renderUserList()}</div>}
        //     </div>
        // </PopupWindow>
    );
}

InviteUser.defaultProps = {
    roomId: undefined,
    searchTerm: undefined,
};

InviteUser.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    roomId: PropTypes.string,
    searchTerm: PropTypes.string,
    onRequestClose: PropTypes.func.isRequired,
};

export default InviteUser;
