import React, { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { Editor } from 'slate';
import { Box, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { Command, useCommands } from '../../hooks/useCommands';
import {
    AutocompleteMenu,
    AutocompleteQuery
} from '../../components/editor';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../hooks/useAsyncSearch';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useKeyDown } from '../../hooks/useKeyDown';
import { onTabPress } from '../../utils/keyboard';
import { getText } from '../../../lang';
import { ListItem, ListItemButton } from '@mui/material';

type CommandAutoCompleteHandler = (commandName: string) => void;

type CommandAutocompleteProps = {
    room: Room;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    query: AutocompleteQuery<string>;
    requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
    matchOptions: {
        contain: true,
    },
};

export function CommandAutocomplete({
    room,
    textAreaRef,
    query,
    requestClose,
}: CommandAutocompleteProps) {
    const mx = useMatrixClient();
    const commands = useCommands(mx, room);
    const commandNames = useMemo(() => Object.keys(commands) as Command[], [commands]);

    const [result, search, resetSearch] = useAsyncSearch(
        commandNames,
        useCallback((commandName: string) => commandName, []),
        SEARCH_OPTIONS
    );

    const autoCompleteNames = result ? result.items : commandNames;

    useEffect(() => {
        if (query.text) search(query.text);
        else resetSearch();
    }, [query.text, search, resetSearch]);

    const handleAutocomplete: CommandAutoCompleteHandler = (commandName) => {
        const ta = textAreaRef.current;
        if (!ta) return;
        const result: string = `/${commandName}`;

        var v = ta.value;
        v = `${v.slice(0, query.range.index)}${result}${v.slice(ta.selectionStart + query.range.length)}`;
        ta.value = v;

        ta.focus();
        ta.selectionEnd = query.range.index + result.length;
        requestClose();
    };

    useKeyDown(window, (evt: KeyboardEvent) => {
        onTabPress(evt, () => {
            if (autoCompleteNames.length === 0) {
                return;
            }
            const cmdName = autoCompleteNames[0];
            handleAutocomplete(cmdName);
            evt.preventDefault();
        });
    });

    return autoCompleteNames.length === 0 ? null : (
        <AutocompleteMenu
            headerContent={
                <Box grow="Yes" direction="Row" gap="200" justifyContent="SpaceBetween">
                    <Text size="L400">{getText('autocomplete.commands.title')}</Text>
                    <Text size="T200" priority="300">
                        {getText('autocomplete.commands.tip')}
                    </Text>
                </Box>
            }
            requestClose={requestClose}
        >
            {autoCompleteNames.map((commandName) => (
                <ListItemButton
                    key={commandName}
                    onKeyDown={(evt: ReactKeyboardEvent) =>
                        onTabPress(evt, () => {
                            handleAutocomplete(commandName);
                            evt.preventDefault();
                        })
                    }
                    onClick={() => handleAutocomplete(commandName)}
                >
                    <Box grow="Yes" direction="Row" gap="200" justifyContent="SpaceBetween">
                        <Box shrink="No">
                            <Text style={{ flexGrow: 1 }} size="B400" truncate>
                                {`/${commandName}`}
                            </Text>
                        </Box>
                        <Text truncate priority="300" size="T200">
                            {commands[commandName].description}
                        </Text>
                    </Box>
                </ListItemButton>
            ))}
        </AutocompleteMenu>
    );
}
