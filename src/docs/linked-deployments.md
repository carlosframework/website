# Linked deployments

If you run CARLOS at home, say on a Raspberry Pi on your tailnet, its apps are reachable only from your tailnet. Linking the deployment to your Carloku account lets you publish chosen apps to the internet. Each published app gets a public HTTPS address on Carloku and sits behind Carloku's edge protection, while the app, its data and its deploys stay at home.

Your box makes the connection out to Carloku, so you don't open any ports on your router.

<!-- COPY: linked deployments slice 1 user guide: draft awaiting copy review (Task 10). -->

```sh
carlos link create --to https://console.carloku.com
carlos link publish shop --name blog
carlos link status
```

## What Carloku can reach

Carloku can reach the apps you publish, and nothing else. It can't reach your tailnet, your home console, or any app you haven't published. This is enforced on your box, not only on Carloku: for every request that arrives over the link, your box checks the app is still on its published list and refuses it if not. It also ignores the address a request was sent to, so a request can't be steered to another app.

Carloku also gets no control over your deployment. It can't deploy, start or stop anything, and it can't read your secrets, your data or your logs. Those stay with your home console.

## Before you link

You need:

- A home deployment that runs on one box. In this release a link works with a single box, which picks up the link by itself. A box that belongs to a fleet never does.
- A CARLOS release with link support, at home and on Carloku. If Carloku is too old, `carlos link create` says so.
- To be the home deployment's operator: the owner of its ops account, or someone named in `CARLOS_SYSTEM_OPERATORS`. Other people can't run the link commands.
- A Carloku account where you are an owner or a member. Those are the roles that can create apps.

The link's key is kept in the box's registry file, `registry.db` in its data directory (`/data` unless `CARLOS_DATA_DIR` says otherwise). That file and the `-wal` and `-shm` files beside it must not be readable by other users on the box: mode 0640. Boxes set up recently are already like this. An older box may have them at 0644, and then `carlos link create` refuses and names the file. Fix it on the box:

```sh
ls -l /data/registry.db*
sudo chmod 0640 /data/registry.db /data/registry.db-wal /data/registry.db-shm
```

Skip any of those files that doesn't exist. If a `registry.db-journal` file is there, give it 0640 too.

## Link

Run this against your home console. If carlos is signed in to more than one console on this machine, add `--console` with your home console's address.

```sh
carlos link create --to https://console.carloku.com
```

It prints a link and a code, then waits. Open the link, sign in to Carloku, and check the code matches. Carloku may ask you to confirm it's you with your passkey.

The approval page shows the name your deployment gave itself. That name came from the deployment asking, so only approve if it's the one you're linking. Choose the account to link it to under "Link it to". Only accounts where you're an owner or a member are listed. When you approve, the command at home finishes on its own and says which account it linked to.

The code lasts ten minutes. If it expires, run `carlos link create` again. A deployment links to one account at a time.

`--name` sets the name your deployment goes by on Carloku. It defaults to your home console's name.

## Publish an app

```sh
carlos link publish shop
carlos link publish shop --name blog
```

The first publishes your home app `shop` as `shop`. The second publishes it as `blog`. The command prints the public address, which has the same shape as any Carloku app's address with that name.

A published app becomes an app in your Carloku account, so it shares names with the account's other apps. If the account already has an app called `blog`, publishing as `blog` is refused; pick another name with `--name`. It also counts as one of the account's apps on its plan, so publishing is refused when the account is at its app limit. There is a daily limit on new publications too.

If more than one account on your home deployment has an app with that name, say which with `--account`.

In this release you can publish apps that have instances. These are refused for now:

- Static sites. Publishing them comes later.
- An app with a password. A link can't carry passwords yet.
- An app whose import is still being checked. Publish it once the import is done.
- An app that isn't running yet. Deploy it, then publish it.

Publishing picks one running instance of the app on your box to serve.

Your app sees the public address as the request's host, and `X-Forwarded-Proto: https`. If your framework only accepts known hosts, add the public address to its list.

Custom domains can't be attached to a published app yet. Its Carloku address keeps working.

## Unpublish

```sh
carlos link unpublish blog
```

Give the name it was published under, not the home app's name. Your box stops serving it straight away, then Carloku removes the address. The app keeps running at home.

Unpublishing restarts the link's connection. Open WebSockets and streams to your other published apps drop too, and their clients need to reconnect.

## Check on the link

```sh
carlos link status
```

This shows the account and console you're linked to, whether the connection is up (connected, reconnecting or not connected) and which box holds it, and each published app with its public address. If no box has picked up the link yet, it says so.

On Carloku, the account's Fleet tab has a Linked deployments section. Each linked deployment shows when it was linked and by whom, whether it's reachable now or when it was last seen, and its published apps with their addresses. Published apps also appear in the account's app list, marked "Served from" your deployment's name.

From the CLI, against Carloku:

```sh
carlos links ls --account shop
```

## When home is offline

If your box is off or can't reach the internet, visitors to a published app get a page from Carloku saying the app is offline right now and runs at its owner's home. The page comes with status 503 and a `Retry-After` header, so scripts and crawlers know to come back. When your box reconnects, the app answers again.

Carloku doesn't cache pages from published apps yet, so every request goes to your box and nothing is served while it's away.

Visitors can also see the offline page for a few seconds while Carloku restarts its hub, for example during a Carloku update. Your box reconnects by itself.

## Settings on Carloku

On Carloku, a published app has its overview, analytics and protection pages. You can change its protection and analytics settings there, and they apply to its traffic.

Everything else about the app is managed at home: deploys, secrets, instances, logs and rate limits. Carloku refuses those changes and tells you to make them on your home deployment.

## Rotate the key

```sh
carlos link rotate
```

This replaces the link's key, and the old key stops working. Nobody ever sees the key: it goes straight from Carloku into your registry file. Rotate it if you think it has leaked, for example if a copy of the registry file got out.

Sometimes Carloku can't finish the change straight away. The command then says Carloku still accepts the old key, and Carloku keeps trying by itself. `carlos link status` says so too, until the change is done.

Your box reconnects with the new key, so visitors may see the offline page for a moment.

## Unlink

From home:

```sh
carlos link remove
```

The published apps go offline on Carloku and keep running at home.

Sometimes Carloku records the unlink but hasn't cut the connection yet. The command then tells you so and keeps the link at home, and `carlos link status` shows it as unlinking. Carloku keeps trying by itself. Run `carlos link remove` again to finish at home.

If your box is lost or dead, unlink from Carloku instead. An owner of the account can press Unlink on the deployment's card in the Fleet tab. While Carloku is still cutting the connection, the card says "Removing" and its apps may still answer. It's gone once Carloku has finished. You can press Unlink again on a card that's still removing.

If you unlinked from the Fleet tab and the box is still around, run `carlos link remove` at home too, so it forgets the link.

## If a rotate goes wrong

If `carlos link rotate` fails partway, Carloku may already have replaced the key while your box never got the new one. Your box then holds a key Carloku no longer accepts, and your published apps show the offline page. `carlos link status` tells you Carloku no longer accepts this deployment's link.

To recover, forget the link at home, unlink it on Carloku, and link again:

```sh
carlos link remove --local
```

Then press Unlink on the deployment's card in the account's Fleet tab, and run:

```sh
carlos link create --to https://console.carloku.com
```

Publish your apps again once the new link is approved. The same three steps work whenever Carloku stops accepting the link, whatever the reason.
