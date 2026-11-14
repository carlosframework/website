# CARLOS

CARLOS runs your apps on hardware you control. A deployment is one
object-store bucket, one or more Linux hosts running the `carlos` binary,
and a DNS zone; you put a release live with `carlos deploy`, and the platform
places it on instances, routes to it through a shared edge, and keeps TLS,
config, secrets and replication working underneath it.

These pages cover the platform. They explain how it works, how to run a deployment, and how to ship apps onto one. Use the tutorials and guides for step-by-step help. Use the reference to find commands.

If you are a Carloku customer, the docs you want are at
[carloku.com](https://carloku.com). Carloku is CARLOS run for you, and it
covers the parts you actually touch without the box-side machinery these
pages spend most of their time on.
