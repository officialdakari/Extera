import React, {
    Dispatch,
    KeyboardEventHandler,
    MouseEvent,
    MouseEventHandler,
    PointerEvent,
    RefObject,
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { isKeyHotkey } from 'is-hotkey';
import { EventTimeline, EventType, IContent, MsgType, Room } from 'matrix-js-sdk';
import {
    Box,
    Dialog,
    Icon,
    IconButton,
    Icons,
    Line,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    PopOut,
    Scroll,
    Text,
    config,
    toRem,
} from 'folds';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
    CustomEditor,
    toMatrixCustomHTML,
    toPlainText,
    AUTOCOMPLETE_PREFIXES,
    AutocompletePrefix,
    AutocompleteQuery,
    getAutocompleteQuery,
    resetEditor,
    RoomMentionAutocomplete,
    UserMentionAutocomplete,
    EmoticonAutocomplete,
    resetEditorHistory,
    customHtmlEqualsPlainText,
    trimCustomHtml,
    isEmptyEditor,
    getBeginCommand,
    trimCommand,
    getMentions
} from '../../components/editor';
import { EmojiBoard, EmojiBoardTab } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import { TUploadContent, encryptFile, getImageInfo, getMxIdLocalPart } from '../../utils/matrix';
import { useTypingStatusUpdater } from '../../hooks/useTypingStatusUpdater';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useFilePasteHandler } from '../../hooks/useFilePasteHandler';
import { useFileDropZone } from '../../hooks/useFileDrop';
import {
    TUploadItem,
    roomIdToMsgDraftAtomFamily,
    roomIdToReplyDraftAtomFamily,
    roomIdToUploadItemsAtomFamily,
    roomUploadAtomFamily,
} from '../../state/room/roomInputDrafts';
import { UploadCardRenderer } from '../../components/upload-card';
import {
    UploadBoard,
    UploadBoardContent,
    UploadBoardHeader,
    UploadBoardImperativeHandlers,
} from '../../components/upload-board';
import {
    Upload,
    UploadStatus,
    UploadSuccess,
    createUploadFamilyObserverAtom,
} from '../../state/upload';
import { getImageUrlBlob, loadImageElement } from '../../utils/dom';
import { safeFile } from '../../utils/mimeTypes';
import { fulfilledPromiseSettledResult } from '../../utils/common';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import {
    getAudioMsgContent,
    getFileMsgContent,
    getImageMsgContent,
    getVideoMsgContent,
} from './msgContent';
import colorMXID from '../../../util/colorMXID';
import {
    getAllParents,
    getMemberDisplayName,
    parseReplyBody,
    parseReplyFormattedBody,
    trimReplyFromBody,
    trimReplyFromFormattedBody,
} from '../../utils/room';
import { sanitizeText } from '../../utils/sanitize';
import { CommandAutocomplete } from './CommandAutocomplete';
import { Command, SHRUG, LENNY, TABLEFLIP, UNFLIP, useCommands } from '../../hooks/useCommands';
import { mobileOrTablet } from '../../utils/user-agent';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { ReplyLayout } from '../../components/message';
import { markAsRead } from '../../../client/action/notifications';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getText } from '../../../lang';
import { openHiddenRooms } from '../../../client/action/navigation';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';

