import { getSecret } from "../../client/state/auth";
import cons from "../../client/state/cons";
import { useMatrixClient } from "../hooks/useMatrixClient";

type VerificationState = {
    verified: boolean;
    warning?: boolean;
    label?: string;
    description?: string;
};

var localVerification: Record<string, VerificationState | string | boolean> | undefined;
export async function getLocalVerification(mxId: string | undefined): Promise<VerificationState | undefined> {
    const { userId } = getSecret();
    const domain = userId?.split(':')[1];
    if (!domain) return { verified: false };
    if (!mxId) return { verified: false };
    if (!localVerification) {
        const f = await fetch(`https://${domain}/.well-known/extera/verified.json`);
        if (f.ok) {
            localVerification = await f.json();
        } else if (f.status !== 404) {
            localVerification = {}; // assume homeserver does not support extera local verification
        }
    }
    return (localVerification && localVerification[mxId]) ? {
        verified: localVerification[mxId] ? true : false,
        label: typeof localVerification[mxId] === 'object' ? (typeof localVerification[mxId].label === 'string' ? localVerification[mxId].label : undefined) : typeof localVerification[mxId] === 'string' ? localVerification[mxId] : undefined,
        description: typeof localVerification[mxId] === 'object' ? (typeof localVerification[mxId].description === 'string' ? localVerification[mxId].description : undefined) : undefined
    } : undefined;
}

// FYI, ECS stands for "Extera Cloud Services"
// Why cloud? because it sounds cool. Actually it runs on a Beelink
var ecsVerification: Record<string, VerificationState | string | boolean> = {};
export async function getECSVerification(mxId: string | undefined): Promise<VerificationState> {
    if (!mxId) return { verified: false };
    if (!ecsVerification[mxId]) {
        // ECS may be down
        try {
            const f = await fetch(`${cons.ecs_base_url}/badge/${mxId}`);
            ecsVerification[mxId] = await f.json();
        } catch (error) {
            ecsVerification[mxId] = false;
        }
    }
    return ecsVerification[mxId] ? {
        verified: ecsVerification[mxId] ? true : false,
        label: typeof ecsVerification[mxId] === 'object' ? (typeof ecsVerification[mxId].label === 'string' ? ecsVerification[mxId].label : undefined) : typeof ecsVerification[mxId] === 'string' ? ecsVerification[mxId] : undefined,
        description: typeof ecsVerification[mxId] === 'object' ? (typeof ecsVerification[mxId].description === 'string' ? ecsVerification[mxId].description : undefined) : undefined
    } : {
        verified: false
    };
}

export async function getVerification(mxId: string | undefined): Promise<VerificationState> {
    return (await getLocalVerification(mxId)) ?? (await getECSVerification(mxId));
}