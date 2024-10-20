import { styled, Toolbar } from "@mui/material";

const ProminientToolbar = styled(Toolbar)(({ theme }) => ({
    alignItems: 'flex-start',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    // Override media queries injected by theme.mixins.toolbar
    '@media all': {
        minHeight: 128,
    },
}));

export default ProminientToolbar;