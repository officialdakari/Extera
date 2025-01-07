import { LoadingButton } from "@mui/lab";
import { Button, styled } from "@mui/material";

const ActionListButton = styled(Button, {
    name: 'ActionListButton',
    slot: 'root'
})(({ theme }) => ({
    textTransform: 'none',
    width: '100%',
    justifyContent: 'flex-start',
    paddingLeft: theme.spacing(2)
}));

const LoadingActionListButton = styled(LoadingButton, {
    name: 'ActionListButton',
    slot: 'root'
})(({ theme }) => ({
    textTransform: 'none',
    width: '100%',
    justifyContent: 'flex-start',
    paddingLeft: theme.spacing(2)
}));

export default ActionListButton;
export { LoadingActionListButton };