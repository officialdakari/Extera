import React, { ReactNode, useEffect, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { getLocalVerification, getVerification } from "../../utils/getVerificationState";
import { mdiAlertCircleOutline, mdiCheck, mdiShieldAlert } from "@mdi/js";
import Icon from "@mdi/react";
import cons from "../../../client/state/cons";
import { getText } from "../../../lang";
import { Chip, Tooltip, Typography, useTheme } from "@mui/material";
import { Check, ErrorOutlineSharp } from "@mui/icons-material";
import { Box } from "folds";

import * as css from './VerificationBadge.css';

type VerificationBadgeProps = {
    userId: string;
    userName: string;
};
type VerificationState = {
    fake?: boolean;
    verified?: boolean;
    label?: string;
    tooltip?: string;
};

export function VerificationBadge({ userId, userName }: VerificationBadgeProps) {
    const mx = useMatrixClient();
    const theme = useTheme();
    const [verificationBadge, setVerificationBadge] = useState<VerificationState>({});
    useEffect(() => {
        if (cons.scam_strings.find(x => userName.toLowerCase().includes(x))) {
            setVerificationBadge({
                fake: true,
                label: 'Fake'
            });
            return;
        }
        getVerification(userId).then((state) => {
            if (state.verified || state.warning) {
                setVerificationBadge({
                    fake: state.warning,
                    label: state.label,
                    tooltip: state.description,
                    verified: state.verified
                });
            }
        });
    }, [mx, userId]);

    return (verificationBadge.fake || verificationBadge.verified) && (
        <Tooltip title={verificationBadge.tooltip || false}>
            <Box
                className={css.VerificationBadge}
                style={{
                    backgroundColor: verificationBadge.verified
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                    color: verificationBadge.verified
                        ? theme.palette.success.contrastText
                        : theme.palette.error.contrastText
                }}
            >
                <div className={css.VerificationBadgeDiv}>
                    <Icon
                        size={0.7}
                        path={verificationBadge.verified ? mdiCheck : mdiAlertCircleOutline}
                        style={{
                            marginTop: '0.2rem'
                        }}
                    />
                    <Typography variant='subtitle2'>
                        {verificationBadge.label}
                    </Typography>
                </div>
            </Box>
        </Tooltip>
    );
}