import React, { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect } from 'react';
import { Avatar, MenuItem, Text } from 'folds';
import { JoinRule, MatrixClient } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';

import { getDirectRoomAvatarUrl } from '../../../utils/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { getMxIdServer, validMxId } from '../../../utils/matrix';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { RoomAvatar, RoomIcon } from '../../room-avatar';
import Icon from '@mdi/react';
import { mdiPound } from '@mdi/js';

type MentionAutoCompleteHandler = (roomAliasOrId: string, name: string) => void;

const roomAliasFromQueryText = (mx: MatrixClient, text: string) =>
    validMxId(`#${text}`)
        ? `#${text}`
        : `#${text}${text.endsWith(':') ? '' : ':'}${getMxIdServer(mx.getUserId() ?? '')}`;

function UnknownRoomMentionItem({
    query,
    handleAutocomplete,
}: {
    query: AutocompleteQuery<string>;
    handleAutocomplete: MentionAutoCompleteHandler;
}) {
    const mx = useMatrixClient();
    const roomAlias: string = roomAliasFromQueryText(mx, query.text);

    const handleSelect = () => handleAutocomplete(roomAlias, roomAlias);

    return (
        <MenuItem
            as="button"
            radii="300"
            onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) => onTabPress(evt, handleSelect)}
            onClick={handleSelect}
            onMouseDown={(evt: any) => { evt.preventDefault() }}
            before={
                <Avatar size="200">
                    <Icon size={0.7} path={mdiPound} />
                </Avatar>
            }
        >
            <Text style={{ flexGrow: 1 }} size="B400">
                {roomAlias}
            </Text>
        </MenuItem>
    );
}

type RoomMentionAutocompleteProps = {
    roomId: string;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    query: AutocompleteQuery<string>;
    requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
    limit: 20,
    matchOptions: {
        contain: true,
    },
};

export function RoomMentionAutocomplete({
    roomId,
    textAreaRef,
    query,
    requestClose,
}: RoomMentionAutocompleteProps) {
    const mx = useMatrixClient();
    const mDirects = useAtomValue(mDirectAtom);

    const allRooms = useAtomValue(allRoomsAtom).sort(factoryRoomIdByActivity(mx));

    const [result, search, resetSearch] = useAsyncSearch(
        allRooms,
        useCallback(
            (rId) => {
                const r = mx.getRoom(rId);
                if (!r) return 'Unknown Room';
                const alias = r.getCanonicalAlias();
                if (alias) return [r.name, alias];
                return r.name;
            },
            [mx]
        ),
        SEARCH_OPTIONS
    );

    const autoCompleteRoomIds = result ? result.items : allRooms.slice(0, 20);

    useEffect(() => {
        if (query.text) search(query.text);
        else resetSearch();
    }, [query.text, search, resetSearch]);

    const handleAutocomplete: MentionAutoCompleteHandler = (roomIdOrAlias, name) => {
        const ta = textAreaRef.current;
        if (!ta) return;

        // И это будет лежать на гитхабе...
        const result = `{${name.replaceAll('|', '')}|${roomIdOrAlias}}`;

        var v = ta.value;
        v = `${v.slice(0, query.range.index)}${result}${v.slice(query.range.index + query.range.length)}`;
        ta.value = v;

        ta.focus();
        ta.selectionEnd = query.range.index + result.length;

        ta.dataset.previousText = v;

        requestClose();
    };

    useKeyDown(window, (evt: KeyboardEvent) => {
        onTabPress(evt, () => {
            if (autoCompleteRoomIds.length === 0) {
                const alias = roomAliasFromQueryText(mx, query.text);
                handleAutocomplete(alias, alias);
                return;
            }
            const rId = autoCompleteRoomIds[0];
            const r = mx.getRoom(rId);
            const name = r?.name ?? rId;
            handleAutocomplete(r?.getCanonicalAlias() ?? rId, name);
            evt.preventDefault();
        });
    });

    return (
        <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
            {autoCompleteRoomIds.length === 0 ? (
                <UnknownRoomMentionItem query={query} handleAutocomplete={handleAutocomplete} />
            ) : (
                autoCompleteRoomIds.map((rId) => {
                    const room = mx.getRoom(rId);
                    if (!room) return null;
                    const dm = mDirects.has(room.roomId);

                    const handleSelect = () => handleAutocomplete(room.getCanonicalAlias() ?? rId, room.name);

                    return (
                        <MenuItem
                            key={rId}
                            as="button"
                            radii="300"
                            onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                                onTabPress(evt, handleSelect)
                            }
                            onClick={handleSelect}
                            onMouseDown={(evt: any) => { evt.preventDefault() }}
                            after={
                                <Text size="T200" priority="300" truncate>
                                    {room.getCanonicalAlias() ?? ''}
                                </Text>
                            }
                            before={
                                <Avatar size="200">
                                    <RoomAvatar
                                        roomId={room.roomId}
                                        src={getDirectRoomAvatarUrl(mx, room)}
                                        alt={room.name}
                                        renderFallback={() => (
                                            <RoomIcon
                                                size="50"
                                                joinRule={room.getJoinRule() ?? JoinRule.Restricted}
                                                filled
                                            />
                                        )}
                                    />
                                </Avatar>
                            }
                        >
                            <Text style={{ flexGrow: 1 }} size="B400" truncate>
                                {room.name}
                            </Text>
                        </MenuItem>
                    );
                })
            )}
        </AutocompleteMenu>
    );
}