interface RoomInputProps {
    fileDropContainerRef: RefObject<HTMLElement>;
    textAreaRef: RefObject<HTMLTextAreaElement>;
    roomId: string;
    room: Room;
    newDesign?: boolean;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(
    ({ fileDropContainerRef, roomId, room, textAreaRef, newDesign }, ref) => {
        const mx = useMatrixClient();
        const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
        const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
        const commands = useCommands(mx, room);
        const emojiBtnRef = useRef<HTMLButtonElement>(null);
        const roomToParents = useAtomValue(roomToParentsAtom);
        const [enableCaptions] = useSetting(settingsAtom, 'extera_enableCaptions');
        const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');

        const [msgDraft, setMsgDraft] = useAtom(roomIdToMsgDraftAtomFamily(roomId));
        const [replyDraft, setReplyDraft] = useAtom(roomIdToReplyDraftAtomFamily(roomId));
        const [uploadBoard, setUploadBoard] = useState(true);
        const [selectedFiles, setSelectedFiles] = useAtom(roomIdToUploadItemsAtomFamily(roomId));
        const uploadFamilyObserverAtom = createUploadFamilyObserverAtom(
            roomUploadAtomFamily,
            selectedFiles.map((f) => f.file)
        );
        const uploadBoardHandlers = useRef<UploadBoardImperativeHandlers>();

        const editorRef = useRef(null);

        const imagePackRooms: Room[] = useMemo(() => {
            const allParentSpaces = [roomId].concat(Array.from(getAllParents(roomToParents, roomId)));
            return allParentSpaces.reduce<Room[]>((list, rId) => {
                const r = mx.getRoom(rId);
                if (r) list.push(r);
                return list;
            }, []);
        }, [mx, roomId, roomToParents]);

        const [toolbar, setToolbar] = useSetting(settingsAtom, 'editorToolbar');
        const [autocompleteQuery, setAutocompleteQuery] =
            useState<AutocompleteQuery<AutocompletePrefix>>();

        const sendTypingStatus = useTypingStatusUpdater(mx, roomId);

        const handleFiles = useCallback(
            async (files: File[]) => {
                setUploadBoard(true);
                const safeFiles = files.map(safeFile);
                const fileItems: TUploadItem[] = [];

                if (mx.isRoomEncrypted(roomId)) {
                    const encryptFiles = fulfilledPromiseSettledResult(
                        await Promise.allSettled(safeFiles.map((f) => encryptFile(f)))
                    );
                    encryptFiles.forEach((ef) => fileItems.push(ef));
                } else {
                    safeFiles.forEach((f) =>
                        fileItems.push({ file: f, originalFile: f, encInfo: undefined })
                    );
                }
                setSelectedFiles({
                    type: 'PUT',
                    item: fileItems,
                });
            },
            [setSelectedFiles, roomId, mx]
        );
        const pickFile = useFilePicker(handleFiles, true);
        const handlePaste = useFilePasteHandler(handleFiles);
        const dropZoneVisible = useFileDropZone(fileDropContainerRef, handleFiles);
        const [showStickerButton, setShowStickerButton] = useState(true);
        const [sending, setSending] = useState(false);
        const [screenSize] = useScreenSize();

        const handleRemoveUpload = useCallback(
            (upload: TUploadContent | TUploadContent[]) => {
                const uploads = Array.isArray(upload) ? upload : [upload];
                setSelectedFiles({
                    type: 'DELETE',
                    item: selectedFiles.filter((f) => uploads.find((u) => u === f.file)),
                });
                uploads.forEach((u) => roomUploadAtomFamily.remove(u));
            },
            [setSelectedFiles, selectedFiles]
        );

        const handleCancelUpload = (uploads: Upload[]) => {
            uploads.forEach((upload) => {
                if (upload.status === UploadStatus.Loading) {
                    mx.cancelUpload(upload.promise);
                }
            });
            handleRemoveUpload(uploads.map((upload) => upload.file));
        };

        const sendFiles = async (uploads: UploadSuccess[]) => {
            const contentsPromises = uploads.map(async (upload) => {
                const fileItem = selectedFiles.find((f) => f.file === upload.file);
                if (!fileItem) throw new Error('Broken upload');

                if (fileItem.file.type.startsWith('image')) {
                    return getImageMsgContent(mx, fileItem, upload.mxc);
                }
                if (fileItem.file.type.startsWith('video')) {
                    return getVideoMsgContent(mx, fileItem, upload.mxc);
                }
                if (fileItem.file.type.startsWith('audio')) {
                    return getAudioMsgContent(fileItem, upload.mxc);
                }
                return getFileMsgContent(fileItem, upload.mxc);
            });
            handleCancelUpload(uploads);
            const contents = fulfilledPromiseSettledResult(await Promise.allSettled(contentsPromises));
            return contents;
        };

        const handleSendUpload = async (uploads: UploadSuccess[]) => {
            const contents = await sendFiles(uploads);
            contents.forEach((content) => {
                mx.sendMessage(roomId, content);
            });
        };

        const dontHideKeyboard = useCallback((evt?: MouseEvent) => {
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        }, []);

        const getDisplayName = (mxId: string) => {
            const timeline = room.getLiveTimeline();
            const state = timeline.getState(EventTimeline.FORWARDS);
            if (!state) return mxId;
            const memberEvent = state.getStateEvents('m.room.member', mxId);
            if (!memberEvent) return mxId;
            const content = memberEvent.getContent();
            return content.displayname || mxId;
        };

        const submit = useCallback(async () => {
            const ta = textAreaRef.current;
            if (!ta) return;
            uploadBoardHandlers.current?.handleSend();
            const commandName = getBeginCommand(textAreaRef);
            let plainText = toPlainText(ta.value, getDisplayName).trim();
            let customHtml = trimCustomHtml(
                toMatrixCustomHTML(ta.value, getDisplayName)
            );
            let { user_ids, room } = getMentions(ta.value);
            let msgType = MsgType.Text;

            if (commandName && commands[commandName as Command]) {
                plainText = trimCommand(commandName, plainText);
                customHtml = trimCommand(commandName, customHtml);
            }

            if (commandName === Command.Me) {
                msgType = MsgType.Emote;
            } else if (commandName === Command.Notice) {
                msgType = MsgType.Notice;
            } else if (commandName === Command.Shrug) {
                plainText = `${SHRUG} ${plainText}`;
                customHtml = `${SHRUG} ${customHtml}`;
            } else if (commandName === Command.Lenny) {
                plainText = `${LENNY} ${plainText}`;
                customHtml = `${LENNY} ${customHtml}`;
            } else if (commandName === Command.TableFlip) {
                plainText = `${TABLEFLIP} ${plainText}`;
                customHtml = `${TABLEFLIP} ${customHtml}`;
            } else if (commandName === Command.UnFlip) {
                plainText = `${UNFLIP} ${plainText}`;
                customHtml = `${UNFLIP} ${customHtml}`;
            } else if (commandName && commands[commandName as Command]) {
                const commandContent = commands[commandName as Command];
                if (commandContent) {
                    commandContent.exe(plainText);
                }

                resetEditor(textAreaRef);

                if (!ghostMode) sendTypingStatus(false);
                return;
            }

            if (plainText === '') return;

            let body = plainText;
            let formattedBody = customHtml;
            if (replyDraft) {
                body = parseReplyBody(replyDraft.userId, trimReplyFromBody(replyDraft.body)) + body;
                formattedBody =
                    parseReplyFormattedBody(
                        roomId,
                        replyDraft.userId,
                        replyDraft.eventId,
                        replyDraft.formattedBody
                            ? trimReplyFromFormattedBody(replyDraft.formattedBody)
                            : sanitizeText(replyDraft.body)
                    ) + formattedBody;
            }

            const content: IContent = {
                msgtype: msgType,
                body,
                'm.mentions': {
                    user_ids,
                    room
                }
            };
            if (replyDraft || !customHtmlEqualsPlainText(formattedBody, body)) {
                content.format = 'org.matrix.custom.html';
                content.formatted_body = formattedBody;
            }
            if (replyDraft) {
                content['m.relates_to'] = {
                    'm.in_reply_to': {
                        event_id: replyDraft.eventId,
                    },
                };
            }
            mx.sendMessage(roomId, content);

            setReplyDraft(undefined);
            sendTypingStatus(false);
            resetEditor(textAreaRef);
        }, [mx, roomId, textAreaRef, replyDraft, sendTypingStatus, setReplyDraft, isMarkdown, commands]);

        const readReceipt = useCallback(() => {
            markAsRead(roomId);
        }, [mx, roomId]);

        const handleKeyDown: KeyboardEventHandler = useCallback(
            (evt) => {
                setShowStickerButton(isEmptyEditor(textAreaRef));
                if (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) {
                    evt.preventDefault();
                    submit();
                }
                if (isKeyHotkey('escape', evt)) {
                    evt.preventDefault();
                    setReplyDraft(undefined);
                }
            },
            [submit, setReplyDraft, enterForNewline]
        );

        const handleKeyUp: KeyboardEventHandler = useCallback(
            (evt) => {
                setShowStickerButton(isEmptyEditor(textAreaRef));
                if (isKeyHotkey('escape', evt)) {
                    evt.preventDefault();
                    return;
                }

                if (!ghostMode) {
                    const editor = textAreaRef?.current;
                    if (editor)
                        sendTypingStatus(editor.value.length > 0);
                }

                const query = getAutocompleteQuery<AutocompletePrefix>(textAreaRef, AUTOCOMPLETE_PREFIXES);
                console.log(query);
                setAutocompleteQuery(query);
            },
            [textAreaRef, sendTypingStatus]
        );

        const handleCloseAutocomplete = useCallback(() => {
            setAutocompleteQuery(undefined);
            // ReactEditor.focus(editor);
            textAreaRef.current?.focus();
        }, [textAreaRef]);

        const handleStickerSelect = async (mxc: string, shortcode: string, label: string) => {
            const stickerUrl = mx.mxcUrlToHttp(mxc);
            if (!stickerUrl) return;

            const info = await getImageInfo(
                await loadImageElement(stickerUrl),
                await getImageUrlBlob(stickerUrl)
            );

            mx.sendEvent(roomId, EventType.Sticker, {
                body: label,
                url: mxc,
                info,
            });
        };

        const handleEmoticonSelect = (unicode: string, shortcode: string) => {
            const ta = textAreaRef.current;
            if (!ta) return;
            const index = ta.selectionStart;
            const text = ta.value;
            ta.value = `${text.slice(0, index)}${unicode}${text.slice(index)}`;

            ta.focus();
            ta.selectionEnd = index + 1;
            ta.selectionStart = index + 1;
        };

        const handleCustomEmoticonSelect = (mxc: string, shortcode: string) => {
            const ta = textAreaRef.current;
            if (!ta) return;
            const index = ta.selectionStart;
            const text = ta.value;
            const result = `{:${shortcode}:${mxc}:}`;
            ta.value = `${text.slice(0, index)}${result}${text.slice(index)}`;

            ta.focus();
            ta.selectionEnd = index + result.length;
            ta.selectionStart = index + result.length;
        };

        return (
            <div ref={ref}>
                {selectedFiles.length > 0 && (
                    <UploadBoard
                        header={
                            <UploadBoardHeader
                                open={uploadBoard}
                                onToggle={() => setUploadBoard(!uploadBoard)}
                                uploadFamilyObserverAtom={uploadFamilyObserverAtom}
                                onSend={handleSendUpload}
                                imperativeHandlerRef={uploadBoardHandlers}
                                onCancel={handleCancelUpload}
                            />
                        }
                    >
                        {uploadBoard && (
                            <Scroll size="300" hideTrack visibility="Hover">
                                <UploadBoardContent>
                                    {Array.from(selectedFiles)
                                        .reverse()
                                        .map((fileItem, index) => (
                                            <UploadCardRenderer
                                                // eslint-disable-next-line react/no-array-index-key
                                                key={index}
                                                file={fileItem.file}
                                                isEncrypted={!!fileItem.encInfo}
                                                uploadAtom={roomUploadAtomFamily(fileItem.file)}
                                                onRemove={handleRemoveUpload}
                                            />
                                        ))}
                                </UploadBoardContent>
                            </Scroll>
                        )}
                    </UploadBoard>
                )}
                <Overlay
                    open={dropZoneVisible}
                    backdrop={<OverlayBackdrop />}
                    style={{ pointerEvents: 'none' }}
                >
                    <OverlayCenter>
                        <Dialog variant="Primary">
                            <Box
                                direction="Column"
                                justifyContent="Center"
                                alignItems="Center"
                                gap="500"
                                style={{ padding: toRem(60) }}
                            >
                                <Icon size="600" src={Icons.File} />
                                <Text size="H4" align="Center">
                                    {getText('room_input.drop_files', room?.name || getText('room_input.drop_files.this_room'))}
                                </Text>
                                <Text align="Center">{getText('room_input.drop_files.2')}</Text>
                            </Box>
                        </Dialog>
                    </OverlayCenter>
                </Overlay>
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
                        imagePackRooms={imagePackRooms}
                        textAreaRef={textAreaRef}
                        query={autocompleteQuery}
                        requestClose={handleCloseAutocomplete}
                    />
                )}
                {autocompleteQuery?.prefix === AutocompletePrefix.Command && (
                    <CommandAutocomplete
                        room={room}
                        textAreaRef={textAreaRef}
                        query={autocompleteQuery}
                        requestClose={handleCloseAutocomplete}
                    />
                )}
                <CustomEditor
                    editableName="RoomInput"
                    newDesign={newDesign}
                    // editor={editor}
                    textAreaRef={textAreaRef}
                    placeholder={getText('placeholder.room_input')}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onPaste={handlePaste}
                    top={
                        replyDraft && (
                            <div>
                                <Box
                                    alignItems="Center"
                                    gap="300"
                                    style={{ padding: `${config.space.S200} ${config.space.S300} 0` }}
                                >
                                    <ReplyLayout
                                        userColor={colorMXID(replyDraft.userId)}
                                        style={{ width: '100%' }}
                                        username={
                                            <Text size="T300" truncate>
                                                <b>
                                                    {getMemberDisplayName(room, replyDraft.userId) ??
                                                        getMxIdLocalPart(replyDraft.userId) ??
                                                        replyDraft.userId}
                                                </b>
                                            </Text>
                                        }
                                    >
                                        <Text size="T300" truncate>
                                            {trimReplyFromBody(replyDraft.body)}
                                        </Text>
                                    </ReplyLayout>
                                    <IconButton
                                        onMouseDown={dontHideKeyboard}
                                        onClick={() => setReplyDraft(undefined)}
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                    >
                                        <Icon src={Icons.Cross} size="50" />
                                    </IconButton>
                                </Box>
                            </div>
                        )
                    }
                    before={
                        <UseStateProvider initial={undefined}>
                            {(emojiBoardTab: EmojiBoardTab | undefined, setEmojiBoardTab) => (
                                <PopOut
                                    offset={16}
                                    alignOffset={-44}
                                    position="Top"
                                    align="End"
                                    anchor={
                                        emojiBoardTab === undefined
                                            ? undefined
                                            : emojiBtnRef.current?.getBoundingClientRect() ?? undefined
                                    }
                                    content={
                                        <EmojiBoard
                                            tab={emojiBoardTab}
                                            onTabChange={setEmojiBoardTab}
                                            imagePackRooms={imagePackRooms}
                                            returnFocusOnDeactivate={false}
                                            onEmojiSelect={handleEmoticonSelect}
                                            onCustomEmojiSelect={handleCustomEmoticonSelect}
                                            onStickerSelect={handleStickerSelect}
                                            requestClose={() => {
                                                setEmojiBoardTab(undefined);
                                                if (!mobileOrTablet()) textAreaRef.current?.focus();
                                            }}
                                        />
                                    }
                                >
                                    {(
                                        <IconButton
                                            aria-pressed={
                                                !!emojiBoardTab
                                            }
                                            onClick={() => setEmojiBoardTab(showStickerButton ? EmojiBoardTab.Sticker : EmojiBoardTab.Emoji)}
                                            //onMouseDown={dontHideKeyboard}
                                            variant="SurfaceVariant"
                                            size="300"
                                            radii="300"
                                            ref={emojiBtnRef}
                                        >
                                            <Icon
                                                src={showStickerButton ? Icons.Sticker : Icons.Smile}
                                                filled={!!emojiBoardTab}
                                            />
                                        </IconButton>
                                    )}
                                </PopOut>
                            )}
                        </UseStateProvider>
                    }
                    after={
                        <>
                            <IconButton onMouseDown={dontHideKeyboard} onClick={readReceipt} variant="SurfaceVariant" size="300" radii="300">
                                <Icon src={Icons.CheckTwice} />
                            </IconButton>
                            <IconButton
                                onClick={() => pickFile('*')}
                                variant="SurfaceVariant"
                                size="300"
                                radii="300"
                            >
                                <Icon src={Icons.PlusCircle} />
                            </IconButton>
                            {screenSize !== ScreenSize.Mobile && (
                                <IconButton onMouseDown={dontHideKeyboard} onClick={submit} variant="SurfaceVariant" size="300" radii="300">
                                    <Icon src={Icons.Send} />
                                </IconButton>
                            )}
                        </>
                    }
                // bottom={
                //     toolbar && (
                //         <div>
                //             <Line variant="SurfaceVariant" size="300" />
                //             <Toolbar quill={quill} />
                //         </div>
                //     )
                // }
                />
            </div>
        );
    }
);
