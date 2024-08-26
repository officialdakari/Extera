# Profile banners
When setting profile banner, Extera stores account data event `ru.officialdakari.extera_profile`.
It's content looks like this:
```json
{
    "banner_url": "mxc://example.com/banner"
}
```
When user opens a room, Extera updates `m.room.member` with banner if it was not updated.

### Getting user banner from m.room.member
Extera adds custom field to `m.room.member` - `ru.officialdakari.extera_banner`.
So `m.room.member` content will look like that:
```json
{
    "avatar_url": "mxc://officialdakari.ru/slemrxtUERwSCLINehUdKiZk",
    "displayname": "OfficialDakari",
    "membership": "join",
    "ru.officialdakari.extera_banner": "mxc://officialdakari.ru/EXFmaeTEsbQMSHPPfFEaRlLr"
}
```