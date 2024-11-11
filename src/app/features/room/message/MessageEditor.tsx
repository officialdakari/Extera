import React, {
    KeyboardEventHandler,
    MouseEventHandler,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Box,
    PopOut,
    RectCords,
    Text,
    as,
    config,
} from 'folds';
import { EventTimeline, IContent, MatrixEvent, RelationType, Room } from 'matrix-js-sdk';
import { isKeyHotkey } from 'is-hotkey';
import {
    AUTOCOMPLETE_PREFIXES,
    AutocompletePrefix,
    AutocompleteQuery,
    CustomEditor,
    EmoticonAutocomplete,
    RoomMentionAutocomplete,
    UserMentionAutocomplete,
    customHtmlEqualsPlainText,
    getAutocompleteQuery,
    htmlToEditorInput,
    plainToEditorInput,
    toMatrixCustomHTML,
    toPlainText,
    trimCustomHtml,
} from '../../../components/editor';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { EmojiBoard } from '../../../components/emoji-board';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getEditedEvent, trimReplyFromFormattedBody } from '../../../utils/room';
import { mobileOrTablet } from '../../../utils/user-agent';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiEmoticon, mdiEmoticonOutline } from '@mdi/js';
import { Chip, IconButton } from '@mui/material';

type MessageEditorProps = {
    roomId: string;
    room: Room;
    mEvent: MatrixEvent;
    imagePackRooms?: Room[];
    onCancel: () => void;
};

