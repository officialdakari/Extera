import React, {
    ChangeEventHandler,
    KeyboardEventHandler,
    MouseEventHandler,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
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
import { Autocomplete, TextField } from '@mui/material';

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
        <Autocomplete
            renderInput={(params) => <TextField {...params} ref={serverInputRef} variant='filled' label={getText('form.homeserver')} />}
            options={serverList}
            defaultValue={server}
            onChange={(evt, value) => onServerChange(value!)}
            freeSolo
        />
    );
}
