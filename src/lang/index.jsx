import React from 'react';

const variables = {
    clientName: cons.name
};

const supported = [
    'en',
    'ru'
];

const defaultLanguage = 'en';

import ru from './ru.json';
import en from './en.json';
import cons from '../client/state/cons';

const langs = {
    ru, en
};
var lang = {};

const language = navigator.languages.map(x => x.slice(0, 2)).find(x => supported.includes(x)) ?? defaultLanguage;
lang = langs[language];

export const translate = (key, ...elements) => {
    var text = (lang[key] ?? key);
    for (const key in variables) {
        text = text.replaceAll(`<${key}>`, variables[key]);
    }
    const parts = text.split(/{\d+}/g); // Разделяем строку по шаблону {0}, {1}, и т.д.
    const els = [];

    // Добавляем текстовые части и элементы поочередно
    parts.forEach((part, index) => {
        els.push(part);
        if (index < elements.length) {
            els.push(elements[index]);
        }
    });

    return <>{els}</>;
};

export const getText = (key, ...args) => {
    var text = lang[key] ?? key;
    for (const key in variables) {
        text = text.replaceAll(`<${key}>`, variables[key]);
    }
    for (let i = 0; i < args.length; i++) {
        text = text.replaceAll(`{${i}}`, args[i]);
    }
    return text;
};