import React from 'react';
import PropTypes from 'prop-types';
import './ConfirmDialog.scss';

import { openReusableDialog } from '../../../client/action/navigation';

import { Button, DialogActions, DialogContent, DialogContentText } from '@mui/material';
import { getText } from '../../../lang';

function ConfirmDialog({
    desc, actionTitle, actionType, onComplete,
}) {
    return (
        <>
            <DialogContent>
                <DialogContentText>
                    {desc}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onComplete(false)}>
                    {getText('btn.cancel')}
                </Button>
                <Button color={actionType || 'primary'} onClick={() => onComplete(true)}>
                    {actionTitle}
                </Button>
            </DialogActions>
        </>
        // <div className="confirm-dialog">
        //   <Text>{desc}</Text>
        //   <div className="confirm-dialog__btn">
        //     <Button variant={actionType} onClick={() => onComplete(true)}>{actionTitle}</Button>
        //     <Button onClick={() => onComplete(false)}>Cancel</Button>
        //   </div>
        // </div>
    );
}
ConfirmDialog.propTypes = {
    desc: PropTypes.string.isRequired,
    actionTitle: PropTypes.string.isRequired,
    actionType: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error', 'inherit', 'info']).isRequired,
    onComplete: PropTypes.func.isRequired,
};

/**
 * @param {string} title title of confirm dialog
 * @param {string} desc description of confirm dialog
 * @param {string} actionTitle title of main action to take
 * @param {'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'inherit' | 'info'} actionType type of action. default=primary
 * @return {Promise<boolean>} does it get's confirmed or not
 */
// eslint-disable-next-line import/prefer-default-export
export const confirmDialog = (title, desc, actionTitle, actionType = 'primary') => new Promise((resolve) => {
    let isCompleted = false;
    openReusableDialog(
        title,
        (requestClose) => (
            <ConfirmDialog
                desc={desc}
                actionTitle={actionTitle}
                actionType={actionType}
                onComplete={(isConfirmed) => {
                    isCompleted = true;
                    resolve(isConfirmed);
                    requestClose();
                }}
            />
        ),
        () => {
            if (!isCompleted) resolve(false);
        },
    );
});
