import { randomNumberBetween } from "../app/utils/common";

const alphabet = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890';
export function generateConferenceID() {
    let id = '';
    for (let i = 0; i < 24; i++) {
        id += alphabet[randomNumberBetween(0, alphabet.length - 1)];
    }
    return id;
}