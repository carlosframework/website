# CARLOS

CARLOS runs your apps on hardware you control. A deployment is one
object-store bucket, one or more Linux hosts running the `carlos` binary,
and a DNS zone; you publish a release with `carlos ship`, and the platform
places it on instances, routes to it through a shared edge, and keeps TLS,
config, secrets and replication working underneath it.

These pages are the reference for the platform itself — the commands you
type, and what happens on a box after you type them. They assume you are
either running a deployment or shipping onto one. They do not teach Go, and
they are not a tutorial.

If you are a Carloku customer, the docs you want are at
[carloku.com](https://carloku.com). Carloku is CARLOS run for you, and it
covers the parts you actually touch without the box-side machinery these
pages spend most of their time on.
