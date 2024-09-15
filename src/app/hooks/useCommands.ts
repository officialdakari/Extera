import { MatrixClient, Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { getDMRoomFor, isRoomAlias, isRoomId, isUserId } from '../utils/matrix';
import { hasDevices } from '../../util/matrixUtil';
import * as roomActions from '../../client/action/room';
import { useRoomNavigate } from './useRoomNavigate';
import { openHiddenRooms } from '../../client/action/navigation';
import { getText } from '../../lang';
import { initEruda } from '../utils/eruda';

export const SHRUG = '¯\\_(ツ)_/¯';
export const LENNY = '( ͡° ͜ʖ ͡°)';
export const TABLEFLIP = '(╯°□°）╯︵ ┻━┻';
export const UNFLIP = '┬──┬ ノ( ゜-゜ノ)';

export function parseUsersAndReason(payload: string): {
    users: string[];
    reason?: string;
} {
    let reason: string | undefined;
    let ids: string = payload;

    const reasonMatch = payload.match(/\s-r\s/);
    if (reasonMatch) {
        ids = payload.slice(0, reasonMatch.index);
        reason = payload.slice((reasonMatch.index ?? 0) + reasonMatch[0].length);
        if (reason.trim() === '') reason = undefined;
    }
    const rawIds = ids.split(' ');
    const users = rawIds.filter((id) => isUserId(id));
    return {
        users,
        reason,
    };
}

export type CommandExe = (payload: string) => Promise<void>;

export enum Command {
    Me = 'me',
    Notice = 'notice',
    Shrug = 'shrug',
    Lenny = 'lenny',
    TableFlip = 'tableflip',
    UnFlip = 'unflip',
    StartDm = 'startdm',
    Join = 'join',
    Invite = 'invite',
    DisInvite = 'disinvite',
    Kick = 'kick',
    Ban = 'ban',
    UnBan = 'unban',
    Ignore = 'ignore',
    UnIgnore = 'unignore',
    MyRoomNick = 'localnick',
    MyRoomAvatar = 'localavatar',
    ConvertToDm = 'converttodm',
    ConvertToRoom = 'converttoroom',
    Premium = 'premium',
    Hide = 'hide',
    UnHide = 'unhide',
    HiddenList = 'hidden',
    Eruda = 'eruda'
}

export type CommandContent = {
    name: string;
    description: string;
    exe: CommandExe;
};

export type CommandRecord = Record<Command, CommandContent>;

export const useCommands = (mx: MatrixClient, room: Room): CommandRecord => {
    const { navigateRoom } = useRoomNavigate();

    const commands: CommandRecord = useMemo(
        () => ({
            [Command.Me]: {
                name: Command.Me,
                description: getText('command.me.desc'),
                exe: async () => undefined,
            },
            [Command.Notice]: {
                name: Command.Notice,
                description: getText('command.notice.desc'),
                exe: async () => undefined,
            },
            [Command.Shrug]: {
                name: Command.Shrug,
                description: getText('command.emote.desc', SHRUG),
                exe: async () => undefined,
            },
            [Command.Lenny]: {
                name: Command.Lenny,
                description: getText('command.emote.desc', LENNY),
                exe: async () => undefined,
            },
            [Command.TableFlip]: {
                name: Command.TableFlip,
                description: getText('command.emote.desc', TABLEFLIP),
                exe: async () => undefined,
            },
            [Command.UnFlip]: {
                name: Command.UnFlip,
                description: getText('command.emote.desc', UNFLIP),
                exe: async () => undefined,
            },
            [Command.Eruda]: {
                name: Command.Eruda,
                description: 'Open mobile devtools',
                exe: async () => {
                    initEruda();
                }
            },
            [Command.StartDm]: {
                name: Command.StartDm,
                description: getText('command.startdm.desc'),
                exe: async (payload) => {
                    const rawIds = payload.split(' ');
                    const userIds = rawIds.filter((id) => isUserId(id) && id !== mx.getUserId());
                    if (userIds.length === 0) return;
                    if (userIds.length === 1) {
                        const dmRoomId = getDMRoomFor(mx, userIds[0])?.roomId;
                        if (dmRoomId) {
                            navigateRoom(dmRoomId);
                            return;
                        }
                    }
                    const devices = await Promise.all(userIds.map(hasDevices));
                    const isEncrypt = devices.every((hasDevice) => hasDevice);
                    const result = await roomActions.createDM(userIds, isEncrypt);
                    navigateRoom(result.room_id);
                },
            },
            [Command.Join]: {
                name: Command.Join,
                description: getText('command.join.desc'),
                exe: async (payload) => {
                    const rawIds = payload.split(' ');
                    const roomIds = rawIds.filter(
                        (idOrAlias) => isRoomId(idOrAlias) || isRoomAlias(idOrAlias)
                    );
                    roomIds.map((id) => roomActions.join(id));
                },
            },
            // [Command.Leave]: {
            //     name: Command.Leave,
            //     description: 'Leave current room.',
            //     exe: async (payload) => {
            //         if (payload.trim() === '') {
            //             roomActions.leave(room.roomId);
            //             return;
            //         }
            //         const rawIds = payload.split(' ');
            //         const roomIds = rawIds.filter((id) => isRoomId(id));
            //         roomIds.map((id) => roomActions.leave(id));
            //     },
            // },
            [Command.Invite]: {
                name: Command.Invite,
                description: getText('command.invite.desc'),
                exe: async (payload) => {
                    const { users, reason } = parseUsersAndReason(payload);
                    users.map((id) => roomActions.invite(room.roomId, id, reason));
                },
            },
            [Command.DisInvite]: {
                name: Command.DisInvite,
                description: getText('command.disinvite.desc'),
                exe: async (payload) => {
                    const { users, reason } = parseUsersAndReason(payload);
                    users.map((id) => roomActions.kick(room.roomId, id, reason));
                },
            },
            [Command.Kick]: {
                name: Command.Kick,
                description: getText('command.kick.desc'),
                exe: async (payload) => {
                    const { users, reason } = parseUsersAndReason(payload);
                    users.map((id) => roomActions.kick(room.roomId, id, reason));
                },
            },
            [Command.Ban]: {
                name: Command.Ban,
                description: getText('command.ban.desc'),
                exe: async (payload) => {
                    const { users, reason } = parseUsersAndReason(payload);
                    users.map((id) => roomActions.ban(room.roomId, id, reason));
                },
            },
            [Command.UnBan]: {
                name: Command.UnBan,
                description: getText('command.unban.desc'),
                exe: async (payload) => {
                    const rawIds = payload.split(' ');
                    const users = rawIds.filter((id) => isUserId(id));
                    users.map((id) => roomActions.unban(room.roomId, id));
                },
            },
            [Command.Ignore]: {
                name: Command.Ignore,
                description: getText('command.ignore.desc'),
                exe: async (payload) => {
                    const rawIds = payload.split(' ');
                    const userIds = rawIds.filter((id) => isUserId(id));
                    if (userIds.length > 0) roomActions.ignore(userIds);
                },
            },
            [Command.UnIgnore]: {
                name: Command.UnIgnore,
                description: getText('command.unignore.desc'),
                exe: async (payload) => {
                    const rawIds = payload.split(' ');
                    const userIds = rawIds.filter((id) => isUserId(id));
                    if (userIds.length > 0) roomActions.unignore(userIds);
                },
            },
            [Command.MyRoomNick]: {
                name: Command.MyRoomNick,
                description: getText('command.localnick.desc'),
                exe: async (payload) => {
                    const nick = payload.trim();
                    if (nick === '') return;
                    roomActions.setMyRoomNick(room.roomId, nick);
                },
            },
            [Command.MyRoomAvatar]: {
                name: Command.MyRoomAvatar,
                description: getText('command.localavatar.desc'),
                exe: async (payload) => {
                    if (payload.match(/^mxc:\/\/\S+$/)) {
                        roomActions.setMyRoomAvatar(room.roomId, payload);
                    }
                },
            },
            [Command.ConvertToDm]: {
                name: Command.ConvertToDm,
                description: getText('command.converttodm.desc'),
                exe: async () => {
                    roomActions.convertToDm(room.roomId);
                },
            },
            [Command.ConvertToRoom]: {
                name: Command.ConvertToRoom,
                description: getText('command.converttoroom.desc'),
                exe: async () => {
                    roomActions.convertToRoom(room.roomId);
                },
            },
            [Command.Premium]: {
                name: Command.Premium,
                description: getText('command.premium.desc'),
                exe: async () => {
                    window.open('https://youtu.be/dQw4w9WgXcQ', '_blank');
                }
            },
            [Command.Hide]: {
                name: Command.Hide,
                description: getText('command.hide.desc'),
                exe: async () => {
                    const hideDataEvent = mx.getAccountData('xyz.extera.hidden_chats');
                    const hidden_chats = hideDataEvent ? hideDataEvent.getContent().hidden_chats : {};
                    hidden_chats[room.roomId] = true;
                    mx.setAccountData('xyz.extera.hidden_chats', {
                        hidden_chats
                    });
                }
            },
            [Command.UnHide]: {
                name: Command.UnHide,
                description: getText('command.unhide.desc'),
                exe: async () => {
                    const hideDataEvent = mx.getAccountData('xyz.extera.hidden_chats');
                    const hidden_chats = hideDataEvent ? hideDataEvent.getContent().hidden_chats : {};
                    hidden_chats[room.roomId] = false;
                    mx.setAccountData('xyz.extera.hidden_chats', {
                        hidden_chats
                    });
                }
            },
            [Command.HiddenList]: {
                name: Command.HiddenList,
                description: getText('command.hiddenlist.desc'),
                exe: async () => {
                    openHiddenRooms();
                }
            }
        }),
        [mx, room, navigateRoom]
    );

    return commands;
};
