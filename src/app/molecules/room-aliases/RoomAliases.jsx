import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomAliases.scss';

import { Button, Checkbox, Switch, TextField, Typography } from '@mui/material';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { Debounce } from '../../../util/common';
import { isRoomAliasAvailable } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SettingTile from '../setting-tile/SettingTile';

import { useStore } from '../../hooks/useStore';
import { getText } from '../../../lang';

function useValidate(hsString) {
	const [debounce] = useState(new Debounce());
	const [validate, setValidate] = useState({ alias: null, status: cons.status.PRE_FLIGHT });

	const setValidateToDefault = () => {
		setValidate({
			alias: null,
			status: cons.status.PRE_FLIGHT,
		});
	};

	const checkValueOK = (value) => {
		if (value.trim() === '') {
			setValidateToDefault();
			return false;
		}
		if (!value.match(/^[a-zA-Z0-9_-]+$/)) {
			setValidate({
				alias: null,
				status: cons.status.ERROR,
				msg: getText('error.invalid_characters.a-zA-Z0-9_-'),
			});
			return false;
		}
		return true;
	};

	const handleAliasChange = (e) => {
		const input = e.target;
		if (validate.status !== cons.status.PRE_FLIGHT) {
			setValidateToDefault();
		}
		if (checkValueOK(input.value) === false) return;

		debounce._(async () => {
			const { value } = input;
			const alias = `#${value}:${hsString}`;
			if (checkValueOK(value) === false) return;

			setValidate({
				alias,
				status: cons.status.IN_FLIGHT,
				msg: getText('room_aliases.validating', alias),
			});

			const isValid = await isRoomAliasAvailable(alias);
			setValidate(() => {
				if (e.target.value !== value) {
					return { alias: null, status: cons.status.PRE_FLIGHT };
				}
				return {
					alias,
					status: isValid ? cons.status.SUCCESS : cons.status.ERROR,
					msg: getText(isValid ? 'room_aliases.available' : 'room_aliases.used', alias),
				};
			});
		}, 600)();
	};

	return [validate, setValidateToDefault, handleAliasChange];
}

function getAliases(roomId) {
	const mx = initMatrix.matrixClient;
	const room = mx.getRoom(roomId);

	const main = room.getCanonicalAlias();
	const published = room.getAltAliases();
	if (main && !published.includes(main)) published.splice(0, 0, main);

	return {
		main,
		published: [...new Set(published)],
		local: [],
	};
}

