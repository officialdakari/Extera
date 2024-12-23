import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React from "react";
import { useRouteError } from "react-router-dom";

export default function ErrorScreen() {
    const error = useRouteError() as Error;
    return (
        <Dialog open>
            <DialogTitle>
                Ooops...
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    A fatal error has occured, see more in DevTools console.
                </DialogContentText>
                <Accordion>
                    <AccordionSummary>View error</AccordionSummary>
                    <AccordionDetails>
                        <pre>
                            <code>
                                {error.stack}
                            </code>
                        </pre>
                    </AccordionDetails>
                </Accordion>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => location.href = '/'}>Refresh</Button>
            </DialogActions>
        </Dialog>
    );
}