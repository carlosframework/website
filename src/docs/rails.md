# Run a Rails app on your own boxes

This guide takes a Rails 8 app from a Dockerfile to a running instance on boxes your account owns. The app runs from a read-only image you build on your own machine. Its web process and its job worker share one SQLite database, which the platform replicates, and uploads go to the app's own bucket.

You need Docker with buildx, the carlos CLI signed in to your console, and a fleet with at least one box. On a deployment that runs apps for other people, a rootfs app runs only on a fleet your account owns. [carlos fleets](/docs/cli#carlos-fleets) sets one up, and [Rootfs apps](/docs/rootfs) has the full contract.

The finished app is in the platform repository under examples/rails-shop. Every file this guide shows is taken from it.

## The app

Start from rails new with SQLite. Rails 8 gives you Solid Queue, Solid Cache and Solid Cable, each with a database of its own. On CARLOS an instance has one database, so all three share it.

### Puma

The platform gives the web process a unix socket to serve on, in CARLOS_SOCKET. Bind Puma to it and to nothing else. A process that listens on a TCP port instead never answers its health check.

```ruby
# config/puma.rb
threads_count = ENV.fetch("RAILS_MAX_THREADS", 3)
threads threads_count, threads_count

if ENV["CARLOS_SOCKET"]
  bind "unix://#{ENV["CARLOS_SOCKET"]}"
else
  port ENV.fetch("PORT", 3000)
end

plugin :tmp_restart
```

puma.rb reads the socket from the environment because commands are not run through a shell. Without CARLOS_SOCKET, on your laptop, it listens on port 3000 as usual.

### One database

CARLOS_DB is the path of the instance's database. It is the one file the platform replicates, and it is kept across restarts and deploys.

```yaml
# config/database.yml
production:
  primary:
    <<: *default
    database: <%= ENV["CARLOS_DB"] %>
```

Point Solid Queue, Solid Cache and Solid Cable at the same database. Remove config.solid_queue.connects_to from config/environments/production.rb, remove database: from the production section of config/cache.yml, and remove connects_to from the production section of config/cable.yml. Each then uses the primary connection.

Their tables then need migrations of their own. Copy the table definitions from db/queue_schema.rb, db/cache_schema.rb and db/cable_schema.rb into three migrations, and delete the three schema files.

```ruby
# db/migrate/20261024000001_create_solid_queue_tables.rb
    create_table "solid_queue_blocked_executions", force: :cascade do |t|
      t.bigint "job_id", null: false
      t.string "queue_name", null: false
      t.integer "priority", default: 0, null: false
      t.string "concurrency_key", null: false
      t.datetime "expires_at", null: false
      t.datetime "created_at", null: false
      t.index [ "concurrency_key", "priority", "job_id" ], name: "index_solid_queue_blocked_executions_for_release"
      t.index [ "expires_at", "concurrency_key" ], name: "index_solid_queue_blocked_executions_for_maintenance"
      t.index [ "job_id" ], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
    end
```

SQLite runs in WAL mode, so the web process and the worker can both write to the file.

### Uploads

Keep uploads out of the image and out of the database. carlos store create gives the app a bucket and puts its coordinates in the app's environment. Point Active Storage at them:

```yaml
# config/storage.yml
carlos:
  service: S3
  bucket: <%= ENV["CARLOS_STORE_BUCKET"] %>
  region: <%= ENV["CARLOS_STORE_REGION"] %>
  access_key_id: <%= ENV["CARLOS_STORE_ACCESS_KEY"] %>
  secret_access_key: <%= ENV["CARLOS_STORE_SECRET_KEY"] %>
<% if ENV["CARLOS_STORE_ENDPOINT"].present? %>
  endpoint: <%= ENV["CARLOS_STORE_ENDPOINT"] %>
  force_path_style: true
<% end %>
```

Then set config.active_storage.service = :carlos in production.rb, and add the aws-sdk-s3 gem.

### YJIT

Instances run with memory that cannot be written and executed at once, unless the release is shipped with carlos ship --jit, so YJIT cannot start without it. Rails 7.2 and later turn YJIT on by default. This app turns it off in production.rb with config.yjit = false. To keep YJIT, ship with --jit instead.

## The image

Build the image for arm64, which is what the boxes run. buildx does that on any machine, an Intel laptop included. When the image runs, its root filesystem is read-only, and only /tmp and the directory CARLOS_DB is in can be written.

```dockerfile
# Dockerfile
FROM docker.io/library/ruby:3.4-slim AS base
WORKDIR /rails
ENV RAILS_ENV=production BUNDLE_DEPLOYMENT=1 BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test BOOTSNAP_CACHE_DIR=/rails/.bootsnap
RUN apt-get update -qq && apt-get install --no-install-recommends -y libjemalloc2 libsqlite3-0 && \
    ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists/*
ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so

FROM base AS build
RUN apt-get update -qq && apt-get install --no-install-recommends -y build-essential git libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists/*
COPY Gemfile Gemfile.lock ./
RUN bundle install && rm -rf ~/.bundle "${BUNDLE_PATH}"/ruby/*/cache
COPY . .
RUN bundle exec bootsnap precompile --gemfile app/ lib/ && SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile

FROM base
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails
RUN rm -rf /rails/tmp && ln -s /tmp /rails/tmp && chmod -R a+rX /rails /usr/local/bundle
ENV BOOTSNAP_READONLY=1
```

tmp is a link to /tmp, because Rails writes pid and cache files there.

Bootsnap's cache is built into the image, and BOOTSNAP_READONLY keeps it from writing at run time.

Every file is readable by any user, because an instance does not run as root.

There is no ENTRYPOINT or CMD. The platform runs the commands processes.json names, and nothing else.

## The processes

processes.json, beside the Dockerfile, names the processes. carlos ship --processes reads it when it makes the release:

```json
{
  "web": {"command": ["bundle", "exec", "puma", "-C", "config/puma.rb"], "working_dir": "/rails"},
  "worker": {"command": ["/rails/bin/jobs"], "working_dir": "/rails"},
  "release": {"command": ["/rails/bin/rails", "db:migrate"], "working_dir": "/rails"},
  "console": {"command": ["/rails/bin/rails", "console"], "working_dir": "/rails"}
}
```

web serves requests. worker runs beside it, from the same image, with the same environment and the same database.

release runs on every deploy, before the new web starts. Here it runs the migrations.

console is the command an interactive session starts. The platform never starts it on its own.

A rootfs app is always on. To let an instance sleep when nobody uses it, ship the app's first release with carlos ship --hibernate. An instance keeps the setting it was created with.

## Check it on your machine

carlos ship --check runs the image the way a box would: a read-only root, a private /tmp, a socket, a database, and the default memory limit. It needs Docker or Podman, and says what went wrong, such as a process that listened on a port, a write outside the instance's directory, or an image built for amd64.

The check runs without your app's config and secrets, so give it placeholders for anything the app reads at boot. The sample needs a secret key and its store's coordinates:

```sh
docker buildx build --platform linux/arm64 --load -t shop:1 .
docker save -o shop.tar shop:1
carlos ship --rootfs shop.tar --processes processes.json --check \
  --env SECRET_KEY_BASE=placeholder \
  --env CARLOS_STORE_BUCKET=placeholder --env CARLOS_STORE_REGION=eu-west-1 \
  --env CARLOS_STORE_ACCESS_KEY=placeholder --env CARLOS_STORE_SECRET_KEY=placeholder
```

## Ship it

Create the app on your fleet, give it instances, a bucket and a secret key base. Then ship the image, promote it, and create the instance.

```sh
carlos apps create --app shop --place fleet/home
carlos instances enable --app shop
carlos store create --app shop
carlos secrets set --app shop SECRET_KEY_BASE=$(openssl rand -hex 64)
carlos ship --app shop --version v1 --rootfs shop.tar --processes processes.json
carlos promote --app shop v1
carlos instances create --app shop --host shop.k3x.example.com
```

A fleet needs its own secrets key before an app on it can hold a secret. `carlos store create` needs it too, because the console seals the store's credential to that key. If the fleet has none, register it with `carlos fleets secrets-key <fleet> <pubkey>`. [carlos fleets](/docs/cli#carlos-fleets) shows how.

Ship before you create the instance. An app's first release makes it a rootfs app, and an instance takes that, and whether it hibernates, from the release when it is created.

The first start runs release, which migrates the empty database, then starts web, then the worker once web answers. carlos instances list shows the instance's runtime and its workers, and carlos logs shows all three processes.

```sh
carlos instances list --app shop
carlos logs --app shop -f
```

If `carlos secrets set` or `carlos store create` says the fleet has no secrets key, register it with `carlos fleets secrets-key <fleet> <pubkey>` and run the command again. If `carlos instances list` shows a config refusal, its REASON column says what to do.

carlos run does not reach rootfs instances yet.

## Deploys and migrations

A deploy starts the new web beside the old one and moves traffic once the new one answers. release runs first, from the new image, while the old version is still serving. So a migration has to work with the code that is already running: add a column, deploy, use it, and remove the old one in a later deploy.

When a migration cannot work that way, ship that release with --swap hold. The old version stops, release runs, and the new version starts. Requests wait for a few seconds while that happens.

```sh
carlos ship --app shop --version v7 --swap hold --rootfs shop.tar --processes processes.json
```

If release fails or runs past its time limit, the deploy stops for that instance and carlos instances list says so. In a normal deploy the old version keeps serving. With --swap hold the old version has already stopped, so the instance is down until a release passes. The next deploy tries again.

Rolling back a release does not roll back the database. carlos rollback brings the previous image back, and it runs against the schema the newer release left. This is the other reason a migration should work with the code before it.

```sh
carlos rollback --app shop edge
```

During a deploy the old worker stops once the new web is healthy, and then the new worker starts. Two workers never run at once.

## When something crashes

The platform starts the app when its box starts, starts web or a worker again when it crashes, and never waits for a visitor to do it. A worker that keeps crashing is started again with a growing delay, and never takes web down with it.

## Limits

[Rootfs apps](/docs/rootfs) lists the limits. The ones a Rails app meets first: one memory limit for all its processes together, 120 seconds for web to answer after it starts, and at most four workers.
