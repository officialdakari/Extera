import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './AuthRequest.scss';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';

import { useStore } from '../../hooks/useStore';
import { getText } from '../../../lang';
import { Alert, Button, DialogActions, DialogContent, LinearProgress, TextField } from '@mui/material';
import { Error } from '@mui/icons-material';

let lastUsedPassword;
const getAuthId = (password) => ({
    type: 'm.login.password',
    password,
    identifier: {
        type: 'm.id.user',
        user: initMatrix.matrixClient.getUserId(),
    },
});

function AuthRequest({ onComplete, makeRequest }) {
    const [status, setStatus] = useState(false);
    const mountStore = useStore();

    const inputRef = useRef(null);

    const handleForm = async (e) => {
        mountStore.setItem(true);
        e.preventDefault();
        const password = inputRef.current?.value;
        if (password.trim() === '') return;
        try {
            setStatus({ ongoing: true });
            await makeRequest(getAuthId(password));
            lastUsedPassword = password;
            if (!mountStore.getItem()) return;
            onComplete(true);
        } catch (err) {
            lastUsedPassword = undefined;
            if (!mountStore.getItem()) return;
            if (err.errcode === 'M_FORBIDDEN') {
                setStatus({ error: getText('error.auth_request') });
                return;
            }
            setStatus({ error: getText('error.auth_request.failed') });
        }
    };

    const handleChange = () => {
        setStatus(false);
    };

    return (
        <>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    label={getText('label.auth_request.password')}
                    onChange={handleChange}
                    type='password'
                    inputRef={inputRef}
                    fullWidth
                />
                {status.ongoing && <LinearProgress />}
                {status.error && (
                    <Alert icon={<Error />} severity='error'>
                        {status.error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleForm}
                    disabled={!!status.error}
                >
                    {getText('btn.auth_request.continue')}
                </Button>
            </DialogActions>
        </>
        // <div className="auth-request">
        //     <form onSubmit={handleForm}>
        //         <Input
        //             name="password"
        //             label={getText('label.auth_request.password')}
        //             type="password"
        //             onChange={handleChange}
        //             required
        //         />
        //         {status.ongoing && <Spinner size="small" />}
        //         {status.error && <Text variant="b3">{status.error}</Text>}
        //         {(status === false || status.error) && <Button variant="primary" type="submit" disabled={!!status.error}>{getText('btn.auth_request.continue')}</Button>}
        //     </form>
        // </div>
    );
}
AuthRequest.propTypes = {
    onComplete: PropTypes.func.isRequired,
    makeRequest: PropTypes.func.isRequired,
};

/**
 * @param {string} title Title of dialog
 * @param {(auth) => void} makeRequest request to make
 * @returns {Promise<boolean>} whether the request succeed or not.
 */
export const authRequest = async (title, makeRequest) => {
    try {
        const auth = lastUsedPassword ? getAuthId(lastUsedPassword) : undefined;
        await makeRequest(auth);
        return true;
    } catch (e) {
        lastUsedPassword = undefined;
        if (e.httpStatus !== 401 || e.data?.flows === undefined) return false;

        const { flows } = e.data;
        const canUsePassword = flows.find((f) => f.stages.includes('m.login.password'));
        if (!canUsePassword) return false;

        return new Promise((resolve) => {
            let isCompleted = false;
            openReusableDialog(
                title,
                (requestClose) => (
                    <AuthRequest
                        onComplete={(done) => {
                            isCompleted = true;
                            resolve(done);
                            requestClose();
                        }}
                        makeRequest={makeRequest}
                    />
                ),
                () => {
                    if (!isCompleted) resolve(false);
                },
            );
        });
    }
};

export default AuthRequest;
