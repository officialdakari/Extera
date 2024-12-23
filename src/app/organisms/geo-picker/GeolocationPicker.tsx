import { Dialog, DialogTitle } from "@mui/material";
import { Room } from "matrix-js-sdk";
import React from "react";
import { getText } from "../../../lang";

type GeolocationPickerProps = {
    room: Room;
    open: boolean;
    requestClose: () => void;
};
export function GeolocationPicker({ room, open, requestClose }: GeolocationPickerProps) {

    return (
        <Dialog
            open={open}
            onClose={requestClose}
        >
            <DialogTitle>
                {getText('title.send_geo', room.name)}
            </DialogTitle>
        </Dialog>
    );
}