# Verification
Verification object can be a string, boolean or object like this:
```json
{
    "verified": true,
    "warning": false,
    "label": "Dev",
    "description": "This user is a developer or maintainer of Extera."
}
```
Label is text displayed next to check mark. Description is text in tooltip of check mark. Both are optional.
`warning` is for "Fake" sign. Fake sign is also shown when there is a check mark emoji in username.
Local verification is a file, at `https://HOMESERVER_DOMAIN/.well-known/extera/verified.json`. It looks like this:
```
{
    "@telegrambot:officialdakari.ru": "Bridge",
    "@whatsappbot:officialdakari.ru": "Bridge"
}
```
ECS (remote) verification is a GET request to `https://extera-cloud-services.officialdakari.ru/badge/:userId`. It returns a verification object.