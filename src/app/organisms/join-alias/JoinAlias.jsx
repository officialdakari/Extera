import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './JoinAlias.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { join } from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import Dialog from '../../molecules/dialog/Dialog';

import { useStore } from '../../hooks/useStore';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getText } from '../../../lang';
import { BackButtonHandler, useBackButton } from '../../hooks/useBackButton';
import { mdiClose } from '@mdi/js';

const ALIAS_OR_ID_REG = /^[#|!].+:.+\..+$/;

function JoinAliasContent({ term, requestClose }) {
    const [process, setProcess] = useState(false);
    const [error, setError] = useState(undefined);

    const mx = initMatrix.matrixClient;
    const mountStore = useStore();

    const { navigateRoom } = useRoomNavigate();

    const openRoom = (roomId) => {
        navigateRoom(roomId);
        requestClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        mountStore.setItem(true);
        const alias = e.target.alias.value;
        if (alias?.trim() === '') return;
        if (alias.match(ALIAS_OR_ID_REG) === null) {
            setError(getText('error.join_alias.invalid'));
            return;
        }
        setProcess(getText('join_alias.looking'));
        setError(undefined);
        let via;
        if (alias.startsWith('#')) {
            try {
                const aliasData = await mx.getRoomIdForAlias(alias);
                via = aliasData?.servers.slice(0, 3) || [];
                if (mountStore.getItem()) {
                    setProcess(getText('join_alias.joining', alias));
                }
            } catch (err) {
                if (!mountStore.getItem()) return;
                setProcess(false);
                setError(
                    getText('error.join_alias.not_found', alias)
                );
            }
        }
        try {
            const roomId = await join(alias, false, via);
            if (!mountStore.getItem()) return;
            openRoom(roomId);
        } catch {
            if (!mountStore.getItem()) return;
            setProcess(false);
            setError(getText('error.join_alias.unable_to_join', alias));
        }
    };

    return (
        <form className="join-alias" onSubmit={handleSubmit}>
            <Input label="Address" value={term} name="alias" required />
            {error && (
                <Text className="join-alias__error" variant="b3">
                    {error}
                </Text>
            )}
            <div className="join-alias__btn">
                {process ? (
                    <>
                        <Spinner size="small" />
                        <Text>{process}</Text>
                    </>
                ) : (
                    <Button variant="primary" type="submit">
                        {getText('btn.join_alias.join')}
                    </Button>
                )}
            </div>
        </form>
    );
}
JoinAliasContent.defaultProps = {
    term: undefined,
};
JoinAliasContent.propTypes = {
    term: PropTypes.string,
    requestClose: PropTypes.func.isRequired,
};

function useWindowToggle() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const handleOpen = (term) => {
            setData({ term });
        };
        navigation.on(cons.events.navigation.JOIN_ALIAS_OPENED, handleOpen);
        return () => {
            navigation.removeListener(cons.events.navigation.JOIN_ALIAS_OPENED, handleOpen);
        };
    }, []);

    const onRequestClose = () => setData(null);

    return [data, onRequestClose];
}

function JoinAlias() {
    const [data, requestClose] = useWindowToggle();

    return (
        <Dialog
            isOpen={data !== null}
            title={
                <Text variant="s1" weight="medium" primary>
                    {getText('join_alias.title')}
                </Text>
            }
            contentOptions={<IconButton src={mdiClose} onClick={requestClose} tooltip="Close" />}
            onRequestClose={requestClose}
        >
            {data !== null && <BackButtonHandler callback={requestClose} id='join-alias' />}
            {data ? <JoinAliasContent term={data.term} requestClose={requestClose} /> : <div />}
        </Dialog>
    );
}

export default JoinAlias;
