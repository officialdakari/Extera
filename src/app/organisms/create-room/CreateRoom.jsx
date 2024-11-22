import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './CreateRoom.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import * as roomActions from '../../../client/action/room';
import { isRoomAliasAvailable, getIdServer } from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';

import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getText } from '../../../lang';
import { BackButtonHandler, useBackButton } from '../../hooks/useBackButton';
import { Alert, AppBar, Autocomplete, Box, Button, CircularProgress, Dialog, IconButton, Switch, TextField, Toolbar, Typography } from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import { LoadingButton } from '@mui/lab';

function CreateRoomContent({ isSpace, parentId, onRequestClose }) {
    const [joinRule, setJoinRule] = useState(parentId ? 'restricted' : 'invite');
    const [isEncrypted, setIsEncrypted] = useState(true);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [creatingError, setCreatingError] = useState(null);
    const { navigateRoom, navigateSpace } = useRoomNavigate();

    const [isValidAddress, setIsValidAddress] = useState(null);
    const [addressValue, setAddressValue] = useState('');
    const [roleIndex, setRoleIndex] = useState(0);

    const addressRef = useRef(null);

    const mx = initMatrix.matrixClient;
    const userHs = getIdServer(mx.getUserId());

    const handleSubmit = async (evt) => {
        evt.preventDefault();
        const { target } = evt;

        if (isCreatingRoom) return;
        setIsCreatingRoom(true);
        setCreatingError(null);

        const name = target.name.value;
        let topic = target.topic.value;
        if (topic.trim() === '') topic = undefined;
        let roomAlias;
        if (joinRule === 'public') {
            roomAlias = addressRef?.current?.value;
            if (roomAlias.trim() === '') roomAlias = undefined;
        }

        const powerLevels = [
            100,
            101,
            9001
        ];
        const powerLevel = powerLevels[roleIndex];

        try {
            const data = await roomActions.createRoom({
                name,
                topic,
                joinRule,
                alias: roomAlias,
                isEncrypted: isSpace || joinRule === 'public' ? false : isEncrypted,
                powerLevel,
                isSpace,
                parentId,
            });
            setIsCreatingRoom(false);
            setCreatingError(null);
            setIsValidAddress(null);
            setAddressValue(undefined);
            onRequestClose();
            if (isSpace) {
                navigateSpace(data.room_id);
            } else {
                navigateRoom(data.room_id);
            }
        } catch (e) {
            if (e.message === 'M_UNKNOWN: Invalid characters in room alias') {
                setCreatingError(getText('error.create_room.invalid_characters'));
                setIsValidAddress(false);
            } else if (e.message === 'M_ROOM_IN_USE: Room alias already taken') {
                setCreatingError(getText('error.create_room.address_already_used'));
                setIsValidAddress(false);
            } else setCreatingError(e.message);
            setIsCreatingRoom(false);
        }
    };

    const validateAddress = (e) => {
        const myAddress = e.currentTarget.value;
        console.log(myAddress, addressRef.current.value);
        setIsValidAddress(null);
        setAddressValue(e.currentTarget.value);
        setCreatingError(null);

        setTimeout(async () => {
            if (myAddress !== addressRef.current.value) return;
            const roomAlias = addressRef.current.value;
            if (roomAlias === '') return;
            const roomAddress = `#${roomAlias}:${userHs}`;
            console.log(roomAddress);
            if (await isRoomAliasAvailable(roomAddress)) {
                setIsValidAddress(true);
            } else {
                setIsValidAddress(false);
            }
        }, 1000);
    };

    const joinRules = ['invite', 'restricted', 'public'];
    const joinRuleShortText = [
        'create_room.join_rule.short.private',
        'create_room.join_rule.short.restricted',
        'create_room.join_rule.short.public'
    ].map(s => getText(s));

    const joinRuleText = [
        'create_room.join_rule.private',
        'create_room.join_rule.restricted',
        'create_room.join_rule.public'
    ].map(s => getText(s));

    const pls = [
        'create_room.your_pl.admin',
        'create_room.your_pl.founder',
        'create_room.your_pl.goku'
    ];

    const handleJoinRule = (evt, rule) => {
        setJoinRule(rule);
    };

    return (
        <div className="create-room">
            <form className="create-room__form" onSubmit={handleSubmit}>
                <Autocomplete
                    disablePortal
                    options={
                        joinRules
                    }
                    getOptionLabel={(option) => joinRuleShortText[joinRules.indexOf(option)]}
                    renderInput={(params) => <TextField {...params} label={getText(
                        'create_room.join_rule.tip',
                        getText(
                            isSpace ? 'create_room.join_rule.tip.space' : 'create_room.join_rule.tip.room'
                        )
                    )} />}
                    onChange={handleJoinRule}
                    fullWidth
                />
                {joinRule === 'public' && (
                    <>
                        <TextField
                            required
                            fullWidth
                            color={isValidAddress ? 'primary' : 'error'}
                            placeholder='my_address'
                            label={getText(isSpace ? 'create_room.address.space' : 'create_room.address.room')}
                            value={addressValue}
                            onChange={validateAddress}
                            inputRef={addressRef}
                            margin='normal'
                        />
                        {!isValidAddress && (
                            <Alert severity='error' variant='outlined'>
                                {getText('error.create_room.address_in_use', `#${addressValue}:${userHs}`)}
                            </Alert>
                        )}
                    </>
                )}
                {!isSpace && joinRule !== 'public' && (
                    <SettingTile
                        title={getText('create_room.encrypt.title')}
                        options={<Switch checked={isEncrypted} onClick={() => setIsEncrypted(!isEncrypted)} />}
                        content={
                            <Typography variant='caption'>
                                {getText('create_room.encrypt.desc')}
                            </Typography>
                        }
                    />
                )}
                <SettingTile
                    title={getText('create_room.your_pl.title')}
                    options={
                        <Autocomplete
                            renderInput={(props) => <TextField {...props} />}
                            options={pls}
                            onChange={(evt, v) => setRoleIndex(pls.indexOf(v))}
                            getOptionLabel={(l) => getText(l)}
                            value={pls[roleIndex]}
                        />
                    }
                    content={
                        <Typography variant='caption'>{getText('create_room.your_pl.desc')}</Typography>
                    }
                />
                <Box display='flex' flexDirection='column' gap='10px'>
                    <TextField fullWidth multiline name="topic" label={getText('create_room.topic')} />
                    <TextField fullWidth name="name" label={getText('create_room.name', getText(isSpace ? 'create_room.name.space' : 'create_room.name.room'))} required />
                    <LoadingButton
                        disabled={isValidAddress === false || isCreatingRoom}
                        startIcon={<Add />}
                        type="submit"
                        variant="contained"
                        color='primary'
                        loading={isCreatingRoom}
                    >
                        {getText('btn.create_room')}
                    </LoadingButton>
                </Box>
                {typeof creatingError === 'string' && (
                    <Alert color='error'>
                        {creatingError}
                    </Alert>
                )}
            </form>
        </div>
    );
}
CreateRoomContent.defaultProps = {
    parentId: null,
};
CreateRoomContent.propTypes = {
    isSpace: PropTypes.bool.isRequired,
    parentId: PropTypes.string,
    onRequestClose: PropTypes.func.isRequired,
};

