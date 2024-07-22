import { isKeyHotkey } from 'is-hotkey';
import { KeyboardEvent, RefObject } from 'react';
import { BlockType, MarkType } from './types';

export const INLINE_HOTKEYS: Record<string, MarkType> = {
    'mod+b': MarkType.Bold,
    'mod+i': MarkType.Italic,
    'mod+u': MarkType.Underline,
    'mod+s': MarkType.StrikeThrough,
    'mod+[': MarkType.Code,
    'mod+h': MarkType.Spoiler,
};
const INLINE_KEYS = Object.keys(INLINE_HOTKEYS);

export const BLOCK_HOTKEYS: Record<string, BlockType> = {
    'mod+7': BlockType.OrderedList,
    'mod+8': BlockType.UnorderedList,
    "mod+'": BlockType.BlockQuote,
    'mod+;': BlockType.CodeBlock,
};
const BLOCK_KEYS = Object.keys(BLOCK_HOTKEYS);
const isHeading1 = isKeyHotkey('mod+1');
const isHeading2 = isKeyHotkey('mod+2');
const isHeading3 = isKeyHotkey('mod+3');

/**
 * @return boolean true if shortcut is toggled.
 */
export const toggleKeyboardShortcut = (editor: RefObject<HTMLTextAreaElement>, event: KeyboardEvent<Element>): boolean => {
    return false; // TODO shortcuts
};
