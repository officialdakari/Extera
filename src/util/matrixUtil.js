import { mdiPound, mdiStarFourPoints } from '@mdi/js';
import initMatrix from '../client/initMatrix';

const WELL_KNOWN_URI = '/.well-known/matrix/client';

export async function getBaseUrl(servername) {
    let protocol = 'https://';
    if (servername.match(/^https?:\/\//) !== null) protocol = '';
    const serverDiscoveryUrl = `${protocol}${servername}${WELL_KNOWN_URI}`;
    try {
        const result = await (await fetch(serverDiscoveryUrl, { method: 'GET' })).json();

        const baseUrl = result?.['m.homeserver']?.base_url;
        if (baseUrl === undefined) throw new Error();
        return baseUrl;
    } catch (e) {
        return `${protocol}${servername}`;
    }
}

export function getUsername(userId) {
    const mx = initMatrix.matrixClient;
    const user = mx.getUser(userId);
    if (user === null) return userId;
    let username = user.rawDisplayName;
    if (typeof username === 'undefined') {
        username = userId;
    }
    return username;
}

export function getUsernameOfRoomMember(roomMember) {
    return roomMember.rawDisplayName || roomMember.userId;
}

export async function isRoomAliasAvailable(alias) {
    try {
        const result = await initMatrix.matrixClient.getRoomIdForAlias(alias);
        console.log(result);
        if (result.room_id) return false;
        return false;
    } catch (e) {
        console.error(e);
        if (e.errcode === 'M_NOT_FOUND') return true;
        return false;
    }
}

export function getPowerLabel(powerLevel) {
    if (powerLevel > 9000) return 'Goku';
    if (powerLevel > 100) return 'Founder';
    if (powerLevel === 100) return 'Admin';
    if (powerLevel >= 50) return 'Mod';
    return null;
}

export function parseReply(rawBody) {
    if (rawBody?.indexOf('>') !== 0) return null;
    let body = rawBody.slice(rawBody.indexOf('<') + 1);
    const user = body.slice(0, body.indexOf('>'));

    body = body.slice(body.indexOf('>') + 2);
    const replyBody = body.slice(0, body.indexOf('\n\n'));
    body = body.slice(body.indexOf('\n\n') + 2);

    if (user === '') return null;

    const isUserId = user.match(/^@.+:.+/);

    return {
        userId: isUserId ? user : null,
        displayName: isUserId ? null : user,
        replyBody,
        body,
    };
}

export function trimHTMLReply(html) {
    if (!html) return html;
    const suffix = '</mx-reply>';
    const i = html.indexOf(suffix);
    if (i < 0) {
        return html;
    }
    return html.slice(i + suffix.length);
}

export function joinRuleToIconSrc(joinRule, isSpace) {
    return ({
        restricted: () => (isSpace ? mdiStarFourPoints : mdiPound),
        knock: () => (isSpace ? mdiStarFourPoints : mdiPound),
        invite: () => (isSpace ? mdiStarFourPoints : mdiPound),
        public: () => (isSpace ? mdiStarFourPoints : mdiPound),
    }[joinRule]?.() || null);
}

// NOTE: it gives userId with minimum power level 50;
function getHighestPowerUserId(room) {
    const userIdToPower = room.currentState.getStateEvents('m.room.power_levels', '')?.getContent().users;
    let powerUserId = null;
    if (!userIdToPower) return powerUserId;

    Object.keys(userIdToPower).forEach((userId) => {
        if (userIdToPower[userId] < 50) return;
        if (powerUserId === null) {
            powerUserId = userId;
            return;
        }
        if (userIdToPower[userId] > userIdToPower[powerUserId]) {
            powerUserId = userId;
        }
    });
    return powerUserId;
}

export function getIdServer(userId) {
    const idParts = userId.split(':');
    return idParts[1];
}

export function getServerToPopulation(room) {
    const members = room.getMembers();
    const serverToPop = {};

    members?.forEach((member) => {
        const { userId } = member;
        const server = getIdServer(userId);
        const serverPop = serverToPop[server];
        if (serverPop === undefined) {
            serverToPop[server] = 1;
            return;
        }
        serverToPop[server] = serverPop + 1;
    });

    return serverToPop;
}

export function genRoomVia(room) {
    const via = [];
    const userId = getHighestPowerUserId(room);
    if (userId) {
        const server = getIdServer(userId);
        if (server) via.push(server);
    }
    const serverToPop = getServerToPopulation(room);
    const sortedServers = Object.keys(serverToPop).sort(
        (svrA, svrB) => serverToPop[svrB] - serverToPop[svrA],
    );
    const mostPop3 = sortedServers.slice(0, 3);
    if (via.length === 0) return mostPop3;
    if (mostPop3.includes(via[0])) {
        mostPop3.splice(mostPop3.indexOf(via[0]), 1);
    }
    return via.concat(mostPop3.slice(0, 2));
}

export async function isCrossVerified(deviceId) {
    try {
        const mx = initMatrix.matrixClient;
        const crypto = await mx.getCrypto();
        const userId = mx.getUserId();
        const status = await crypto.getDeviceVerificationStatus(userId, deviceId);
        if (!status) return null;

        console.log(status);
        return status.isVerified();
    } catch (err) {
        console.error(err);
        return null;
    }
}

export function hasCrossSigningAccountData() {
    const mx = initMatrix.matrixClient;
    const masterKeyData = mx.getAccountData('m.cross_signing.master');
    return !!masterKeyData;
}

export function getDefaultSSKey() {
    const mx = initMatrix.matrixClient;
    try {
        return mx.getAccountData('m.secret_storage.default_key').getContent().key;
    } catch {
        return undefined;
    }
}

export function getSSKeyInfo(key) {
    const mx = initMatrix.matrixClient;
    try {
        return mx.getAccountData(`m.secret_storage.key.${key}`).getContent();
    } catch {
        return undefined;
    }
}

export async function hasDevices(userId) {
    const mx = initMatrix.matrixClient;
    try {
        const usersDeviceMap = await mx.downloadKeys([userId, mx.getUserId()]);
        console.log('Has devices', userId, usersDeviceMap);
        return usersDeviceMap.get(userId).size > 0;
    } catch (e) {
        console.error("Error determining if it's possible to encrypt to all users: ", e);
        return false;
    }
}
