import React, {
    ChangeEventHandler,
    KeyboardEventHandler,
    MouseEventHandler,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Box,
    Header,
    PopOut,
    RectCords,
    Text,
    config,
} from 'folds';
import FocusTrap from 'focus-trap-react';

import { useDebounce } from '../../hooks/useDebounce';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiChevronDown } from '@mdi/js';
import { Autocomplete, Link, TextField } from '@mui/material';

export function ServerPicker({
    server,
    serverList,
    allowCustomServer,
    onServerChange,
}: {
    server: string;
    serverList: string[];
    allowCustomServer?: boolean;
    onServerChange: (server: string) => void;
}) {
    const serverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // sync input with it outside server changes
        if (serverInputRef.current && serverInputRef.current.value !== server) {
            serverInputRef.current.value = server;
        }
    }, [server]);

    return (
        <>
            <Autocomplete
                renderInput={(params) => <TextField {...params} ref={serverInputRef} variant='filled' label={getText('form.homeserver')} />}
                options={serverList}
                defaultValue={server}
                onChange={(evt, value) => onServerChange(value!)}
                freeSolo
            />
            <Box grow="Yes" shrink="No" justifyContent="End">
                <Text as="span" size="T200" priority="400" align="Right">
                    <Link href="https://servers.joinmatrix.org/">{getText('pick_a_server')}</Link>
                </Text>
            </Box>
        </>
    );
}