function RoomAliases({ roomId }) {
	const mx = initMatrix.matrixClient;
	const room = mx.getRoom(roomId);
	const userId = mx.getUserId();
	const hsString = userId.slice(userId.indexOf(':') + 1);

	const isMountedStore = useStore();
	const [isPublic, setIsPublic] = useState(false);
	const [isLocalVisible, setIsLocalVisible] = useState(false);
	const [aliases, setAliases] = useState(getAliases(roomId));
	const [selectedAlias, setSelectedAlias] = useState(null);
	const [deleteAlias, setDeleteAlias] = useState(null);
	const [validate, setValidateToDefault, handleAliasChange] = useValidate(hsString);

	const canPublishAlias = room.currentState.maySendStateEvent('m.room.canonical_alias', userId);

	useEffect(() => {
		isMountedStore.setItem(true)
	}, [isMountedStore]);

	useEffect(() => {
		let isUnmounted = false;

		const loadLocalAliases = async () => {
			let local = [];
			try {
				const result = await mx.getLocalAliases(roomId);
				local = result.aliases.filter((alias) => !aliases.published.includes(alias));
			} catch {
				local = [];
			}
			aliases.local = [...new Set(local.reverse())];

			if (isUnmounted) return;
			setAliases({ ...aliases });
		};
		const loadVisibility = async () => {
			const result = await mx.getRoomDirectoryVisibility(roomId);
			if (isUnmounted) return;
			setIsPublic(result.visibility === 'public');
		};
		loadLocalAliases();
		loadVisibility();
		return () => {
			isUnmounted = true;
		};
	}, [mx, aliases, roomId]);

	const toggleDirectoryVisibility = () => {
		mx.setRoomDirectoryVisibility(roomId, isPublic ? 'private' : 'public');
		setIsPublic(!isPublic);
	};

	const handleAliasSubmit = async (e) => {
		e.preventDefault();
		if (validate.status === cons.status.ERROR) return;
		if (!validate.alias) return;

		const { alias } = validate;
		const aliasInput = e.target.elements['alias-input'];
		aliasInput.value = '';
		setValidateToDefault();

		try {
			aliases.local.push(alias);
			setAliases({ ...aliases });
			await mx.createAlias(alias, roomId);
		} catch {
			if (isMountedStore.getItem()) {
				const lIndex = alias.local.indexOf(alias);
				if (lIndex === -1) return;
				aliases.local.splice(lIndex, 1);
				setAliases({ ...aliases });
			}
		}
	};

	const handleAliasSelect = (alias) => {
		setSelectedAlias(alias === selectedAlias ? null : alias);
	};

	const handlePublishAlias = (alias) => {
		const { main, published } = aliases;
		let { local } = aliases;

		if (!published.includes(aliases)) {
			published.push(alias);
			local = local.filter((al) => al !== alias);
			mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
				alias: main,
				alt_aliases: published.filter((al) => al !== main),
			});
			setAliases({ main, published, local });
			setSelectedAlias(null);
		}
	};

	const handleUnPublishAlias = (alias) => {
		let { main, published } = aliases;
		const { local } = aliases;

		if (published.includes(alias) || main === alias) {
			if (main === alias) main = null;
			published = published.filter((al) => al !== alias);
			local.push(alias);
			mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
				alias: main,
				alt_aliases: published.filter((al) => al !== main),
			});
			setAliases({ main, published, local });
			setSelectedAlias(null);
		}
	};

	const handleSetMainAlias = (alias) => {
		let { main, local } = aliases;
		const { published } = aliases;

		if (main !== alias) {
			main = alias;
			if (!published.includes(alias)) published.splice(0, 0, alias);
			local = local.filter((al) => al !== alias);
			mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
				alias: main,
				alt_aliases: published.filter((al) => al !== main),
			});
			setAliases({ main, published, local });
			setSelectedAlias(null);
		}
	};

	const handleDeleteAlias = async (alias) => {
		try {
			setDeleteAlias({ alias, status: cons.status.IN_FLIGHT, msg: getText('room_aliases.deleting') });
			await mx.deleteAlias(alias);
			let { main, published, local } = aliases;
			if (published.includes(alias)) {
				handleUnPublishAlias(alias);
				if (main === alias) main = null;
				published = published.filter((al) => al !== alias);
			}

			local = local.filter((al) => al !== alias);
			setAliases({ main, published, local });
			setDeleteAlias(null);
			setSelectedAlias(null);
		} catch (err) {
			setDeleteAlias({ alias, status: cons.status.ERROR, msg: err.message });
		}
	};

	const renderAliasBtns = (alias) => {
		const isPublished = aliases.published.includes(alias);
		const isMain = aliases.main === alias;
		if (deleteAlias?.alias === alias) {
			const isError = deleteAlias.status === cons.status.ERROR;
			return (
				<div className="room-aliases__item-btns">
					<Typography color={isError ? 'error' : 'textPrimary'}>
						{deleteAlias.msg}
					</Typography>
				</div>
			);
		}

		return (
			<div className="room-aliases__item-btns">
				{canPublishAlias && !isMain && <Button onClick={() => handleSetMainAlias(alias)} color="primary" variant='contained'>{getText('btn.room_aliases.main')}</Button>}
				{!isPublished && canPublishAlias && <Button onClick={() => handlePublishAlias(alias)} color="success" variant='contained'>{getText('btn.room_aliases.publish')}</Button>}
				{isPublished && canPublishAlias && <Button onClick={() => handleUnPublishAlias(alias)} color="warning" variant='outlined'>{getText('btn.room_aliases.unpublish')}</Button>}
				<Button onClick={() => handleDeleteAlias(alias)} color="error" variant='outlined'>{getText('btn.room_aliases.delete')}</Button>
			</div>
		);
	};

	const renderAlias = (alias) => {
		const isActive = selectedAlias === alias;
		const disabled = !canPublishAlias && aliases.published.includes(alias);
		const isMain = aliases.main === alias;

		return (
			<React.Fragment key={`${alias}-wrapper`}>
				<div className="room-aliases__alias-item" key={alias}>
					<Checkbox disabled={disabled} checked={isActive} onClick={() => handleAliasSelect(alias)} />
					<Text>
						{alias}
						{isMain && <span>{getText('room_aliases.main')}</span>}
					</Text>
				</div>
				{isActive && renderAliasBtns(alias)}
			</React.Fragment>
		);
	};

	let inputState = 'normal';
	if (validate.status === cons.status.ERROR) inputState = 'error';
	if (validate.status === cons.status.SUCCESS) inputState = 'success';
	return (
		<div className="room-aliases">
			<SettingTile
				title={getText('room_aliases.publish.title')}
				content={<Text variant="b3">{getText('room_aliases.publish', getText(room.isSpaceRoom() ? 'room_aliases.publish.space' : 'room_aliases.publish.room'), hsString)}</Text>}
				options={(
					<Switch
						checked={isPublic}
						onClick={toggleDirectoryVisibility}
						disabled={!canPublishAlias}
					/>
				)}
			/>

			<div className="room-aliases__content">
				<MenuHeader>{getText('room_aliases.published')}</MenuHeader>
				{(aliases.published.length === 0) && <Text className="room-aliases__message">{getText('room_aliases.no_published')}</Text>}
				{(aliases.published.length > 0 && !aliases.main) && <Text className="room-aliases__message">{getText('room_aliases.no_main_address')}</Text>}
				{aliases.published.map(renderAlias)}
				<Text className="room-aliases__message" variant="b3">
					{getText('room_aliases.message', getText(room.isSpaceRoom() ? 'room_aliases.message.space' : 'room_aliases.message.room'))}
				</Text>
			</div>
			{isLocalVisible && (
				<div className="room-aliases__content">
					<MenuHeader>{getText('room_aliases.local')}</MenuHeader>
					{(aliases.local.length === 0) && <Text className="room-aliases__message">{getText('room_aliases.no_local')}</Text>}
					{aliases.local.map(renderAlias)}
					<Text className="room-aliases__message" variant="b3">
						{getText('room_aliases.message.2', getText(room.isSpaceRoom() ? 'room_aliases.message.space.2' : 'room_aliases.message.room.2'))}
					</Text>

					<form className="room-aliases__form" onSubmit={handleAliasSubmit}>
						<TextField
							name="alias-input"
							state={inputState}
							onChange={handleAliasChange}
							placeholder={`my_${room.isSpaceRoom() ? 'space' : 'room'}_address`}
							required
							fullWidth
							label={getText('room_aliases.add_local')}
						/>
						<Button variant="contained" type="submit">{getText('btn.add')}</Button>
					</form>
					<div className="room-aliases__input-status">
						{validate.status === cons.status.SUCCESS && <Text className="room-aliases__valid" variant="b2">{validate.msg}</Text>}
						{validate.status === cons.status.ERROR && <Text className="room-aliases__invalid" variant="b2">{validate.msg}</Text>}
					</div>
				</div>
			)}
			<div className="room-aliases__content">
				<Button variant='contained' onClick={() => setIsLocalVisible(!isLocalVisible)}>
					{getText(isLocalVisible ? 'btn.hide_local_address' : 'btn.show_local_address')}
				</Button>
			</div>
		</div>
	);
}

RoomAliases.propTypes = {
	roomId: PropTypes.string.isRequired,
};

export default RoomAliases;
