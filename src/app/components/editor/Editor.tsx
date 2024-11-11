/* eslint-disable no-param-reassign */
import React, {
    ChangeEvent,
    ClipboardEventHandler,
    KeyboardEvent,
    KeyboardEventHandler,
    ReactNode,
    forwardRef,
    useCallback,
    useEffect,
    useState,
} from 'react';
import { Box, Scroll, Text } from 'folds';

import 'quill/dist/quill.core.css';
import * as css from './Editor.css';
import './Editor.scss';
import { useTheme } from '@mui/material';
// import * as MarkdownShortcuts from 'quill-markdown-shortcuts';

// Quill.register('modules/markdownShortcuts', MarkdownShortcuts);

type CustomEditorProps = {
    editableName?: string;
    top?: ReactNode;
    bottom?: ReactNode;
    before?: ReactNode;
    after?: ReactNode;
    maxHeight?: string;
    editor?: any;
    placeholder?: string;
    onKeyDown?: KeyboardEventHandler;
    onKeyUp?: KeyboardEventHandler;
    onChange?: (value: string) => void;
    onPaste?: ClipboardEventHandler;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    newDesign?: boolean;
    disabled?: boolean;
};

export const CustomEditor = forwardRef<HTMLDivElement, CustomEditorProps>(
    ({
        editableName,
        top,
        bottom,
        before,
        after,
        maxHeight = '50vh',
        placeholder,
        onKeyDown,
        onKeyUp,
        onChange,
        onPaste,
        textAreaRef,
        newDesign,
        disabled
    }, ref) => {
        const theme = useTheme();
        const updateRows = (target: HTMLTextAreaElement) => {
            target.style.height = `auto`;
            target.style.height = `${target.scrollHeight}px`;
        };
        const handleChange = (evt: ChangeEvent<HTMLTextAreaElement>) => {
            const previousText = evt.target.dataset.previousText ?? '';
            var newText = evt.target.value;
            evt.target.dataset.previousText = newText;
            // const tagsBefore = Array.from(previousText.matchAll(anyTagRegexp));
            // const tagsAfter = Array.from(newText.matchAll(deleteEndRegexp));
            // const tagsAfter2 = Array.from(newText.matchAll(deleteStartRegexp));
            // const mutual = [
            //     ...tagsAfter.filter(x => tagsBefore.find(y => y.index == x.index)).reverse(),
            //     ...tagsAfter2.filter(x => tagsBefore.find(y => y.index == x.index || (y.index && (y.index - 1 == x.index)))).reverse()
            // ];
            // console.log(tagsBefore, tagsAfter, tagsAfter2);
            // console.log(mutual);
            // console.log(previousText, newText);
            // for (const m of mutual) {
            //     if (m.index)
            //         newText = `${newText.slice(0, m.index)}${newText.slice(m.index + m[0].length)}`;
            // }
            // TODO FIX THAT
            evt.target.value = newText;
            evt.target.dataset.previousText = newText;
            updateRows(evt.target);
            if (onChange)
                onChange(newText);
        };

        useEffect(() => {
            if (textAreaRef.current)
                updateRows(textAreaRef.current);
        }, [textAreaRef]);

        return (
            <div
                ref={ref}
                className={newDesign ? css.EditorNew : css.Editor}
                style={{
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderRadius: !newDesign ? theme.shape.borderRadius : undefined
                }}
            >
                {top}
                <Box alignItems="Start">
                    {before && (
                        <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
                            {before}
                        </Box>
                    )}
                    <Scroll
                        className={css.EditorTextareaScroll}
                        style={{ maxHeight }}
                        visibility='Hover'
                        hideTrack
                    >
                        <textarea
                            className={css.EditorTextarea}
                            ref={textAreaRef}
                            rows={1}
                            style={{ maxHeight }}
                            onKeyDown={(evt) => { updateRows(evt.currentTarget); if (onKeyDown) onKeyDown(evt); }}
                            onKeyUp={(evt) => { updateRows(evt.currentTarget); if (onKeyUp) onKeyUp(evt); }}
                            onPaste={onPaste}
                            placeholder={placeholder}
                            onChange={handleChange}
                            disabled={disabled}
                            aria-disabled={disabled}
                            data-editable-name={editableName}
                        />
                    </Scroll>
                    {after && (
                        <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
                            {after}
                        </Box>
                    )}
                </Box>
                {bottom}
            </div>
        );
    }
);
