# Laravel and Django

The Rails guide's shape works for any framework that runs on Linux. These notes cover what is different for Laravel and for Django. Read [the Rails guide](/docs/rails) first.

## Laravel

Serve Laravel with FrankenPHP, which is one HTTP server process. php-fpm speaks FastCGI, not HTTP, so it cannot be web on its own. Bind FrankenPHP to the socket in its Caddyfile:

```text
{
	frankenphp
	admin off
}

http:// {
	bind unix/{$CARLOS_SOCKET}
	root * /app/public
	php_server
}
```

Point the sqlite connection at the instance's database in config/database.php, and set DB_CONNECTION=sqlite with carlos env set:

```php
'database' => env('CARLOS_DB'),
```

The processes: web runs FrankenPHP, a worker runs the queue, release runs the migrations, and console runs tinker. With the database queue driver the jobs live in the same database.

```json
{
  "web": {"command": ["frankenphp", "run", "--config", "/app/Caddyfile"],
          "env": {"XDG_DATA_HOME": "/tmp", "XDG_CONFIG_HOME": "/tmp"}},
  "worker": {"command": ["php", "artisan", "queue:work"], "working_dir": "/app"},
  "release": {"command": ["php", "artisan", "migrate", "--force"], "working_dir": "/app"},
  "console": {"command": ["php", "artisan", "tinker"], "working_dir": "/app"}
}
```

Caddy keeps state in its data and config directories. Point them at /tmp with XDG_DATA_HOME and XDG_CONFIG_HOME in web's env, and turn Caddy's admin endpoint off.

For uploads, Laravel's s3 disk takes the bucket, region and keys from CARLOS_STORE_BUCKET, CARLOS_STORE_REGION, CARLOS_STORE_ACCESS_KEY and CARLOS_STORE_SECRET_KEY in config/filesystems.php.

Leave the opcache JIT off, as it is by default. opcache itself is fine.

## Django

Serve Django with Gunicorn, which binds a unix socket itself. Give it the path in gunicorn.conf.py, since commands are not run through a shell:

```python
import os

bind = "unix:" + os.environ["CARLOS_SOCKET"]
workers = 2
```

In settings.py, use the sqlite3 engine with NAME set to os.environ["CARLOS_DB"].

The processes: web runs gunicorn -c gunicorn.conf.py with your WSGI module, release runs python manage.py migrate --noinput, and console runs python manage.py shell. A worker is whatever your task queue runs. Pick one that keeps its jobs in the database, so it shares the instance's database.

Collect static files when you build the image, and serve them with WhiteNoise. They only need to be read, so the read-only image is fine.

For uploads, django-storages' S3 backend takes the bucket, region and keys from CARLOS_STORE_BUCKET, CARLOS_STORE_REGION, CARLOS_STORE_ACCESS_KEY and CARLOS_STORE_SECRET_KEY in settings.py.

Python's own JIT is off unless you build Python with it. Leave it off.
