# Profile banners
When setting profile banner, Extera stores account data event `ru.officialdakari.extera_profile`.
It's content looks like this:
```json
{
    "banner_url": "mxc://example.com/banner"
}
```
When user opens a room, Extera updates `m.room.member` if it was not updated. All fields from `ru.officialdakari.extera_profile` is appended to `m.room.member`, but every key becomes `xyz.extera.$key`

### Getting user banner from m.room.member
Extera adds custom field to `m.room.member` - `xyz.extera.banner_url`.
So `m.room.member` content will look like that:
```json
{
    "avatar_url": "mxc://officialdakari.ru/slemrxtUERwSCLINehUdKiZk",
    "displayname": "OfficialDakari",
    "membership": "join",
    "xyz.extera.banner_url": "mxc://officialdakari.ru/EXFmaeTEsbQMSHPPfFEaRlLr"
}
```