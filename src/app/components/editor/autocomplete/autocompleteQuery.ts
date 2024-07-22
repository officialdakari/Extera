import React from 'react';
import ReactQuill, { Range } from 'react-quill';

export enum AutocompletePrefix {
    RoomMention = '#',
    UserMention = '@',
    Emoticon = ':',
    Command = '/',
}
export const AUTOCOMPLETE_PREFIXES: readonly AutocompletePrefix[] = [
    AutocompletePrefix.RoomMention,
    AutocompletePrefix.UserMention,
    AutocompletePrefix.Emoticon,
    AutocompletePrefix.Command,
];

export type AutocompleteQuery<TPrefix extends string> = {
    range: Range;
    prefix: TPrefix;
    text: string;
};

function getWordAtCursor(textarea: HTMLTextAreaElement) {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // Найти начало слова
    let start = cursorPos;
    while (start > 0 && /\S/.test(text[start - 1])) {
        start--;
    }

    // Найти конец слова
    let end = cursorPos;
    while (end < text.length && /\S/.test(text[end])) {
        end++;
    }

    return {
        word: text.substring(start, end),
        start, end
    };
}

export const getAutocompleteQuery = <TPrefix extends string>(
    textAreaRef: React.RefObject<HTMLTextAreaElement>,
    validPrefixes: readonly TPrefix[]
): { prefix: TPrefix; text: string; range: Range } | undefined => {
    const ta = textAreaRef.current;
    if (!ta) return undefined;
    if (ta.selectionStart != ta.selectionEnd) return undefined;
    const { word, start, end } = getWordAtCursor(ta);
    const prefix = validPrefixes.find(x => word.startsWith(x));
    if (!prefix) return undefined;
    if (prefix == '/' && start != 0) return undefined;
    return {
        prefix,
        text: word.slice(prefix.length),
        range: {
            index: start,
            length: end - start
        }
    };
};