export const MessageEditor = as<'div', MessageEditorProps>(
    ({ room, roomId, mEvent, imagePackRooms, onCancel, ...props }, ref) => {
        const mx = useMatrixClient();
        const textAreaRef = useRef<HTMLTextAreaElement>(null);
        const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
        const [globalToolbar] = useSetting(settingsAtom, 'editorToolbar');
        const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');

        const [autocompleteQuery, setAutocompleteQuery] =
            useState<AutocompleteQuery<AutocompletePrefix>>();

        const getPrevBodyAndFormattedBody = useCallback((): [
            string | undefined,
            string | undefined
        ] => {
            const evtId = mEvent.getId()!;
            const evtTimeline = room.getTimelineForEvent(evtId);
            const editedEvent =
                evtTimeline && getEditedEvent(evtId, mEvent, evtTimeline.getTimelineSet());

            const { body, formatted_body: customHtml }: Record<string, unknown> =
                editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();

            return [
                typeof body === 'string' ? body : undefined,
                typeof customHtml === 'string' ? customHtml : undefined,
            ];
        }, [room, mEvent]);

        const getDisplayName = (mxId: string) => {
            const timeline = room.getLiveTimeline();
            const state = timeline.getState(EventTimeline.FORWARDS);
            if (!state) return mxId;
            const memberEvent = state.getStateEvents('m.room.member', mxId);
            if (!memberEvent) return mxId;
            const content = memberEvent.getContent();
            return content.displayname || mxId;
        };

        const [saveState, save] = useAsyncCallback(
            useCallback(async () => {
                const ta = textAreaRef.current;
                if (!ta) return;
                const plainText = toPlainText(ta.value, getDisplayName).trim();
                const customHtml = trimCustomHtml(
                    toMatrixCustomHTML(ta.value, getDisplayName)
                );

                const [prevBody, prevCustomHtml] = getPrevBodyAndFormattedBody();

                if (plainText === '') return undefined;
                if (prevBody) {
                    if (prevCustomHtml && trimReplyFromFormattedBody(prevCustomHtml) === customHtml) {
                        return undefined;
                    }
                    if (
                        !prevCustomHtml &&
                        prevBody === plainText &&
                        customHtmlEqualsPlainText(customHtml, plainText)
                    ) {
                        return undefined;
                    }
                }

                const newContent: IContent = {
                    msgtype: mEvent.getContent().msgtype,
                    body: plainText,
                };

                if (!customHtmlEqualsPlainText(customHtml, plainText)) {
                    newContent.format = 'org.matrix.custom.html';
                    newContent.formatted_body = customHtml;
                }

                const content: IContent = {
                    ...newContent,
                    body: `* ${plainText}`,
                    'm.new_content': newContent,
                    'm.relates_to': {
                        event_id: mEvent.getId(),
                        rel_type: RelationType.Replace,
                    },
                };

                //@ts-ignore
                return mx.sendMessage(roomId, content);
            }, [mx, textAreaRef, roomId, mEvent, isMarkdown, getPrevBodyAndFormattedBody])
        );

        const handleSave = useCallback(() => {
            if (saveState.status !== AsyncStatus.Loading) {
                save();
            }
        }, [saveState, save]);

        const handleKeyDown: KeyboardEventHandler = useCallback(
            (evt) => {
                if (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) {
                    evt.preventDefault();
                    handleSave();
                }
                if (isKeyHotkey('escape', evt)) {
                    evt.preventDefault();
                    onCancel();
                }
            },
            [onCancel, handleSave, enterForNewline]
        );

        const handleKeyUp: KeyboardEventHandler = useCallback(
            (evt) => {
                if (isKeyHotkey('escape', evt)) {
                    evt.preventDefault();
                    return;
                }

                const query = getAutocompleteQuery<AutocompletePrefix>(textAreaRef, AUTOCOMPLETE_PREFIXES);
                setAutocompleteQuery(query);
            },
            [textAreaRef]
        );

        const handleCloseAutocomplete = useCallback(() => {
            textAreaRef.current?.focus();
            setAutocompleteQuery(undefined);
        }, [textAreaRef]);

        useEffect(() => {
            const [body, customHtml] = getPrevBodyAndFormattedBody();

            const initialValue =
                typeof customHtml === 'string'
                    ? htmlToEditorInput(customHtml)
                    : plainToEditorInput(typeof body === 'string' ? body : '');

            if (textAreaRef.current) textAreaRef.current.value = initialValue;
        }, [textAreaRef, getPrevBodyAndFormattedBody]);

        useEffect(() => {
            if (saveState.status === AsyncStatus.Success) {
                onCancel();
            }
        }, [saveState, onCancel]);

        return (
            <div {...props} ref={ref}>
                {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
                    <RoomMentionAutocomplete
                        roomId={roomId}
                        textAreaRef={textAreaRef}
                        query={autocompleteQuery}
                        requestClose={handleCloseAutocomplete}
                    />
                )}
                {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
                    <UserMentionAutocomplete
                        room={room}
                        textAreaRef={textAreaRef}
                        query={autocompleteQuery}
                        requestClose={handleCloseAutocomplete}
                    />
                )}
                {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
                    <EmoticonAutocomplete
                        imagePackRooms={imagePackRooms || []}
                        textAreaRef={textAreaRef}
                        query={autocompleteQuery}
                        requestClose={handleCloseAutocomplete}
                    />
                )}
                <CustomEditor
                    textAreaRef={textAreaRef}
                    placeholder={getText('placeholder.msg_edit')}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    bottom={
                        <>
                            <Box
                                style={{ padding: config.space.S200, paddingTop: 0 }}
                                alignItems="End"
                                justifyContent="SpaceBetween"
                                gap="100"
                            >
                                <Box gap="Inherit">
                                    <Chip
                                        onClick={handleSave}
                                        variant="filled"
                                        disabled={saveState.status === AsyncStatus.Loading}
                                        label={getText('btn.msg_edit.save')}
                                        color='primary'
                                    />
                                    <Chip
                                        onClick={onCancel}
                                        variant='outlined'
                                        label={getText('btn.cancel')}
                                        color='secondary'
                                    />
                                </Box>
                                <Box gap="Inherit">
                                    <UseStateProvider initial={undefined}>
                                        {(anchor: RectCords | undefined, setAnchor) => (
                                            <PopOut
                                                anchor={anchor}
                                                alignOffset={-8}
                                                position="Top"
                                                align="End"
                                                content={
                                                    <EmojiBoard
                                                        imagePackRooms={imagePackRooms ?? []}
                                                        returnFocusOnDeactivate={false}
                                                        requestClose={() => {
                                                            setAnchor(undefined);
                                                            if (!mobileOrTablet()) textAreaRef.current?.focus();
                                                        }}
                                                    />
                                                }
                                            >
                                                <IconButton
                                                    aria-pressed={anchor !== undefined}
                                                    onClick={
                                                        ((evt) =>
                                                            setAnchor(
                                                                evt.currentTarget.getBoundingClientRect()
                                                            )) as MouseEventHandler<HTMLButtonElement>
                                                    }
                                                >
                                                    <Icon size={1} path={anchor !== undefined ? mdiEmoticon : mdiEmoticonOutline} />
                                                </IconButton>
                                            </PopOut>
                                        )}
                                    </UseStateProvider>
                                </Box>
                            </Box>
                        </>
                    }
                />
            </div>
        );
    }
);
