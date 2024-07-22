import React, { MouseEventHandler, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo } from 'react';
// slate кал
import { Box, MenuItem, Text, toRem } from 'folds';
import { Room } from 'matrix-js-sdk';

import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
    SearchItemStrGetter,
    UseAsyncSearchOptions,
    useAsyncSearch,
} from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import { useRelevantImagePacks } from '../../../hooks/useImagePacks';
import { IEmoji, emojis } from '../../../plugins/emoji';
import { ExtendedPackImage, PackUsage } from '../../../plugins/custom-emoji';
import { useKeyDown } from '../../../hooks/useKeyDown';
import ReactQuill, { Quill } from 'react-quill';

type EmoticonCompleteHandler = (key: string, shortcode: string) => void;

type EmoticonSearchItem = ExtendedPackImage | IEmoji;

type EmoticonAutocompleteProps = {
    imagePackRooms: Room[];
    query: AutocompleteQuery<string>;
    requestClose: () => void;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
    limit: 20,
    matchOptions: {
        contain: true,
    },
};

const getEmoticonStr: SearchItemStrGetter<EmoticonSearchItem> = (emoticon) => [
    `:${emoticon.shortcode}:`,
];

export function EmoticonAutocomplete({
    imagePackRooms,
    query,
    requestClose,
    textAreaRef
}: EmoticonAutocompleteProps) {
    const mx = useMatrixClient();

    const imagePacks = useRelevantImagePacks(mx, PackUsage.Emoticon, imagePackRooms);
    const recentEmoji = useRecentEmoji(mx, 20);

    const searchList = useMemo(() => {
        const list: Array<EmoticonSearchItem> = [];
        return list.concat(
            imagePacks.flatMap((pack) => pack.getImagesFor(PackUsage.Emoticon)),
            emojis
        );
    }, [imagePacks]);

    const [result, search, resetSearch] = useAsyncSearch(searchList, getEmoticonStr, SEARCH_OPTIONS);
    const autoCompleteEmoticon = result ? result.items : recentEmoji;

    useEffect(() => {
        if (query.text) search(query.text);
        else resetSearch();
    }, [query.text, search, resetSearch]);

    const handleAutocomplete: EmoticonCompleteHandler = (key, shortcode) => {
        const ta = textAreaRef.current;
        if (!ta) return;
        const mxc = key.startsWith('mxc://');
        const src = mxc ? mx.mxcUrlToHttp(key) : key;
        console.log(src, key, shortcode);
        
        var v = ta.value;
        console.log(v, v.slice(0, query.range.index), v.slice(query.range.index + query.range.length));
        const result: string = (mxc ? `{:${shortcode}:${key}:}` : src) ?? '';
        v = `${v.slice(0, query.range.index)}${result}${v.slice(query.range.index + query.range.length)}`;
        ta.value = v;

        ta.focus();
        ta.selectionEnd = query.range.index + result.length;

        ta.dataset.previousText = v;

        requestClose();
    };

    useKeyDown(window, (evt: KeyboardEvent) => {
        onTabPress(evt, () => {
            if (autoCompleteEmoticon.length === 0) return;
            const emoticon = autoCompleteEmoticon[0];
            const key = 'url' in emoticon ? emoticon.url : emoticon.unicode;
            handleAutocomplete(key, emoticon.shortcode);
            //textAreaRef.current?.focus();
            evt.preventDefault();
        });
    });

    return autoCompleteEmoticon.length === 0 ? null : (
        <AutocompleteMenu headerContent={<Text size="L400">Emojis</Text>} requestClose={requestClose}>
            {autoCompleteEmoticon.map((emoticon) => {
                const isCustomEmoji = 'url' in emoticon;
                const key = isCustomEmoji ? emoticon.url : emoticon.unicode;
                return (
                    <MenuItem
                        key={emoticon.shortcode + key}
                        as="button"
                        radii="300"
                        onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                            onTabPress(evt, () => {
                                handleAutocomplete(key, emoticon.shortcode);
                                evt.preventDefault();
                            })
                        }
                        onClick={() => handleAutocomplete(key, emoticon.shortcode)}
                        onMouseDown={(evt: any) => { evt.preventDefault(); }}
                        before={
                            isCustomEmoji ? (
                                <Box
                                    shrink="No"
                                    as="img"
                                    src={mx.mxcUrlToHttp(key) || key}
                                    alt={emoticon.shortcode}
                                    style={{ width: toRem(24), height: toRem(24), objectFit: 'contain' }}
                                />
                            ) : (
                                <Box
                                    shrink="No"
                                    as="span"
                                    display="InlineFlex"
                                    style={{ fontSize: toRem(24), lineHeight: toRem(24) }}
                                >
                                    {key}
                                </Box>
                            )
                        }
                    >
                        <Text style={{ flexGrow: 1 }} size="B400" truncate>
                            :{emoticon.shortcode}:
                        </Text>
                    </MenuItem>
                );
            })}
        </AutocompleteMenu>
    );
}
