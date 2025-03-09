import React from "react";

type WidgetIFrameProps = {
    url: string;
    roomId: string;
    eventId: string;
    roomName: string;
    widgetName: string;
};

export default function WidgetIFrame({ url, roomId, eventId, roomName, widgetName }: WidgetIFrameProps) {
    return (
        <iframe
            style={{ border: 'none', width: '100%', height: '100%' }}
            allow="autoplay; camera; clipboard-write; compute-pressure; display-capture; hid; microphone; screen-wake-lock"
            allowFullScreen
            data-widget-room-id={roomId}
            data-widget-event-id={eventId}
            data-widget-name={widgetName}
            data-widget-room-name={roomName}
            data-widget
            src={url}
            title={widgetName || 'Widget'}
        />
    );
}