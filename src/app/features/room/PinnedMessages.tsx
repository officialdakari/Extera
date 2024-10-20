import { EventTimeline, Room } from "matrix-js-sdk";
import React, { useMemo, useRef } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { DialogContent } from "@mui/material";
import { VirtualTile } from "../../components/virtualizer";
import AsyncLoadMessage from "./AsyncLoadMessage";
import { useVirtualizer } from "@tanstack/react-virtual";

type PinnedMessagesProps = {
    room: Room;
};
export default function PinnedMessages({ room }: PinnedMessagesProps) {
    const mx = useMatrixClient();

    const scrollRef = useRef<HTMLDivElement>(null);

    const timeline = room.getLiveTimeline();
    const state = timeline.getState(EventTimeline.FORWARDS);
    const pinnedEvents = state?.getStateEvents('m.room.pinned_events');
    const pinned = useMemo(() => pinnedEvents && pinnedEvents[0].getContent().pinned, [pinnedEvents, state, mx, room]);

    const virtualizer = useVirtualizer({
        count: pinned?.length || 0,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 40,
        overscan: 1,
    });
    const vItems = virtualizer.getVirtualItems();
    return (
        <DialogContent ref={scrollRef} sx={{ minWidth: '500px', minHeight: '300px' }}>
            <div
                style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                }}
            >
                {vItems.map((vItem, i) => {
                    const eventId = pinned[vItem.index];
                    return (
                        <VirtualTile
                            virtualItem={vItem}
                            ref={virtualizer.measureElement}
                            key={vItem.index}
                        >
                            <AsyncLoadMessage
                                room={room}
                                eventId={eventId}
                            />
                        </VirtualTile>
                    );
                })}
            </div>
        </DialogContent>
    );
}