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
    IconButton,
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
import { openHiddenRooms, openReusableContextMenu } from '../../../client/action/navigation';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import Icon from '@mdi/react';
import { mdiAt, mdiBell, mdiBellOff, mdiCheckAll, mdiClose, mdiEmoticon, mdiEmoticonOutline, mdiEye, mdiEyeOff, mdiFile, mdiMicrophone, mdiPlusCircle, mdiPlusCircleOutline, mdiSend, mdiSendOutline, mdiSticker, mdiStickerOutline } from '@mdi/js';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { getEventCords } from '../../../util/common';
import HideReasonSelector from '../../molecules/hide-reason-selector/HideReasonSelector';

interface RoomInputProps {
    fileDropContainerRef: RefObject<HTMLElement>;
    textAreaRef: RefObject<HTMLTextAreaElement>;
    roomId: string;
    room: Room;
    newDesign?: boolean;
    threadRootId?: string;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(
    ({ fileDropContainerRef, roomId, room, textAreaRef, newDesign, threadRootId }, ref) => {
        const mx = useMatrixClient();
        const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
        const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
        const commands = useCommands(mx, room);
        const emojiBtnRef = useRef<HTMLButtonElement>(null);
        const roomToParents = useAtomValue(roomToParentsAtom);
        const [enableCaptions] = useSetting(settingsAtom, 'extera_enableCaptions');
        const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');
        const [replyFallbacks] = useSetting(settingsAtom, 'replyFallbacks');
        const [voiceMessages] = useSetting(settingsAtom, 'voiceMessages');

        const [msgContent, setMsgContent] = useState<IContent>();
        const [hideReason, setHideReason] = useState<string | undefined>(undefined);
        const [replyDraft, setReplyDraft] = useAtom(roomIdToReplyDraftAtomFamily(roomId));
        const [msgDraft, setMsgDraft] = useAtom(roomIdToMsgDraftAtomFamily(roomId));
        const [replyMention, setReplyMention] = useState(true);
        const [uploadBoard, setUploadBoard] = useState(true);
        const [selectedFiles, setSelectedFiles] = useAtom(roomIdToUploadItemsAtomFamily(roomId));
        const powerLevels = usePowerLevelsContext();
        const { getPowerLevel, canSendEvent } = usePowerLevelsAPI(powerLevels);
        const myUserId = mx.getUserId();
        const canRedact = myUserId
            ? canSendEvent(EventType.RoomRedaction, getPowerLevel(myUserId))
            : false;
        const uploadFamilyObserverAtom = createUploadFamilyObserverAtom(
            roomUploadAtomFamily,
            selectedFiles.map((f) => f.file)
        );
        const uploadBoardHandlers = useRef<UploadBoardImperativeHandlers>();

        const ar = useVoiceRecorder();

        const imagePackRooms: Room[] = useMemo(() => {
            const allParentSpaces = [roomId].concat(Array.from(getAllParents(roomToParents, roomId)));
            return allParentSpaces.reduce<Room[]>((list, rId) => {
                const r = mx.getRoom(rId);
                if (r) list.push(r);
                return list;
            }, []);
        }, [mx, roomId, roomToParents]);

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
                        fileItems.push({ file: f, originalFile: f, encInfo: undefined, hideReason: undefined })
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

            for (const content of contents) {
                if (enableCaptions && msgContent) {
                    await mx.sendMessage(roomId, {
                        ...content,
                        ...msgContent,
                        // @ts-ignore
                        msgtype: content.msgtype
                    });
                } else {
                    // @ts-ignore
                    await mx.sendMessage(roomId, content);
                }
            }
        };

        const handleHide = useCallback((evt?: MouseEvent) => {
            openReusableContextMenu('bottom', getEventCords(evt as unknown as Event, 'button'), (closeMenu: () => void) => (
                <HideReasonSelector
                    value={hideReason}
                    onSelect={(r?: string) => {
                        closeMenu();
                        setHideReason(r);
                        console.debug(`Hide reason is now`, r);
                    }}
                />
            ));
        }, [hideReason, setHideReason]);

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

        const getContent = useCallback(() => {
            const ta = textAreaRef.current;
            if (!ta) return;
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
                setShowStickerButton(true);

                if (!ghostMode) sendTypingStatus(false);
                return {};
            }

            if (plainText === '') return {};

            let body = plainText;
            let formattedBody = customHtml;
            if (replyDraft && replyFallbacks) {
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
                },
            };

            if (replyDraft || !customHtmlEqualsPlainText(formattedBody, body)) {
                content.format = 'org.matrix.custom.html';
                content.formatted_body = formattedBody;
            }

            if (replyDraft && replyMention) {
                if (content['m.mentions'] && !content['m.mentions'].user_ids) content['m.mentions'].user_ids = [];
                content['m.mentions']?.user_ids?.push(replyDraft.userId);
            }

            if (threadRootId) {
                content['m.relates_to'] = {
                    rel_type: 'm.thread',
                    event_id: threadRootId,
                    'm.in_reply_to': {
                        event_id: threadRootId
                    },
                    is_falling_back: true
                };
            }

            if (replyDraft) {
                if (!content['m.relates_to']) content['m.relates_to'] = {};
                content['m.relates_to']['m.in_reply_to'] = {
                    event_id: replyDraft.eventId
                };
                content['m.relates_to'].is_falling_back = false;
            }
            
            if (hideReason) {
                console.log(`Hide reason is`, hideReason);
                content['space.0x1a8510f2.msc3368.tags'] = [hideReason];
            }

            return content;
        }, [mx, room, textAreaRef, replyDraft, sendTypingStatus, setReplyDraft, isMarkdown, commands, threadRootId, hideReason]);

        const submit = useCallback(async () => {
            const content = getContent();
            if (!ar.isRecording) {
                setMsgContent(content);
            } else {
                ar.stopRecording();
            }
        }, [mx, roomId, textAreaRef, replyDraft, sendTypingStatus, setReplyDraft, isMarkdown, commands, ar, threadRootId, setMsgContent]);

        const stopRecording = useCallback(() => {
            ar.stopRecording();
        }, [ar]);

        useEffect(() => {

        }, [threadRootId]);

        useEffect(() => {
            if (msgContent) {
                console.debug(enableCaptions, msgContent);
                console.debug(selectedFiles);
                if (typeof msgContent.body === 'string' && (selectedFiles.length == 0 || !enableCaptions)) {
                    // @ts-ignore
                    mx.sendMessage(roomId, msgContent);
                    console.debug(selectedFiles.length < 1, !enableCaptions, "Sending a separate message");
                }

                uploadBoardHandlers.current?.handleSend();
                console.debug(selectedFiles);

                setReplyDraft(undefined);
                sendTypingStatus(false);
                resetEditor(textAreaRef);
                setShowStickerButton(true);
                setHideReason(undefined);
                setMsgContent(undefined);
                setMsgDraft('');
            }
        }, [msgContent]);

        const recordVoice = useCallback(() => {
            ar.startRecording();
        }, [mx, ar]);

        const sendVoice = useCallback(async () => {
            console.log('Sending voice');
            ar.stopRecording();
            const blob = ar.blob;
            console.log(`blob!!!`, blob);
            if (blob) {
                const { content_uri } = await mx.uploadContent(blob, {
                    type: 'audio/ogg',
                    name: 'Voice message.ogg'
                });
                setMsgContent({
                    msgtype: 'm.audio',
                    'org.matrix.msc3245.voice': {},
                    body: 'Voice message.ogg',
                    info: {
                        mimetype: 'audio/ogg',
                        size: blob.size,
                        duration: ar.duration
                    },
                    'org.matrix.msc1767.audio': {
                        duration: ar.duration,
                    },
                    url: content_uri
                });
            }
        }, [mx, roomId, replyDraft]);

        useEffect(() => {
            if (!ar.isRecording && ar.blob) sendVoice();
        }, [ar.blob]);

        const readReceipt = useCallback(() => {
            markAsRead(roomId);
        }, [mx, roomId]);

        const handleChange = useCallback(
            (nt: string) => {
                setMsgDraft(nt);
            },
            [setMsgDraft]
        );

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

            const content: IContent = {
                body: label,
                url: mxc,
                info
            };

            if (replyDraft) {
                content['m.relates_to'] = {
                    'm.in_reply_to': {
                        event_id: replyDraft.eventId,
                    },
                };
            }

            // @ts-ignore
            mx.sendEvent(roomId, EventType.Sticker, content);

            setReplyDraft(undefined);
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

        useEffect(() => {
            if (textAreaRef.current) textAreaRef.current.value = msgDraft;
        }, [msgDraft]);

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
                                <Icon size={1} path={mdiFile} />
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
                    disabled={ar.isRecording}
                    placeholder={ar.isRecording ? getText('placeholder.room_input.voice') : getText(canRedact ? 'placeholder.room_input' : 'placeholder.room_input.be_careful')}
                    onKeyDown={handleKeyDown}
                    onChange={handleChange}
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
                                        onClick={() => setReplyMention(!replyMention)}
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                    >
                                        <Icon size={1} path={replyMention ? mdiBell : mdiBellOff} />
                                    </IconButton>
                                    <IconButton
                                        onMouseDown={dontHideKeyboard}
                                        onClick={() => setReplyDraft(undefined)}
                                        variant="SurfaceVariant"
                                        size="300"
                                        radii="300"
                                    >
                                        <Icon size={1} path={mdiClose} />
                                    </IconButton>
                                </Box>
                            </div>
                        )
                    }
                    before={
                        !ar.isRecording && <IconButton
                            onClick={() => pickFile('*')}
                            variant="SurfaceVariant"
                            size="300"
                            radii="300"
                        >
                            <Icon size={1} path={mdiPlusCircleOutline} />
                        </IconButton>
                    }
                    after={
                        <>
                            {!ar.isRecording && (
                                <>
                                    <IconButton onMouseDown={dontHideKeyboard} onClick={handleHide} variant="SurfaceVariant" size="300" radii="300">
                                        <Icon size={1} path={hideReason ? mdiEyeOff : mdiEye} />
                                    </IconButton>
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
                                                        onClick={() => {
                                                            if (emojiBoardTab) {
                                                                setEmojiBoardTab(undefined);
                                                            } else {
                                                                setEmojiBoardTab(showStickerButton ? EmojiBoardTab.Sticker : EmojiBoardTab.Emoji)
                                                            }
                                                        }}
                                                        onMouseDown={dontHideKeyboard}
                                                        variant="SurfaceVariant"
                                                        size="300"
                                                        radii="300"
                                                        ref={emojiBtnRef}
                                                    >
                                                        <Icon
                                                            size={1}
                                                            path={showStickerButton ? (!!emojiBoardTab ? mdiSticker : mdiStickerOutline) : (!!emojiBoardTab ? mdiEmoticon : mdiEmoticonOutline)}
                                                        />
                                                    </IconButton>
                                                )}
                                            </PopOut>
                                        )}
                                    </UseStateProvider>
                                </>
                            )}
                            {(isEmptyEditor(textAreaRef) && !ar.isRecording && voiceMessages) ? (
                                <>
                                    <IconButton onMouseDown={dontHideKeyboard} onClick={recordVoice} variant="SurfaceVariant" size="300" radii="300">
                                        <Icon size={1} path={mdiMicrophone} />
                                    </IconButton>
                                </>
                            ) : (
                                <IconButton onMouseDown={dontHideKeyboard} onClick={ar.isRecording ? stopRecording : submit} variant="SurfaceVariant" size="300" radii="300">
                                    <Icon size={1} path={mdiSendOutline} />
                                </IconButton>
                            )}
                        </>
                    }
                />
            </div>
        );
    }
);
