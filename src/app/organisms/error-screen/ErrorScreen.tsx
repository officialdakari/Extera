import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React from "react";

export default function ErrorScreen() {
    return (
        <Dialog open>
            <DialogTitle>
                bruh
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    A fatal error has occured, see more in DevTools console.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => location.href = '/'}>Refresh</Button>
            </DialogActions>
        </Dialog>
    );
}