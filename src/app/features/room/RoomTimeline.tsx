/* eslint-disable react/destructuring-assignment */
import React, {
    Dispatch,
    MouseEventHandler,
    MouseEvent,
    TouchEvent,
    RefObject,
    SetStateAction,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Direction,
    EventTimeline,
    EventTimelineSet,
    EventTimelineSetHandlerMap,
    IEncryptedFile,
    MatrixClient,
    MatrixEvent,
    Room,
    RoomEvent,
    RoomEventHandlerMap,
} from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import classNames from 'classnames';
import to from 'await-to-js';
import { useAtomValue, useSetAtom } from 'jotai';
import {
    Badge,
    Box,
    Chip,
    ContainerColor,
    Icon,
    Icons,
    Line,
    Scroll,
    Text,
    as,
    color,
    config,
    toRem,
} from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import {
    decryptFile,
    eventWithShortcode,
    factoryEventSentBy,
    getMxIdLocalPart,
    isRoomId,
    isUserId,
} from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import { editableActiveElement, scrollToBottom } from '../../utils/dom';
import {
    DefaultPlaceholder,
    CompactPlaceholder,
    Reply,
    MessageBase,
    MessageUnsupportedContent,
    Time,
    MessageNotDecryptedContent,
    RedactedContent,
    MSticker,
    ImageContent,
    EventContent,
    MPoll,
} from '../../components/message';
import { getReactCustomHtmlParser } from '../../plugins/react-custom-html-parser';
import {
    canEditEvent,
    decryptAllTimelineEvent,
    getAllParents,
    getEditedEvent,
    getEventReactions,
    getLatestEditableEvt,
    getMemberDisplayName,
    getReactionContent,
    isMembershipChanged,
    reactionOrEditEvent,
} from '../../utils/room';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { openJoinAlias, openProfileViewer } from '../../../client/action/navigation';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { Reactions, Message, Event, EncryptedContent } from './message';
import { useMemberEventParser } from '../../hooks/useMemberEventParser';
import * as customHtmlCss from '../../styles/CustomHtml.css';
import { RoomIntro } from '../../components/room-intro';
import {
    getIntersectionObserverEntry,
    useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import { markAsRead } from '../../../client/action/notifications';
import { useDebounce } from '../../hooks/useDebounce';
import { getResizeObserverEntry, useResizeObserver } from '../../hooks/useResizeObserver';
import * as css from './RoomTimeline.css';
import { inSameDay, minuteDifference, timeDayMonthYear, today, yesterday } from '../../utils/time';
import { isEmptyEditor } from '../../components/editor';
import { roomIdToReplyDraftAtomFamily } from '../../state/room/roomInputDrafts';
import { usePowerLevelsAPI, usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { GetContentCallback, MessageEvent, StateEvent } from '../../../types/matrix/room';
import { useKeyDown } from '../../hooks/useKeyDown';
import { useDocumentFocusChange } from '../../hooks/useDocumentFocusChange';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { Image } from '../../components/media';
import { ImageViewer } from '../../components/image-viewer';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useRoomUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { useSwipeLeft } from '../../hooks/useSwipeLeft';
import { clamp } from '../../utils/common';
import { parse } from 'url';
import { getText, translate } from '../../../lang';

const TimelineFloat = as<'div', css.TimelineFloatVariants>(
    ({ position, className, ...props }, ref) => (
        <Box
            className={classNames(css.TimelineFloat({ position }), className)}
            justifyContent="Center"
            alignItems="Center"
            gap="200"
            {...props}
            ref={ref}
        />
    )
);

const TimelineDivider = as<'div', { variant?: ContainerColor | 'Inherit' }>(
    ({ variant, children, ...props }, ref) => (
        <Box gap="100" justifyContent="Center" alignItems="Center" {...props} ref={ref}>
            <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
            {children}
            <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
        </Box>
    )
);

export const getLiveTimeline = (room: Room): EventTimeline =>
    room.getUnfilteredTimelineSet().getLiveTimeline();

export const getEventTimeline = (room: Room, eventId: string): EventTimeline | undefined => {
    const timelineSet = room.getUnfilteredTimelineSet();
    return timelineSet.getTimelineForEvent(eventId) ?? undefined;
};

export const getFirstLinkedTimeline = (
    timeline: EventTimeline,
    direction: Direction
): EventTimeline => {
    const linkedTm = timeline.getNeighbouringTimeline(direction);
    if (!linkedTm) return timeline;
    return getFirstLinkedTimeline(linkedTm, direction);
};

export const getLinkedTimelines = (timeline: EventTimeline): EventTimeline[] => {
    const firstTimeline = getFirstLinkedTimeline(timeline, Direction.Backward);
    const timelines: EventTimeline[] = [];

    for (
        let nextTimeline: EventTimeline | null = firstTimeline;
        nextTimeline;
        nextTimeline = nextTimeline.getNeighbouringTimeline(Direction.Forward)
    ) {
        timelines.push(nextTimeline);
    }
    return timelines;
};

export const timelineToEventsCount = (t: EventTimeline) => t.getEvents().length;
export const getTimelinesEventsCount = (timelines: EventTimeline[]): number => {
    const timelineEventCountReducer = (count: number, tm: EventTimeline) =>
        count + timelineToEventsCount(tm);
    return timelines.reduce(timelineEventCountReducer, 0);
};

export const getTimelineAndBaseIndex = (
    timelines: EventTimeline[],
    index: number
): [EventTimeline | undefined, number] => {
    let uptoTimelineLen = 0;
    const timeline = timelines.find((t) => {
        uptoTimelineLen += t.getEvents().length;
        if (index < uptoTimelineLen) return true;
        return false;
    });
    if (!timeline) return [undefined, 0];
    return [timeline, uptoTimelineLen - timeline.getEvents().length];
};

export const getTimelineRelativeIndex = (absoluteIndex: number, timelineBaseIndex: number) =>
    absoluteIndex - timelineBaseIndex;

export const getTimelineEvent = (timeline: EventTimeline, index: number): MatrixEvent | undefined =>
    timeline.getEvents()[index];

export const getEventIdAbsoluteIndex = (
    timelines: EventTimeline[],
    eventTimeline: EventTimeline,
    eventId: string
): number | undefined => {
    const timelineIndex = timelines.findIndex((t) => t === eventTimeline);
    if (timelineIndex === -1) return undefined;
    const eventIndex = eventTimeline.getEvents().findIndex((evt) => evt.getId() === eventId);
    if (eventIndex === -1) return undefined;
    const baseIndex = timelines
        .slice(0, timelineIndex)
        .reduce((accValue, timeline) => timeline.getEvents().length + accValue, 0);
    return baseIndex + eventIndex;
};

export const factoryGetFileSrcUrl =
    (httpUrl: string, mimeType: string, encFile?: IEncryptedFile) => async (): Promise<string> => {
        if (encFile) {
            if (typeof httpUrl !== 'string') throw new Error('Malformed event');
            const encRes = await fetch(httpUrl, { method: 'GET' });
            const encData = await encRes.arrayBuffer();
            const decryptedBlob = await decryptFile(encData, mimeType, encFile);
            return URL.createObjectURL(decryptedBlob);
        }
        return httpUrl;
    };

type RoomTimelineProps = {
    room: Room;
    eventId?: string;
    roomInputRef: RefObject<HTMLElement>;
    textAreaRef: RefObject<HTMLTextAreaElement>;
};

const PAGINATION_LIMIT = 80;

type Timeline = {
    linkedTimelines: EventTimeline[];
    range: ItemRange;
};

const useEventTimelineLoader = (
    mx: MatrixClient,
    room: Room,
    onLoad: (eventId: string, linkedTimelines: EventTimeline[], evtAbsIndex: number) => void,
    onError: (err: Error | null) => void
) => {
    const loadEventTimeline = useCallback(
        async (eventId: string) => {
            const [err, replyEvtTimeline] = await to(
                mx.getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
            );
            if (!replyEvtTimeline) {
                onError(err ?? null);
                return;
            }
            const linkedTimelines = getLinkedTimelines(replyEvtTimeline);
            const absIndex = getEventIdAbsoluteIndex(linkedTimelines, replyEvtTimeline, eventId);

            if (absIndex === undefined) {
                onError(err ?? null);
                return;
            }

            onLoad(eventId, linkedTimelines, absIndex);
        },
        [mx, room, onLoad, onError]
    );

    return loadEventTimeline;
};

const useTimelinePagination = (
    mx: MatrixClient,
    timeline: Timeline,
    setTimeline: Dispatch<SetStateAction<Timeline>>,
    limit: number
) => {
    const timelineRef = useRef(timeline);
    timelineRef.current = timeline;
    const alive = useAlive();

    const handleTimelinePagination = useMemo(() => {
        let fetching = false;

        const recalibratePagination = (
            linkedTimelines: EventTimeline[],
            timelinesEventsCount: number[],
            backwards: boolean
        ) => {
            const topTimeline = linkedTimelines[0];
            const timelineMatch = (mt: EventTimeline) => (t: EventTimeline) => t === mt;

            const newLTimelines = getLinkedTimelines(topTimeline);
            const topTmIndex = newLTimelines.findIndex(timelineMatch(topTimeline));
            const topAddedTm = topTmIndex === -1 ? [] : newLTimelines.slice(0, topTmIndex);

            const topTmAddedEvt =
                timelineToEventsCount(newLTimelines[topTmIndex]) - timelinesEventsCount[0];
            const offsetRange = getTimelinesEventsCount(topAddedTm) + (backwards ? topTmAddedEvt : 0);

            setTimeline((currentTimeline) => ({
                linkedTimelines: newLTimelines,
                range:
                    offsetRange > 0
                        ? {
                            start: currentTimeline.range.start + offsetRange,
                            end: currentTimeline.range.end + offsetRange,
                        }
                        : { ...currentTimeline.range },
            }));
        };

        return async (backwards: boolean) => {
            if (fetching) return;
            const { linkedTimelines: lTimelines } = timelineRef.current;
            const timelinesEventsCount = lTimelines.map(timelineToEventsCount);

            const timelineToPaginate = backwards ? lTimelines[0] : lTimelines[lTimelines.length - 1];
            if (!timelineToPaginate) return;

            const paginationToken = timelineToPaginate.getPaginationToken(
                backwards ? Direction.Backward : Direction.Forward
            );
            if (
                !paginationToken &&
                getTimelinesEventsCount(lTimelines) !==
                getTimelinesEventsCount(getLinkedTimelines(timelineToPaginate))
            ) {
                recalibratePagination(lTimelines, timelinesEventsCount, backwards);
                return;
            }

            fetching = true;
            const [err] = await to(
                mx.paginateEventTimeline(timelineToPaginate, {
                    backwards,
                    limit,
                })
            );
            if (err) {
                // TODO: handle pagination error.
                return;
            }
            const fetchedTimeline =
                timelineToPaginate.getNeighbouringTimeline(
                    backwards ? Direction.Backward : Direction.Forward
                ) ?? timelineToPaginate;
            // Decrypt all event ahead of render cycle
            if (mx.isRoomEncrypted(fetchedTimeline.getRoomId() ?? '')) {
                await to(decryptAllTimelineEvent(mx, fetchedTimeline));
            }

            fetching = false;
            if (alive()) {
                recalibratePagination(lTimelines, timelinesEventsCount, backwards);
            }
        };
    }, [mx, alive, setTimeline, limit]);
    return handleTimelinePagination;
};

const useLiveEventArrive = (room: Room, onArrive: (mEvent: MatrixEvent) => void) => {
    useEffect(() => {
        const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
            mEvent,
            eventRoom,
            toStartOfTimeline,
            removed,
            data
        ) => {
            if (eventRoom?.roomId !== room.roomId || !data.liveEvent) return;
            onArrive(mEvent);
        };
        const handleRedaction: RoomEventHandlerMap[RoomEvent.Redaction] = (mEvent, eventRoom) => {
            if (eventRoom?.roomId !== room.roomId) return;
            onArrive(mEvent);
        };

        room.on(RoomEvent.Timeline, handleTimelineEvent);
        room.on(RoomEvent.Redaction, handleRedaction);
        return () => {
            room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
            room.removeListener(RoomEvent.Redaction, handleRedaction);
        };
    }, [room, onArrive]);
};

const useLiveTimelineRefresh = (room: Room, onRefresh: () => void) => {
    useEffect(() => {
        const handleTimelineRefresh: RoomEventHandlerMap[RoomEvent.TimelineRefresh] = (r) => {
            if (r.roomId !== room.roomId) return;
            onRefresh();
        };

        room.on(RoomEvent.TimelineRefresh, handleTimelineRefresh);
        return () => {
            room.removeListener(RoomEvent.TimelineRefresh, handleTimelineRefresh);
        };
    }, [room, onRefresh]);
};

const getInitialTimeline = (room: Room) => {
    const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
    const evLength = getTimelinesEventsCount(linkedTimelines);
    return {
        linkedTimelines,
        range: {
            start: Math.max(evLength - PAGINATION_LIMIT, 0),
            end: evLength,
        },
    };
};

const getEmptyTimeline = () => ({
    range: { start: 0, end: 0 },
    linkedTimelines: [],
});

const getRoomUnreadInfo = (room: Room, scrollTo = false) => {
    const readUptoEventId = room.getEventReadUpTo(room.client.getUserId() ?? '');
    if (!readUptoEventId) return undefined;
    const evtTimeline = getEventTimeline(room, readUptoEventId);
    const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
    return {
        readUptoEventId,
        inLiveTimeline: latestTimeline === room.getLiveTimeline(),
        scrollTo,
    };
};

export function RoomTimeline({ room, eventId, roomInputRef, textAreaRef }: RoomTimelineProps) {
    const mx = useMatrixClient();
    const encryptedRoom = mx.isRoomEncrypted(room.roomId);
    const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
    const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
    const [hideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
    const [hideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');
    const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
    const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
    const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
    const showUrlPreview = encryptedRoom ? encUrlPreview : urlPreview;
    const [showHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
    const setReplyDraft = useSetAtom(roomIdToReplyDraftAtomFamily(room.roomId));
    const powerLevels = usePowerLevelsContext();
    const { canDoAction, canSendEvent, getPowerLevel } = usePowerLevelsAPI(powerLevels);
    const myPowerLevel = getPowerLevel(mx.getUserId() ?? '');
    const canRedact = canDoAction('redact', myPowerLevel);
    const canPin = canSendEvent(StateEvent.RoomPinnedEvents, myPowerLevel);
    const canSendReaction = canSendEvent(MessageEvent.Reaction, myPowerLevel);
    const [editId, setEditId] = useState<string>();
    const [hideTgAds] = useSetting(settingsAtom, 'extera_hideTgAds');
    const [ghostMode] = useSetting(settingsAtom, 'extera_ghostMode');
    const [smoothScroll] = useSetting(settingsAtom, 'extera_ghostMode');
    const { navigateRoom, navigateSpace } = useRoomNavigate();
    const roomToParents = useAtomValue(roomToParentsAtom);
    const unread = useRoomUnread(room.roomId, roomToUnreadAtom);

    const imagePackRooms: Room[] = useMemo(() => {
        const allParentSpaces = [room.roomId].concat(
            Array.from(getAllParents(roomToParents, room.roomId))
        );
        return allParentSpaces.reduce<Room[]>((list, rId) => {
            const r = mx.getRoom(rId);
            if (r) list.push(r);
            return list;
        }, []);
    }, [mx, room, roomToParents]);

    const [unreadInfo, setUnreadInfo] = useState(() => getRoomUnreadInfo(room, true));
    const readUptoEventIdRef = useRef<string>();
    if (unreadInfo) {
        readUptoEventIdRef.current = unreadInfo.readUptoEventId;
    }

    const atBottomAnchorRef = useRef<HTMLElement>(null);
    const [atBottom, setAtBottom] = useState<boolean>(true);
    const atBottomRef = useRef(atBottom);
    atBottomRef.current = atBottom;

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollToBottomRef = useRef({
        count: 0,
        smooth: smoothScroll,
    });

    const [focusItem, setFocusItem] = useState<
        | {
            index: number;
            scrollTo: boolean;
            highlight: boolean;
        }
        | undefined
    >();
    const alive = useAlive();

    const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
        () =>
            getReactCustomHtmlParser(mx, room, {
                handleSpoilerClick: (evt) => {
                    const target = evt.currentTarget;
                    if (target.getAttribute('aria-pressed') === 'true') {
                        evt.stopPropagation();
                        target.setAttribute('aria-pressed', 'false');
                        target.style.cursor = 'initial';
                    }
                },
                handleMentionClick: (evt) => {
                    const target = evt.currentTarget;
                    const mentionId = target.getAttribute('data-mention-id');
                    if (typeof mentionId !== 'string') return;
                    if (isUserId(mentionId)) {
                        openProfileViewer(mentionId, room.roomId);
                        return;
                    }
                    if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
                        if (mx.getRoom(mentionId)?.isSpaceRoom()) navigateSpace(mentionId);
                        else navigateRoom(mentionId);
                        return;
                    }
                    openJoinAlias(mentionId);
                },
            }),
        [mx, room, navigateRoom, navigateSpace]
    );
    const parseMemberEvent = useMemberEventParser();

    const [timeline, setTimeline] = useState<Timeline>(() =>
        eventId ? getEmptyTimeline() : getInitialTimeline(room)
    );
    const eventsLength = getTimelinesEventsCount(timeline.linkedTimelines);
    const liveTimelineLinked =
        timeline.linkedTimelines[timeline.linkedTimelines.length - 1] === getLiveTimeline(room);
    const canPaginateBack =
        typeof timeline.linkedTimelines[0]?.getPaginationToken(Direction.Backward) === 'string';
    const rangeAtStart = timeline.range.start === 0;
    const rangeAtEnd = timeline.range.end === eventsLength;
    const atLiveEndRef = useRef(liveTimelineLinked && rangeAtEnd);
    atLiveEndRef.current = liveTimelineLinked && rangeAtEnd;

    const handleTimelinePagination = useTimelinePagination(
        mx,
        timeline,
        setTimeline,
        PAGINATION_LIMIT
    );

    const getScrollElement = useCallback(() => scrollRef.current, []);

    const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
        useVirtualPaginator({
            count: eventsLength,
            limit: PAGINATION_LIMIT,
            range: timeline.range,
            onRangeChange: useCallback((r) => setTimeline((cs) => ({ ...cs, range: r })), []),
            getScrollElement,
            getItemElement: useCallback(
                (index: number) =>
                    (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
                    undefined,
                []
            ),
            onEnd: handleTimelinePagination,
        });

    const loadEventTimeline = useEventTimelineLoader(
        mx,
        room,
        useCallback(
            (evtId, lTimelines, evtAbsIndex) => {
                if (!alive()) return;
                const evLength = getTimelinesEventsCount(lTimelines);

                setFocusItem({
                    index: evtAbsIndex,
                    scrollTo: true,
                    highlight: evtId !== readUptoEventIdRef.current,
                });
                setTimeline({
                    linkedTimelines: lTimelines,
                    range: {
                        start: Math.max(evtAbsIndex - PAGINATION_LIMIT, 0),
                        end: Math.min(evtAbsIndex + PAGINATION_LIMIT, evLength),
                    },
                });
            },
            [alive]
        ),
        useCallback(() => {
            if (!alive()) return;
            setTimeline(getInitialTimeline(room));
            scrollToBottomRef.current.count += 1;
            scrollToBottomRef.current.smooth = false;
        }, [alive, room])
    );

    useLiveEventArrive(
        room,
        useCallback(
            (mEvt: MatrixEvent) => {
                // if user is at bottom of timeline
                // keep paginating timeline and conditionally mark as read
                // otherwise we update timeline without paginating
                // so timeline can be updated with evt like: edits, reactions etc
                setTimeline((ct) => ({ ...ct }));
                setUnreadInfo(getRoomUnreadInfo(room));
                if (atBottomRef.current) {
                    if (document.hasFocus()) {
                        scrollToBottomRef.current.count += 1;
                        scrollToBottomRef.current.smooth = smoothScroll;
                    }

                    if (document.hasFocus() && (!unreadInfo || mEvt.getSender() === mx.getUserId()) && !ghostMode) {
                        requestAnimationFrame(() => markAsRead(mEvt.getRoomId()));
                    }
                    setTimeline((ct) => ({
                        ...ct,
                        range: {
                            start: ct.range.start + 1,
                            end: ct.range.end + 1,
                        },
                    }));
                    return;
                }
            },
            [mx, room, unreadInfo]
        )
    );

    useResizeObserver(
        useMemo(() => {
            let mounted = false;
            return (entries) => {
                if (!mounted) {
                    // skip initial mounting call
                    mounted = true;
                    return;
                }
                if (!roomInputRef.current) return;
                const editorBaseEntry = getResizeObserverEntry(roomInputRef.current, entries);
                const scrollElement = getScrollElement();
                if (!editorBaseEntry || !scrollElement) return;

                if (atBottomRef.current) {
                    scrollToBottom(scrollElement);
                }
            };
        }, [getScrollElement, roomInputRef]),
        useCallback(() => roomInputRef.current, [roomInputRef])
    );

    useLiveTimelineRefresh(
        room,
        useCallback(() => {
            if (liveTimelineLinked) {
                setTimeline(getInitialTimeline(room));
            }
        }, [room, liveTimelineLinked])
    );

    // Stay at bottom when room editor resize
    useResizeObserver(
        useMemo(() => {
            let mounted = false;
            return (entries) => {
                if (!mounted) {
                    // skip initial mounting call
                    mounted = true;
                    return;
                }
                if (!roomInputRef.current) return;
                const editorBaseEntry = getResizeObserverEntry(roomInputRef.current, entries);
                const scrollElement = getScrollElement();
                if (!editorBaseEntry || !scrollElement) return;

                if (atBottomRef.current) {
                    scrollToBottom(scrollElement);
                }
            };
        }, [getScrollElement, roomInputRef]),
        useCallback(() => roomInputRef.current, [roomInputRef])
    );

    const tryAutoMarkAsRead = useCallback(() => {
        if (ghostMode) return;
        if (!unreadInfo) {
            requestAnimationFrame(() => markAsRead(room.roomId));
            return;
        }
        const evtTimeline = getEventTimeline(room, unreadInfo.readUptoEventId);
        const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
        if (latestTimeline === room.getLiveTimeline()) {
            requestAnimationFrame(() => markAsRead(room.roomId));
        }
    }, [room, unreadInfo]);

    const debounceSetAtBottom = useDebounce(
        useCallback((entry: IntersectionObserverEntry) => {
            if (!entry.isIntersecting) setAtBottom(false);
        }, []),
        { wait: 1000 }
    );
    useIntersectionObserver(
        useCallback(
            (entries) => {
                const target = atBottomAnchorRef.current;
                if (!target) return;
                const targetEntry = getIntersectionObserverEntry(target, entries);
                if (targetEntry) debounceSetAtBottom(targetEntry);
                if (targetEntry?.isIntersecting && atLiveEndRef.current) {
                    setAtBottom(true);
                    tryAutoMarkAsRead();
                }
            },
            [debounceSetAtBottom, tryAutoMarkAsRead]
        ),
        useCallback(
            () => ({
                root: getScrollElement(),
                rootMargin: '100px',
            }),
            [getScrollElement]
        ),
        useCallback(() => atBottomAnchorRef.current, [])
    );

    useDocumentFocusChange(
        useCallback(
            (inFocus) => {
                if (inFocus && atBottomRef.current) {
                    tryAutoMarkAsRead();
                }
            },
            [tryAutoMarkAsRead]
        )
    );

    // Handle up arrow edit
    useKeyDown(
        window,
        useCallback(
            (evt) => {
                if (
                    isKeyHotkey('arrowup', evt) &&
                    editableActiveElement() &&
                    document.activeElement?.getAttribute('data-editable-name') === 'RoomInput' &&
                    (document.activeElement as HTMLTextAreaElement).value?.length < 1
                ) {
                    const editableEvt = getLatestEditableEvt(room.getLiveTimeline(), (mEvt) =>
                        canEditEvent(mx, mEvt)
                    );
                    const editableEvtId = editableEvt?.getId();
                    if (!editableEvtId) return;
                    setEditId(editableEvtId);
                }
            },
            [mx, room, textAreaRef]
        )
    );

    useEffect(() => {
        if (eventId) {
            setTimeline(getEmptyTimeline());
            loadEventTimeline(eventId);
        }
    }, [eventId, loadEventTimeline]);

    // Scroll to bottom on initial timeline load
    useLayoutEffect(() => {
        const scrollEl = scrollRef.current;
        if (scrollEl) {
            scrollToBottom(scrollEl);
        }
    }, []);

    // if live timeline is linked and unreadInfo change
    // Scroll to last read message
    useLayoutEffect(() => {
        const { readUptoEventId, inLiveTimeline, scrollTo } = unreadInfo ?? {};
        if (readUptoEventId && inLiveTimeline && scrollTo) {
            const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
            const evtTimeline = getEventTimeline(room, readUptoEventId);
            const absoluteIndex =
                evtTimeline && getEventIdAbsoluteIndex(linkedTimelines, evtTimeline, readUptoEventId);
            if (absoluteIndex) {
                scrollToItem(absoluteIndex, {
                    behavior: 'instant',
                    align: 'start',
                    stopInView: true,
                });
            }
        }
    }, [room, unreadInfo, scrollToItem]);

    // scroll to focused message
    useLayoutEffect(() => {
        if (focusItem && focusItem.scrollTo) {
            scrollToItem(focusItem.index, {
                behavior: 'instant',
                align: 'center',
                stopInView: true,
            });
        }

        setTimeout(() => {
            if (!alive()) return;
            setFocusItem((currentItem) => {
                if (currentItem === focusItem) return undefined;
                return currentItem;
            });
        }, 2000);
    }, [alive, focusItem, scrollToItem]);

    // scroll to bottom of timeline
    const scrollToBottomCount = scrollToBottomRef.current.count;
    useLayoutEffect(() => {
        if (scrollToBottomCount > 0) {
            const scrollEl = scrollRef.current;
            if (scrollEl)
                scrollToBottom(scrollEl, scrollToBottomRef.current.smooth ? 'smooth' : 'instant');
        }
    }, [scrollToBottomCount]);

    // Remove unreadInfo on mark as read
    useEffect(() => {
        if (!unread) {
            setUnreadInfo(undefined);
        }
    }, [unread]);

    // scroll out of view msg editor in view.
    useEffect(() => {
        if (editId) {
            const editMsgElement =
                (scrollRef.current?.querySelector(`[data-message-id="${editId}"]`) as HTMLElement) ??
                undefined;
            if (editMsgElement) {
                scrollToElement(editMsgElement, {
                    align: 'center',
                    behavior: 'smooth',
                    stopInView: true,
                });
            }
        }
    }, [scrollToElement, editId]);

    const handleJumpToLatest = () => {
        setTimeline(getInitialTimeline(room));
        scrollToBottomRef.current.count += 1;
        scrollToBottomRef.current.smooth = false;
    };

    const handleJumpToUnread = () => {
        if (unreadInfo?.readUptoEventId) {
            setTimeline(getEmptyTimeline());
            loadEventTimeline(unreadInfo.readUptoEventId);
        }
    };

    const handleMarkAsRead = () => {
        markAsRead(room.roomId);
    };

    const handleOpenReply: MouseEventHandler<HTMLButtonElement> = useCallback(
        async (evt) => {
            const replyId = evt.currentTarget.getAttribute('data-reply-id');
            if (typeof replyId !== 'string') return;
            const replyTimeline = getEventTimeline(room, replyId);
            const absoluteIndex =
                replyTimeline && getEventIdAbsoluteIndex(timeline.linkedTimelines, replyTimeline, replyId);

            if (typeof absoluteIndex === 'number') {
                scrollToItem(absoluteIndex, {
                    behavior: 'smooth',
                    align: 'center',
                    stopInView: true,
                });
                setFocusItem({
                    index: absoluteIndex,
                    scrollTo: false,
                    highlight: true,
                });
            } else {
                setTimeline(getEmptyTimeline());
                loadEventTimeline(replyId);
            }
        },
        [room, timeline, scrollToItem, loadEventTimeline]
    );

    const handleUserClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            const userId = evt.currentTarget.getAttribute('data-user-id');
            if (!userId) {
                console.warn('Button should have "data-user-id" attribute!');
                return;
            }
            openProfileViewer(userId, room.roomId);
        },
        [room]
    );
    const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (evt) => {
            evt.preventDefault();
            const userId = evt.currentTarget.getAttribute('data-user-id');
            if (!userId) {
                console.warn('Button should have "data-user-id" attribute!');
                return;
            }
            const ta = textAreaRef.current;
            if (!ta) {
                console.warn('textAreaRef does not have object assigned');
                return;
            }
            ta.value += ` {${userId}}`;
        },
        [mx, room, textAreaRef]
    );

    const handleReplyId = useCallback(
        (replyId: string | null) => {
            if (!replyId) {
                console.warn('Button should have "data-event-id" attribute!');
                return;
            }
            const replyEvt = room.findEventById(replyId);
            if (!replyEvt) return;
            const editedReply = getEditedEvent(replyId, replyEvt, room.getUnfilteredTimelineSet());
            const { body, formatted_body: formattedBody }: Record<string, string> =
                editedReply?.getContent()['m.new_content'] ?? replyEvt.getContent();
            const senderId = replyEvt.getSender();
            if (senderId && typeof body === 'string') {
                setReplyDraft({
                    userId: senderId,
                    eventId: replyId,
                    body,
                    formattedBody,
                });
                // TODO focus
                textAreaRef.current?.focus();
            }
        },
        [room, setReplyDraft, textAreaRef]
    );

    const handleReactionToggle = useCallback(
        (targetEventId: string, key: string, shortcode?: string) => {
            const relations = getEventReactions(room.getUnfilteredTimelineSet(), targetEventId);
            const allReactions = relations?.getSortedAnnotationsByKey() ?? [];
            const [, reactionsSet] = allReactions.find(([k]) => k === key) ?? [];
            const reactions = reactionsSet ? Array.from(reactionsSet) : [];
            const myReaction = reactions.find(factoryEventSentBy(mx.getUserId()!));

            if (myReaction && !!myReaction?.isRelation()) {
                mx.redactEvent(room.roomId, myReaction.getId()!);
                return;
            }
            const rShortcode =
                shortcode ||
                (reactions.find(eventWithShortcode)?.getContent().shortcode as string | undefined);
            mx.sendEvent(
                room.roomId,
                MessageEvent.Reaction,
                getReactionContent(targetEventId, key, rShortcode)
            );
        },
        [mx, room]
    );
    const handleEdit = useCallback(
        (editEvtId?: string) => {
            if (editEvtId) {
                setEditId(editEvtId);
                return;
            }
            setEditId(undefined);
        },
        [textAreaRef]
    );

    const { isTouchingSide, sideMoved, sideMovedInit, swipingId, onTouchStart, onTouchMove, onTouchEnd } = useSwipeLeft(handleReplyId);

    const renderMatrixEvent = useMatrixEventRenderer<
        [string, MatrixEvent, number, EventTimelineSet, boolean]
    >(
        {
            [MessageEvent.RoomMessage]: (mEventId, mEvent, item, timelineSet, collapse) => {
                const reactionRelations = getEventReactions(timelineSet, mEventId);
                const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
                const hasReactions = reactions && reactions.length > 0;
                const { replyEventId } = mEvent;
                const highlighted = focusItem?.index === item && focusItem.highlight;

                const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
                const getContent = (() =>
                    editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent()) as GetContentCallback;

                const senderId = mEvent.getSender() ?? '';
                const senderDisplayName =
                    getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;

                // Кажется, я начинаю по-тихоньку разбираться в этом коде.
                // Вообще кайф если это первый чужой код, в котором я смог разобраться
                // OfficialDakari, 3.07.2024 20:27 (UTC+5)
                const ed = mEvent.event;
                var hideMessage = false;
                if (ed.content?.msgtype == 'm.notice' && typeof ed.content?.body === 'string') {
                    const lines = ed.content?.body.split('\n');
                    const lastLine = lines[lines.length - 1];
                    if (lastLine.startsWith('Sponsored message from ')) {
                        hideMessage = true;
                    }
                }

                if (hideMessage && hideTgAds) {
                    return (
                        <></>
                    );
                }

                return (
                    <Message
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        messageSpacing={messageSpacing}
                        messageLayout={messageLayout}
                        collapse={collapse}
                        highlight={highlighted}
                        edit={editId === mEventId}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                        canPin={canPin}
                        canSendReaction={canSendReaction}
                        imagePackRooms={imagePackRooms}
                        relations={hasReactions ? reactionRelations : undefined}
                        onUserClick={handleUserClick}
                        onUsernameClick={handleUsernameClick}
                        onReplyClick={(evt: MouseEvent) => handleReplyId(evt.currentTarget.getAttribute('data-event-id'))}
                        onTouchStart={(evt: TouchEvent) => onTouchStart(evt, mEvent.getId())}
                        onTouchMove={(evt: TouchEvent) => onTouchMove(evt, mEvent.getId())}
                        onTouchEnd={onTouchEnd}
                        style={{ transform: `translateX(${isTouchingSide && mEvent.getId() == swipingId ? clamp(sideMoved - sideMovedInit, -window.innerWidth / 2, 0) : 0}px)` }}
                        onReactionToggle={handleReactionToggle}
                        onEditId={handleEdit}
                        reply={
                            replyEventId && (
                                <Reply
                                    as="button"
                                    mx={mx}
                                    room={room}
                                    timelineSet={timelineSet}
                                    eventId={replyEventId}
                                    data-reply-id={replyEventId}
                                    onClick={handleOpenReply}
                                />
                            )
                        }
                        reactions={
                            reactionRelations && (
                                <Reactions
                                    style={{ marginTop: config.space.S200 }}
                                    room={room}
                                    relations={reactionRelations}
                                    mEventId={mEventId}
                                    canSendReaction={canSendReaction}
                                    onReactionToggle={handleReactionToggle}
                                />
                            )
                        }
                    >
                        {mEvent.isRedacted() ? (
                            <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
                        ) : (
                            <RenderMessageContent
                                displayName={senderDisplayName}
                                msgType={mEvent.getContent().msgtype ?? ''}
                                ts={mEvent.getTs()}
                                edited={!!editedEvent}
                                getContent={getContent}
                                mediaAutoLoad={mediaAutoLoad}
                                urlPreview={showUrlPreview}
                                htmlReactParserOptions={htmlReactParserOptions}
                                outlineAttachment={messageLayout === 2}
                            />
                        )}
                    </Message>
                );
            },
            [MessageEvent.RoomMessageEncrypted]: (mEventId, mEvent, item, timelineSet, collapse) => {
                const reactionRelations = getEventReactions(timelineSet, mEventId);
                const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
                const hasReactions = reactions && reactions.length > 0;
                const { replyEventId } = mEvent;
                const highlighted = focusItem?.index === item && focusItem.highlight;

                return (
                    <Message
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        messageSpacing={messageSpacing}
                        messageLayout={messageLayout}
                        collapse={collapse}
                        highlight={highlighted}
                        edit={editId === mEventId}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                        canPin={canPin}
                        canSendReaction={canSendReaction}
                        imagePackRooms={imagePackRooms}
                        relations={hasReactions ? reactionRelations : undefined}
                        onUserClick={handleUserClick}
                        onUsernameClick={handleUsernameClick}
                        onReplyClick={(evt: MouseEvent) => handleReplyId(evt.currentTarget.getAttribute('data-event-id'))}
                        onTouchStart={(evt: TouchEvent) => onTouchStart(evt, mEvent.getId())}
                        onTouchMove={(evt: TouchEvent) => onTouchMove(evt, mEvent.getId())}
                        onTouchEnd={onTouchEnd}
                        style={{ transform: `translateX(${isTouchingSide && mEvent.getId() == swipingId ? clamp(sideMoved - sideMovedInit, -window.innerWidth, 0) : 0}px)` }}
                        onReactionToggle={handleReactionToggle}
                        onEditId={handleEdit}
                        reply={
                            replyEventId && (
                                <Reply
                                    as="button"
                                    mx={mx}
                                    room={room}
                                    timelineSet={timelineSet}
                                    eventId={replyEventId}
                                    data-reply-id={replyEventId}
                                    onClick={handleOpenReply}
                                />
                            )
                        }
                        reactions={
                            reactionRelations && (
                                <Reactions
                                    style={{ marginTop: config.space.S200 }}
                                    room={room}
                                    relations={reactionRelations}
                                    mEventId={mEventId}
                                    canSendReaction={canSendReaction}
                                    onReactionToggle={handleReactionToggle}
                                />
                            )
                        }
                    >
                        <EncryptedContent mEvent={mEvent}>
                            {() => {
                                if (mEvent.isRedacted()) return <RedactedContent />;
                                if (mEvent.getType() === MessageEvent.Sticker)
                                    return (
                                        <MSticker
                                            content={mEvent.getContent()}
                                            renderImageContent={(props) => (
                                                <ImageContent
                                                    {...props}
                                                    autoPlay={mediaAutoLoad}
                                                    renderImage={(p) => <Image {...p} loading="lazy" />}
                                                    renderViewer={(p) => <ImageViewer {...p} />}
                                                />
                                            )}
                                        />
                                    );
                                if (mEvent.getType() === MessageEvent.RoomMessage) {
                                    const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
                                    const getContent = (() =>
                                        editedEvent?.getContent()['m.new_content'] ??
                                        mEvent.getContent()) as GetContentCallback;

                                    const senderId = mEvent.getSender() ?? '';
                                    const senderDisplayName =
                                        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
                                    return (
                                        <RenderMessageContent
                                            displayName={senderDisplayName}
                                            msgType={mEvent.getContent().msgtype ?? ''}
                                            ts={mEvent.getTs()}
                                            edited={!!editedEvent}
                                            getContent={getContent}
                                            mediaAutoLoad={mediaAutoLoad}
                                            urlPreview={showUrlPreview}
                                            htmlReactParserOptions={htmlReactParserOptions}
                                            outlineAttachment={messageLayout === 2}
                                        />
                                    );
                                }
                                if (mEvent.getType() === MessageEvent.RoomMessageEncrypted)
                                    return (
                                        <Text>
                                            <MessageNotDecryptedContent />
                                        </Text>
                                    );
                                return (
                                    <Text>
                                        <MessageUnsupportedContent />
                                    </Text>
                                );
                            }}
                        </EncryptedContent>
                    </Message>
                );
            },
            [MessageEvent.Sticker]: (mEventId, mEvent, item, timelineSet, collapse) => {
                const reactionRelations = getEventReactions(timelineSet, mEventId);
                const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
                const hasReactions = reactions && reactions.length > 0;
                const highlighted = focusItem?.index === item && focusItem.highlight;

                return (
                    <Message
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        messageSpacing={messageSpacing}
                        messageLayout={messageLayout}
                        collapse={collapse}
                        highlight={highlighted}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                        canPin={canPin}
                        canSendReaction={canSendReaction}
                        imagePackRooms={imagePackRooms}
                        relations={hasReactions ? reactionRelations : undefined}
                        onUserClick={handleUserClick}
                        onUsernameClick={handleUsernameClick}
                        onReplyClick={(evt: MouseEvent) => handleReplyId(evt.currentTarget.getAttribute('data-event-id'))}
                        onTouchStart={(evt: TouchEvent) => onTouchStart(evt, mEvent.getId())}
                        onTouchMove={(evt: TouchEvent) => onTouchMove(evt, mEvent.getId())}
                        onTouchEnd={onTouchEnd}
                        style={{ transform: `translateX(${isTouchingSide && mEvent.getId() == swipingId ? clamp(sideMoved - sideMovedInit, -window.innerWidth, 0) : 0}px)` }}
                        onReactionToggle={handleReactionToggle}
                        reactions={
                            reactionRelations && (
                                <Reactions
                                    style={{ marginTop: config.space.S200 }}
                                    room={room}
                                    relations={reactionRelations}
                                    mEventId={mEventId}
                                    canSendReaction={canSendReaction}
                                    onReactionToggle={handleReactionToggle}
                                />
                            )
                        }
                    >
                        {mEvent.isRedacted() ? (
                            <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
                        ) : (
                            <MSticker
                                content={mEvent.getContent()}
                                renderImageContent={(props) => (
                                    <ImageContent
                                        {...props}
                                        autoPlay={mediaAutoLoad}
                                        renderImage={(p) => <Image {...p} loading="lazy" />}
                                        renderViewer={(p) => <ImageViewer {...p} />}
                                    />
                                )}
                            />
                        )}
                    </Message>
                );
            },
            [MessageEvent.PollStartEvent]: (mEventId, mEvent, item, timelineSet, collapse) => {
                const reactionRelations = getEventReactions(timelineSet, mEventId);
                const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
                const hasReactions = reactions && reactions.length > 0;
                const highlighted = focusItem?.index === item && focusItem.highlight;

                return (
                    <Message
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        messageSpacing={messageSpacing}
                        messageLayout={messageLayout}
                        collapse={collapse}
                        highlight={highlighted}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                        canPin={canPin}
                        canSendReaction={canSendReaction}
                        imagePackRooms={imagePackRooms}
                        relations={hasReactions ? reactionRelations : undefined}
                        onUserClick={handleUserClick}
                        onUsernameClick={handleUsernameClick}
                        onReplyClick={(evt: MouseEvent) => handleReplyId(evt.currentTarget.getAttribute('data-event-id'))}
                        onTouchStart={(evt: TouchEvent) => onTouchStart(evt, mEvent.getId())}
                        onTouchMove={(evt: TouchEvent) => onTouchMove(evt, mEvent.getId())}
                        onTouchEnd={onTouchEnd}
                        style={{ transform: `translateX(${isTouchingSide && mEvent.getId() == swipingId ? clamp(sideMoved - sideMovedInit, -window.innerWidth, 0) : 0}px)` }}
                        onReactionToggle={handleReactionToggle}
                        reactions={
                            reactionRelations && (
                                <Reactions
                                    style={{ marginTop: config.space.S200 }}
                                    room={room}
                                    relations={reactionRelations}
                                    mEventId={mEventId}
                                    canSendReaction={canSendReaction}
                                    onReactionToggle={handleReactionToggle}
                                />
                            )
                        }
                    >
                        {mEvent.isRedacted() ? (
                            <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
                        ) : (
                            <MPoll
                                content={mEvent.getContent()}
                                event={mEvent}
                            />
                        )}
                    </Message>
                );
            },
            [StateEvent.RoomMember]: (mEventId, mEvent, item) => {
                const membershipChanged = isMembershipChanged(mEvent);
                if (membershipChanged && hideMembershipEvents) return null;
                if (!membershipChanged && hideNickAvatarEvents) return null;

                const highlighted = focusItem?.index === item && focusItem.highlight;
                const parsed = parseMemberEvent(mEvent);

                const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

                return (
                    <Event
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        highlight={highlighted}
                        messageSpacing={messageSpacing}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                    >
                        <EventContent
                            messageLayout={messageLayout}
                            time={timeJSX}
                            iconSrc={parsed.icon}
                            content={
                                <Box grow="Yes" direction="Column">
                                    <Text size="T300" priority="300">
                                        {parsed.body}
                                    </Text>
                                </Box>
                            }
                        />
                    </Event>
                );
            },
            [StateEvent.RoomName]: (mEventId, mEvent, item) => {
                const highlighted = focusItem?.index === item && focusItem.highlight;
                const senderId = mEvent.getSender() ?? '';
                const senderName = getMemberDisplayName(room, senderId) || senderId;

                const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

                return (
                    <Event
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        highlight={highlighted}
                        messageSpacing={messageSpacing}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                    >
                        <EventContent
                            messageLayout={messageLayout}
                            time={timeJSX}
                            iconSrc={Icons.Hash}
                            content={
                                <Box grow="Yes" direction="Column">
                                    <Text size="T300" priority="300">
                                        {translate('event.room_name', <b>{senderName}</b>)}
                                    </Text>
                                </Box>
                            }
                        />
                    </Event>
                );
            },
            [StateEvent.RoomTopic]: (mEventId, mEvent, item) => {
                const highlighted = focusItem?.index === item && focusItem.highlight;
                const senderId = mEvent.getSender() ?? '';
                const senderName = getMemberDisplayName(room, senderId) || senderId;

                const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

                return (
                    <Event
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        highlight={highlighted}
                        messageSpacing={messageSpacing}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                    >
                        <EventContent
                            messageLayout={messageLayout}
                            time={timeJSX}
                            iconSrc={Icons.Hash}
                            content={
                                <Box grow="Yes" direction="Column">
                                    <Text size="T300" priority="300">
                                        {translate('event.room_topic', <b>{senderName}</b>)}
                                    </Text>
                                </Box>
                            }
                        />
                    </Event>
                );
            },
            [StateEvent.RoomAvatar]: (mEventId, mEvent, item) => {
                const highlighted = focusItem?.index === item && focusItem.highlight;
                const senderId = mEvent.getSender() ?? '';
                const senderName = getMemberDisplayName(room, senderId) || senderId;

                const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

                return (
                    <Event
                        key={mEvent.getId()}
                        data-message-item={item}
                        data-message-id={mEventId}
                        room={room}
                        mEvent={mEvent}
                        highlight={highlighted}
                        messageSpacing={messageSpacing}
                        canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                    >
                        <EventContent
                            messageLayout={messageLayout}
                            time={timeJSX}
                            iconSrc={Icons.Hash}
                            content={
                                <Box grow="Yes" direction="Column">
                                    <Text size="T300" priority="300">
                                        {translate('event.room_avatar', <b>{senderName}</b>)}
                                    </Text>
                                </Box>
                            }
                        />
                    </Event>
                );
            },
        },
        (mEventId, mEvent, item) => {
            if (!showHiddenEvents) return null;
            const highlighted = focusItem?.index === item && focusItem.highlight;
            const senderId = mEvent.getSender() ?? '';
            const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

            const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

            return (
                <Event
                    key={mEvent.getId()}
                    data-message-item={item}
                    data-message-id={mEventId}
                    room={room}
                    mEvent={mEvent}
                    highlight={highlighted}
                    messageSpacing={messageSpacing}
                    canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                >
                    <EventContent
                        messageLayout={messageLayout}
                        time={timeJSX}
                        iconSrc={Icons.Code}
                        content={
                            <Box grow="Yes" direction="Column">
                                <Text size="T300" priority="300">
                                    {translate('timeline.unknown_state_event', <b>{senderName}</b>, <code className={customHtmlCss.Code}>{mEvent.getType()}</code>)}
                                </Text>
                            </Box>
                        }
                    />
                </Event>
            );
        },
        (mEventId, mEvent, item) => {
            if (!showHiddenEvents) return null;
            if (Object.keys(mEvent.getContent()).length === 0) return null;
            if (mEvent.getRelation()) return null;
            if (mEvent.isRedaction()) return null;

            const highlighted = focusItem?.index === item && focusItem.highlight;
            const senderId = mEvent.getSender() ?? '';
            const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

            const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

            return (
                <Event
                    key={mEvent.getId()}
                    data-message-item={item}
                    data-message-id={mEventId}
                    room={room}
                    mEvent={mEvent}
                    highlight={highlighted}
                    messageSpacing={messageSpacing}
                    canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
                >
                    <EventContent
                        messageLayout={messageLayout}
                        time={timeJSX}
                        iconSrc={Icons.Code}
                        content={
                            <Box grow="Yes" direction="Column">
                                <Text size="T300" priority="300">
                                    {translate('timeline.unknown_event', <b>{senderName}</b>, <code className={customHtmlCss.Code}>{mEvent.getType()}</code>)}
                                </Text>
                            </Box>
                        }
                    />
                </Event>
            );
        }
    );

    let prevEvent: MatrixEvent | undefined;
    let isPrevRendered = false;
    let newDivider = false;
    let dayDivider = false;
    const eventRenderer = (item: number) => {
        const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(timeline.linkedTimelines, item);
        if (!eventTimeline) return null;
        const timelineSet = eventTimeline?.getTimelineSet();
        const mEvent = getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));
        const mEventId = mEvent?.getId();

        if (!mEvent || !mEventId) return null;

        if (!newDivider && readUptoEventIdRef.current) {
            newDivider = prevEvent?.getId() === readUptoEventIdRef.current;
        }
        if (!dayDivider) {
            dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), mEvent.getTs()) : false;
        }

        const collapsed =
            isPrevRendered &&
            !dayDivider &&
            (!newDivider || mEvent.getSender() === mx.getUserId()) &&
            prevEvent !== undefined &&
            prevEvent.getSender() === mEvent.getSender() &&
            prevEvent.getType() === mEvent.getType() &&
            minuteDifference(prevEvent.getTs(), mEvent.getTs()) < 2;

        const eventJSX = reactionOrEditEvent(mEvent)
            ? null
            : renderMatrixEvent(
                mEvent.getType(),
                typeof mEvent.getStateKey() === 'string',
                mEventId,
                mEvent,
                item,
                timelineSet,
                collapsed
            );
        prevEvent = mEvent;
        isPrevRendered = !!eventJSX;

        const newDividerJSX =
            newDivider && eventJSX && mEvent.getSender() !== mx.getUserId() ? (
                <MessageBase space={messageSpacing}>
                    <TimelineDivider style={{ color: color.Success.Main }} variant="Inherit">
                        <Badge as="span" size="500" variant="Success" fill="Solid" radii="300">
                            <Text size="L400">{getText('timeline.new_messages_divider')}</Text>
                        </Badge>
                    </TimelineDivider>
                </MessageBase>
            ) : null;

        const dayDividerJSX =
            dayDivider && eventJSX ? (
                <MessageBase space={messageSpacing}>
                    <TimelineDivider variant="Surface">
                        <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
                            <Text size="L400">
                                {(() => {
                                    if (today(mEvent.getTs())) return getText('timeline.today_divider');
                                    if (yesterday(mEvent.getTs())) return getText('timeline.yesterday_divider');
                                    return timeDayMonthYear(mEvent.getTs());
                                })()}
                            </Text>
                        </Badge>
                    </TimelineDivider>
                </MessageBase>
            ) : null;

        if (eventJSX && (newDividerJSX || dayDividerJSX)) {
            if (newDividerJSX) newDivider = false;
            if (dayDividerJSX) dayDivider = false;

            return (
                <React.Fragment key={mEventId}>
                    {newDividerJSX}
                    {dayDividerJSX}
                    {eventJSX}
                </React.Fragment>
            );
        }

        return eventJSX;
    };

    return (
        <Box grow="Yes" style={{ position: 'relative' }}>
            {unreadInfo?.readUptoEventId && !unreadInfo?.inLiveTimeline && (
                <TimelineFloat position="Top">
                    <Chip
                        variant="Primary"
                        radii="Pill"
                        outlined
                        before={<Icon size="50" src={Icons.MessageUnread} />}
                        onClick={handleJumpToUnread}
                    >
                        <Text size="L400">{getText('btn.timeline.jump_to_unread')}</Text>
                    </Chip>

                    <Chip
                        variant="SurfaceVariant"
                        radii="Pill"
                        outlined
                        before={<Icon size="50" src={Icons.CheckTwice} />}
                        onClick={handleMarkAsRead}
                    >
                        <Text size="L400">{getText('btn.timeline.mark_as_read')}</Text>
                    </Chip>
                </TimelineFloat>
            )}
            <Scroll ref={scrollRef} visibility="Hover">
                <Box
                    direction="Column"
                    justifyContent="End"
                    style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
                >
                    {!canPaginateBack && rangeAtStart && getItems().length > 0 && (
                        <div
                            style={{
                                padding: `${config.space.S700} ${config.space.S400} ${config.space.S600} ${messageLayout === 1 ? config.space.S400 : toRem(64)
                                    }`,
                            }}
                        >
                            <RoomIntro room={room} />
                        </div>
                    )}
                    {(canPaginateBack || !rangeAtStart) &&
                        (messageLayout === 1 ? (
                            <>
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                                <CompactPlaceholder ref={observeBackAnchor} />
                            </>
                        ) : (
                            <>
                                <DefaultPlaceholder />
                                <DefaultPlaceholder />
                                <DefaultPlaceholder ref={observeBackAnchor} />
                            </>
                        ))}

                    {getItems().map(eventRenderer)}

                    {(!liveTimelineLinked || !rangeAtEnd) &&
                        (messageLayout === 1 ? (
                            <>
                                <CompactPlaceholder ref={observeFrontAnchor} />
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                                <CompactPlaceholder />
                            </>
                        ) : (
                            <>
                                <DefaultPlaceholder ref={observeFrontAnchor} />
                                <DefaultPlaceholder />
                                <DefaultPlaceholder />
                            </>
                        ))}
                    <span ref={atBottomAnchorRef} />
                </Box>
            </Scroll>
            {!atBottom && (
                <TimelineFloat position="Bottom">
                    <Chip
                        variant="SurfaceVariant"
                        radii="Pill"
                        outlined
                        before={<Icon size="50" src={Icons.ArrowBottom} />}
                        onClick={handleJumpToLatest}
                    >
                        <Text size="L400">{getText('btn.timeline.jump_to_latest')}</Text>
                    </Chip>
                </TimelineFloat>
            )}
        </Box>
    );
}