function useWindowToggle() {
    const [create, setCreate] = useState(null);

    useEffect(() => {
        const handleOpen = (isSpace, parentId) => {
            setCreate({
                isSpace,
                parentId,
            });
        };
        navigation.on(cons.events.navigation.CREATE_ROOM_OPENED, handleOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.CREATE_ROOM_OPENED, handleOpen);
        };
    }, []);

    const onRequestClose = () => setCreate(null);

    return [create, onRequestClose];
}

function CreateRoom() {
    const [create, onRequestClose] = useWindowToggle();
    const { isSpace, parentId } = create ?? {};
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(parentId);

    return (
        <Dialog
            open={create !== null}
            onRequestClose={onRequestClose}
        >
            {create !== null && <BackButtonHandler callback={onRequestClose} id='create-room' />}
            <AppBar position='relative'>
                <Toolbar>
                    <Typography variant='h6' component='div' flexGrow={1}>
                        {parentId ? room.name : getText('home.title')}
                        
                            {getText('create.title', getText(isSpace ? 'create.title.space' : 'create.title.room'))}
                        
                    </Typography>
                    <IconButton
                        onClick={onRequestClose}
                    >
                        <Close />
                    </IconButton>
                </Toolbar>
            </AppBar>
            {create ? (
                <CreateRoomContent isSpace={isSpace} parentId={parentId} onRequestClose={onRequestClose} />
            ) : (
                <div />
            )}
        </Dialog>
    );
}

export default CreateRoom;
export { CreateRoomContent };
