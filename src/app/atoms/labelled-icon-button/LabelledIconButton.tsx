import { Button, styled } from "@mui/material";
import React from "react";

const LabelledIconButton = styled(Button, {
    name: 'LabelledIconButton',
    slot: 'root'
})(({ theme }) => ({
    flexDirection: 'column',
    textTransform: 'none',
    color: theme.palette.text.primary,
    ' > .MuiButton-startIcon': {
        marginRight: 0
    }
}));

export default LabelledIconButton;