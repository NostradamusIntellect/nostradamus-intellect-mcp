# Security

This package only reads public, unauthenticated JSON from `https://nostradamusintellect.com` over HTTPS. It holds no
keys, writes nothing, and has no dependencies.

If you find a security problem — in this code, in the public endpoints it reads, or on the site — please write to
[nostradamusintellect@proton.me](mailto:nostradamusintellect@proton.me) rather than opening a public issue. We answer,
fix, and credit the report if you wish.

`NI_BASE_URL` changes the origin the tools read from. Point it only at an origin you trust.
