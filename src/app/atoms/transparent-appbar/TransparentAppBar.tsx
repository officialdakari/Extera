import { AppBar, Button, styled } from "@mui/material";
import React from "react";

const TransparentAppBar = styled(AppBar, {
    name: 'TransparentAppBar',
    slot: 'root'
})(() => ({
    background: 'transparent',
    boxShadow: 'none'
}));

export default TransparentAppBar;