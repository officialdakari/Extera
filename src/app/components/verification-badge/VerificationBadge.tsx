import React, { ReactNode, useEffect, useState } from "react";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { getLocalVerification, getVerification } from "../../utils/getVerificationState";
import { Badge, Text, Tooltip, TooltipProvider } from "folds";
import { mdiAlertCircleOutline, mdiCheck, mdiShieldAlert } from "@mdi/js";
import Icon from "@mdi/react";
import cons from "../../../client/state/cons";
import { getText } from "../../../lang";

type VerificationBadgeProps = {
    userId: string;
    userName: string;
};
export function VerificationBadge({ userId, userName }: VerificationBadgeProps) {
    const mx = useMatrixClient();
    const [verificationBadge, setVerificationBadge] = useState<ReactNode>(undefined);
    useEffect(() => {
        if (cons.scam_strings.find(x => userName.toLowerCase().includes(x))) {
            setVerificationBadge(
                <TooltipProvider
                    tooltip={
                        <Tooltip variant="Critical">
                            <Text>{getText('alert.scam')}</Text>
                        </Tooltip>
                    }
                    position="Top"
                    align="Center"
                >
                    {(triggerRef) =>
                        <Badge ref={triggerRef} radii='Pill' size='400' variant='Critical' style={{ marginLeft: '4px', verticalAlign: 'text-bottom', alignSelf: 'center', color: 'white' }}>
                            <Text size='B300'>
                                Fake
                            </Text>
                        </Badge>
                    }
                </TooltipProvider>
            );
            return;
        }
        getVerification(userId).then((state) => {
            if (state.verified || state.warning) {
                setVerificationBadge(
                    <TooltipProvider
                        tooltip={
                            <Tooltip variant={state.warning ? 'Critical' : 'Success'}>
                                <Text>{state.description ?? state.label ?? 'Verified'}</Text>
                            </Tooltip>
                        }
                        position="Top"
                        align="Center"
                    >
                        {(triggerRef) =>
                            <Badge ref={triggerRef} radii='Pill' variant={state.warning ? 'Critical' : state.source === 'homeserver' ? 'Success' : 'Primary'} style={{ marginLeft: '4px', verticalAlign: 'text-bottom', alignSelf: 'center', color: 'white' }}>
                                {state.verified && <Icon size={0.7} path={mdiCheck} />}
                                {typeof state.label === 'string' && (
                                    <Text size='B300'>
                                        {state.label}
                                    </Text>
                                )}
                            </Badge>
                        }
                    </TooltipProvider>
                );
            }
        });
    }, [mx, userId]);
    return verificationBadge;
}