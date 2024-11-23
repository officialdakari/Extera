const cons = {
    name: 'Extera',
    app_id: 'ru.officialdakari.extera',
    // the random letters are current date (DDMMYYYY) in 36-richered number system
    // for example, at the moment of writing this comment it's 21st november 2024
    // so, 21112024 in 36-richered number system is CKI54
    //     DDMMYYYY
    version: '1.0-DEV-DRDCO',
    secretKey: {
        ACCESS_TOKEN: 'cinny_access_token',
        DEVICE_ID: 'cinny_device_id',
        USER_ID: 'cinny_user_id',
        BASE_URL: 'cinny_hs_base_url',
    },
    DEVICE_DISPLAY_NAME: 'Extera Chat',
    IN_CINNY_SPACES: 'xyz.extera.spaces',
    IGNORE_POLICIES: 'xyz.extera.mscxxxx.ignored_users',
    EXTERA_BANNER_URL: 'xyz.extera.banner_url',
    supportEventTypes: [
        'm.room.create',
        'm.room.message',
        'm.room.encrypted',
        'm.room.member',
        'm.sticker',
    ],
    supportReceiptTypes: [
        'm.read',
        'm.read.private',
    ],
    notifs: {
        DEFAULT: 'default',
        ALL_MESSAGES: 'all_messages',
        MENTIONS_AND_KEYWORDS: 'mentions_and_keywords',
        MUTE: 'mute',
    },
    status: {
        PRE_FLIGHT: 'pre-flight',
        IN_FLIGHT: 'in-flight',
        SUCCESS: 'success',
        ERROR: 'error',
    },
    actions: {
        navigation: {
            OPEN_SPACE_SETTINGS: 'OPEN_SPACE_SETTINGS',
            OPEN_SPACE_ADDEXISTING: 'OPEN_SPACE_ADDEXISTING',
            TOGGLE_ROOM_SETTINGS: 'TOGGLE_ROOM_SETTINGS',
            OPEN_CREATE_ROOM: 'OPEN_CREATE_ROOM',
            OPEN_JOIN_ALIAS: 'OPEN_JOIN_ALIAS',
            OPEN_INVITE_USER: 'OPEN_INVITE_USER',
            OPEN_PROFILE_VIEWER: 'OPEN_PROFILE_VIEWER',
            OPEN_SETTINGS: 'OPEN_SETTINGS',
            OPEN_SEARCH: 'OPEN_SEARCH',
            OPEN_REUSABLE_CONTEXT_MENU: 'OPEN_REUSABLE_CONTEXT_MENU',
            OPEN_REUSABLE_DIALOG: 'OPEN_REUSABLE_DIALOG',
            OPEN_EMOJI_VERIFICATION: 'OPEN_EMOJI_VERIFICATION',
            OPEN_NAVIGATION: 'OPEN_NAVIGATION',
            OPEN_HIDDEN_ROOMS: 'OPEN_HIDDEN_ROOMS',
            OPEN_SHARE_MENU: 'OPEN_SHARE_MENU',
        },
        settings: {
            TOGGLE_SYSTEM_THEME: 'TOGGLE_SYSTEM_THEME',
            TOGGLE_MARKDOWN: 'TOGGLE_MARKDOWN',
            TOGGLE_PEOPLE_DRAWER: 'TOGGLE_PEOPLE_DRAWER',
            TOGGLE_MEMBERSHIP_EVENT: 'TOGGLE_MEMBERSHIP_EVENT',
            TOGGLE_NICKAVATAR_EVENT: 'TOGGLE_NICKAVATAR_EVENT',
            TOGGLE_NOTIFICATIONS: 'TOGGLE_NOTIFICATIONS',
            TOGGLE_NOTIFICATION_SOUNDS: 'TOGGLE_NOTIFICATION_SOUNDS',
        },
    },
    events: {
        navigation: {
            SPACE_SETTINGS_OPENED: 'SPACE_SETTINGS_OPENED',
            SPACE_ADDEXISTING_OPENED: 'SPACE_ADDEXISTING_OPENED',
            ROOM_SETTINGS_TOGGLED: 'ROOM_SETTINGS_TOGGLED',
            CREATE_ROOM_OPENED: 'CREATE_ROOM_OPENED',
            JOIN_ALIAS_OPENED: 'JOIN_ALIAS_OPENED',
            INVITE_USER_OPENED: 'INVITE_USER_OPENED',
            SETTINGS_OPENED: 'SETTINGS_OPENED',
            SEARCH_OPENED: 'SEARCH_OPENED',
            REUSABLE_CONTEXT_MENU_OPENED: 'REUSABLE_CONTEXT_MENU_OPENED',
            REUSABLE_DIALOG_OPENED: 'REUSABLE_DIALOG_OPENED',
            EMOJI_VERIFICATION_OPENED: 'EMOJI_VERIFICATION_OPENED',
            HIDDEN_ROOMS_OPENED: 'HIDDEN_ROOMS_OPENED',
            SHARE_MENU_OPENED: 'SHARE_MENU_OPENED',
        },
        notifications: {
            NOTI_CHANGED: 'NOTI_CHANGED',
            FULL_READ: 'FULL_READ',
            MUTE_TOGGLED: 'MUTE_TOGGLED',
        },
        settings: {
            SYSTEM_THEME_TOGGLED: 'SYSTEM_THEME_TOGGLED',
            THEME_CHANGED: 'THEME_CHANGED',
            MARKDOWN_TOGGLED: 'MARKDOWN_TOGGLED',
            PEOPLE_DRAWER_TOGGLED: 'PEOPLE_DRAWER_TOGGLED',
            MEMBERSHIP_EVENTS_TOGGLED: 'MEMBERSHIP_EVENTS_TOGGLED',
            NICKAVATAR_EVENTS_TOGGLED: 'NICKAVATAR_EVENTS_TOGGLED',
            NOTIFICATIONS_TOGGLED: 'NOTIFICATIONS_TOGGLED',
            NOTIFICATION_SOUNDS_TOGGLED: 'NOTIFICATION_SOUNDS_TOGGLED',
        },
    },
    ecs_base_url: 'https://ecs.extera.xyz',
    scam_strings: [
        'verif',
        '✔️',
        '✅',
        '☑️',
        '✓',
        '✔',
        '⍻',
        '🗸',
        '🗹',
        '🮱',
        '☐',
        '☑'
    ],
    avatarStyles: {
        'online': {
            borderStyle: 'solid',
            borderWidth: '2px',
            borderColor: '#079d16',
            borderRadius: '50%'
        },
        'offline': {
            borderStyle: 'solid',
            borderWidth: '2px',
            borderColor: '#737373',
            borderRadius: '50%'
        },
        'unavailable': {
            borderStyle: 'solid',
            borderWidth: '2px',
            borderColor: '#b9a12d',
            borderRadius: '50%'
        }
    },
    trustedDomains: [
        'extera.xyz',
        'matrix.org',
        'officialdakari.ru'
    ]
};

Object.freeze(cons);

export default cons;
