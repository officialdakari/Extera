import { BlockType, MarkType } from './types';

export const resetEditor = (editor: React.RefObject<HTMLTextAreaElement>) => {
    const e = editor.current;
    if (!e) return;
    const wasInFocus = document.activeElement === e;
    e.value = '';
    e.blur();
    if (wasInFocus) e.focus();
    e.rows = 1;
    e.style.height = `auto`;
};

export const resetEditorHistory = (editor: React.RefObject<HTMLTextAreaElement>) => {
    // eslint-disable-next-line no-param-reassign

};

export const isEmptyEditor = (editor: React.RefObject<HTMLTextAreaElement>): boolean => {
    const len = editor.current?.value.length;
    return !len || len < 1;
};

export const getBeginCommand = (taRef: React.RefObject<HTMLTextAreaElement>): string | undefined => {
    const ta = taRef.current;
    if (!ta) return undefined;
    if (ta.value.startsWith('/')) {
        return ta.value.split(' ')[0].slice(1);
    }
    return undefined;
};