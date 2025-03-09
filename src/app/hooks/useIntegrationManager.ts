/* eslint-disable consistent-return */
import { MatrixClient, Room } from "matrix-js-sdk";
import { confirmDialog } from "../molecules/confirm-dialog/ConfirmDialog";

type ScalarURLToken = {
    url: string;
    token: string;
};

export async function getIntegrationManagerURL(mx: MatrixClient, room: Room): Promise<ScalarURLToken | undefined> {
    // const terms = 'https://vector.im/integration-manager-privacy-notice-1';
    let token = (localStorage.scalarTokenUntil ?? 0) > Date.now() ? localStorage.scalarToken : null;
    if (!token) {
        const openIdToken = await mx.getOpenIdToken();
        const response = await fetch(`https://scalar.vector.im/api/register`, {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(openIdToken)
        });
        if (!response.ok) {
            alert('Failed to get integrations manager token!');
            return;
        }
        const { scalar_token: scalarToken } = await response.json();
        token = scalarToken;
        localStorage.scalarToken = scalarToken;
        localStorage.scalarTokenUntil = Date.now() + (openIdToken.expires_in * 1e3);
    }
    const accRes = await fetch(`https://scalar.vector.im/api/account?scalar_token=${token}&v=1.1`);
    if (!accRes.ok) {
        const { errcode } = await accRes.json();
        if (errcode === 'M_TERMS_NOT_SIGNED') {
            const termsResponse = await fetch(`https://scalar.vector.im/_matrix/integrations/v1/terms`);
            const { policies } = await termsResponse.json();
            const policiesList = Object.values(policies);
            if (await confirmDialog('Integrations', `To continue to integrations manager, you need to accept:\n\n${policiesList.map((x: any) => `${x.en.name} ${x.en.url}`).join('\n')}`, 'Accept', 'success')) {
                const acceptedTerms = mx.getAccountData('m.accepted_terms');
                await mx.setAccountData('m.accepted_terms', {
                    accepted: [
                        ...(acceptedTerms ? acceptedTerms.getContent().accepted : []),
                        ...policiesList.map((x: any) => x.en.url)
                    ]
                });
                await fetch(`https://scalar.vector.im/_matrix/integrations/v1/terms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        user_accepts: policiesList.map((x: any) => x.en.url)
                    })
                });
            }
        }
    }
    const url = `https://scalar.vector.im/?access_token=${token}&scalar_token=${token}&room_id=${encodeURIComponent(room.roomId)}&room_name=${encodeURIComponent(room.name)}&theme=dark`;
    return {
        url, token
    };
}