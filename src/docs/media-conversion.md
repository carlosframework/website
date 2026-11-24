# Media conversion

A phone hands your app a video that won't play everywhere: HEVC in a `.mov`, 4K at 60 frames a second, turned on its side. Media conversion produces files for browser playback. Your app uploads the original to its own store, asks the console to convert it, and checks back until the job is done. The converted files land in the same store, and your app serves them like any other object.

## What you get

`video-720p` is the default. It makes an H.264 video, with AAC sound when the source has audio, at most 1280 by 720 in either orientation and 30 frames a second. It never scales a video up, it applies the rotation, and it converts HDR to standard range. You get three files:

- `video.mp4`, the video. It plays progressively with `Range` requests.
- `video.m3u8`, an HLS playlist over that same file, for players that want a stream.
- `poster.jpg`, a still from one second in, or from the middle of a shorter clip.

`audio-aac` takes an audio file, or the first audio track of a video, and makes one AAC file. It raises or lowers the volume as a whole and never compresses the dynamics. You get `audio.mp4`, its playlist `audio.m3u8`, and `peaks.json`, a waveform of 1,000 peaks from 0 to 255 with the duration:

```json
{"version": 1, "duration_ms": 61250, "peaks": [0, 12, 87, 140, ...]}
```

Both presets drop the original's metadata, location included.

Conversion reads MP4, MOV, 3GP, WebM and MKV, and for audio also MP3, WAV, FLAC and Ogg. It can't convert encrypted media. If your app encrypts files on the device before uploading them, convert them on the device first.

## An example

App `shop` on `shop.example.com` takes video uploads from the browser. Once, set up browser uploads and a Service credential. Then, for each upload, the app's server does four things:

```text
# once
carlos store uploads enable --app shop --origin https://shop.example.com
carlos services create --role service --app shop media
carlos secrets set --app shop CARLOS_SERVICE_TOKEN=<secret>

# per upload, on the app's server
1. presign PUT uploads/<id>.mov          -> the browser uploads to it
2. POST $CARLOS_CONSOLE/api/cli/apps/<account>/shop/media/conversions
     Authorization: Bearer $CARLOS_SERVICE_TOKEN
     {"key": "uploads/<id>.mov"}         -> 202 {id, state}
3. GET  .../media/conversions/<id>       every few seconds until done
4. store the three output keys from the answer
```

Replace `<secret>` with the secret the second command prints. If your app already has a Service credential for PDFs or scanning, use that one. `$CARLOS_CONSOLE` is your console's origin and `<account>` is your account ID.

Your app presigns the upload with its S3 library and the store credentials the platform gives it: `CARLOS_STORE_BUCKET`, `CARLOS_STORE_REGION`, `CARLOS_STORE_ACCESS_KEY` and `CARLOS_STORE_SECRET_KEY`. For a large file, use a multipart upload instead (see [Uploads from a browser](/docs/media-conversion#uploads-from-a-browser)).

With your console at [https://console.example.com](https://console.example.com), step 2 is:

```sh
curl --fail-with-body \
  --header "Authorization: Bearer $CARLOS_SERVICE_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"key": "uploads/a1b2.mov"}' \
  'https://console.example.com/api/cli/apps/{account}/shop/media/conversions'
```

Step 3 is a `GET` of `/api/cli/apps/{account}/shop/media/conversions/<id>` with the same header. When the job is done, the answer looks like this:

```json
{
  "id": "5e0b7a9c1d3f5b7d9e1a3c5e7f9b1d03",
  "state": "done",
  "key": "uploads/a1b2.mov",
  "preset": "video-720p",
  "class": "short",
  "submitted_at": "2026-11-17T10:04:05Z",
  "source": {"duration_ms": 42100, "width": 1920, "height": 1080, "video_codec": "hevc", "audio_codec": "aac"},
  "ffmpeg": "7.1",
  "outputs": [
    {"key": "derived/uploads/a1b2.mov/<etag>/video-720p/<execution>/video.mp4", "bytes": 9420311, "etag": "<etag>", "content_type": "video/mp4", "width": 1280, "height": 720},
    {"key": "derived/uploads/a1b2.mov/<etag>/video-720p/<execution>/video.m3u8", "bytes": 1204, "etag": "<etag>", "content_type": "application/vnd.apple.mpegurl"},
    {"key": "derived/uploads/a1b2.mov/<etag>/video-720p/<execution>/poster.jpg", "bytes": 48113, "etag": "<etag>", "content_type": "image/jpeg", "width": 1280, "height": 720}
  ]
}
```

Save the output keys with the upload. Your app learns them only from this answer.

## Starting a conversion

```http
POST /api/cli/apps/{account}/{app}/media/conversions
GET  /api/cli/apps/{account}/{app}/media/conversions/{id}
Authorization: Bearer <service token>
```

The `POST` body names the object, `{"key": "uploads/a1b2.mov"}`. You can add `"preset": "audio-aac"` (the default is `video-720p`) and `"class": "long"` (see [Limits](/docs/media-conversion#limits)). A new job answers `202`.

If the same object was already sent with the same preset and class, `POST` answers `200` with that job, whatever its state, and starts nothing. A failed job stays failed. To convert the file again, upload it under a new key.

Poll with `GET`. A repeated `POST` also returns the job, but each one makes the console read your store's settings and check the object in your bucket again.

The first time your app uses its store for conversion or browser uploads, the console checks the bucket. It must be named and owned the way this deployment names and owns buckets, be in the store's region, use SSE-S3 encryption, have versioning off, and carry no bucket policy, lifecycle rule or CORS rule the platform didn't write. A store made with `carlos store create` and left alone passes. A store that has ever had [versioning](/docs/cli#carlos-store-versioning) turned on can't use media conversion or browser uploads, and versioning can't be turned off. `carlos store versioning on` refuses a store that already uses either feature. A store that fails is refused with `store_unverified` and the check it failed, and is checked again on your next request.

A console running in host-claim mode doesn't offer conversion or browser uploads. It refuses both with `claims_console`.

These are the refusals. In the messages, `%s` and `%d` are filled in by the console. `429` and `503` refusals for a busy queue or account carry `Retry-After`: wait that many seconds before you try again.

| Status | Code | Message |
| --- | --- | --- |
| `503` | `claims_console` | `media conversion and browser uploads are not available on this console while it runs in host-claim mode. ask this deployment's operator` |
| `503` | `not_configured` | `media conversion is not set up on this deployment. ask this deployment's operator` |
| `400` | `bad_key` | `name the source object, as in {"key": "uploads/a1b2.mov"}. a key is at most 512 bytes, has no control characters and no "." or ".." segment, and is not under derived/` |
| `400` | `unknown_preset` | `preset is video-720p or audio-aac` |
| `400` | `unknown_class` | `class is short or long` |
| `409` | `no_store` | `%s has no object store yet. create one with carlos store create --app %s` |
| `409` | `store_unverified` | `this store cannot be used for conversion or browser uploads: %s. ask this deployment's operator to fix that, then try again` |
| `409` | `no_engine_in_region` | `conversion runs in %s, but this store is in %s. ask this deployment's operator` |
| `402` | `store_writes_denied` | `this store refuses new objects because the account is past its storage allowance. delete objects or add storage, then try again` |
| `404` | `source_not_found` | `there is no object at that key` |
| `409` | `source_unreadable` | `that object cannot be read for conversion. a scan may have found it infected` |
| `413` | `source_too_large` | `that object is empty` |
| `413` | `source_too_large` | `that object is %s. %s converts sources up to %s` |
| `503` | `engine_misconfigured` | `the conversion engine failed its safety checks, so this conversion does not start. ask this deployment's operator` |
| `402` | `plan_limit` | `this account has used %d media minutes this month, twice its monthly limit of %d. new conversions start again on the 1st of the UTC month. to convert sooner, buy a media pack or move to a larger plan` |
| `429` | `too_many_jobs` | `this account already has %d conversions waiting or running. wait for one to finish` |
| `503` | `queue_full` | `the conversion queue is full. try again in a minute` |
| `429` | `rate_limited` | `this account has asked for more than %d conversions in a minute. try again in a moment` |
| `409` | `store_changed` | `the store was replaced while this job waited. submit it again` |
| `404` | `job_not_found` | `this app has no conversion with that id` |

## Job states and errors

A job is `queued` while it waits for a place, `running` while the engine works on it, then `done` or `failed`. A failed job's answer has an `error` with a `code` and a `message`:

| Code | Message |
| --- | --- |
| `unsupported_container` | `the file is not a format conversion can read: MP4, MOV, 3GP, WebM or MKV; for audio, it also reads MP3, WAV, FLAC and Ogg` |
| `no_video` | `the file has no video track. convert it with the audio-aac preset` |
| `no_audio` | `the file has no audio track` |
| `unsupported_video_codec` | `the video codec is not one conversion can read: H.264, HEVC, VP8, VP9 or AV1` |
| `unsupported_audio_codec` | `the audio codec is not one conversion can read: AAC, Opus, Vorbis, MP3, FLAC or PCM` |
| `source_dimensions` | `the video is larger than %s` |
| `source_frame_rate` | `the video has more than %d frames a second` |
| `source_too_long` | `the file is longer than %s, the maximum for this preset` |
| `source_too_long` | `the HDR video is longer than %s, the maximum for HDR video up to 1080p` |
| `needs_long_class` | `the file is longer than %s, the most the short class converts. submit it again in the long class` |
| `needs_long_class` | `the video is above 1080p, which only the long class converts. submit the same request again with "class": "long"` |
| `allowance_exceeded` | `this account's media allowance for the month does not cover this file. buy a media pack or move to a larger plan to convert it` |
| `unreadable` | `the file could not be read. it may be damaged or cut short` |
| `output_too_large` | `a converted file would be over 5 GB, the maximum for one output` |
| `unsupported_hdr` | `this kind of HDR video cannot be converted yet` |
| `source_changed` | `the object changed after it was submitted. submit it again` |
| `source_unreadable` | `that object cannot be read for conversion. a scan may have found it infected` |
| `source_not_found` | `there is no object at that key` |
| `source_too_large` | `that object is %s. %s converts sources up to %s` |
| `grant_expired` | `the conversion ran past its one-hour window` |
| `deadline_exceeded` | `the conversion took longer than its time limit and was stopped` |
| `engine_failed` | `the conversion engine failed on this file. ask this deployment's operator` |
| `engine_unavailable` | `the conversion engine could not start. upload the file under a new key to try again` |
| `engine_lost` | `the conversion engine lost track of this job. upload the file under a new key to try again` |
| `store_changed` | `the store was replaced while this job waited. submit it again` |
| `store_writes_denied` | `this store refuses new objects because the account is past its storage allowance. delete objects or add storage, then try again` |

Encrypted files fail as `unsupported_container`. For `needs_long_class`, send the same `POST` again with `"class": "long"`. That is a new job.

## Serving

The playlist names the video by the relative URL `video.mp4`, and a player looks for it beside wherever the playlist came from. So serve the playlist from your app's own origin, next to a route for the MP4, for example `/media/<id>/video.m3u8` and `/media/<id>/video.mp4`. Never redirect the playlist.

The MP4 and the poster can go either way: proxy them from your app, passing the `Range` header through, or redirect to a presigned `GET`. The audio files work the same way.

## Uploads from a browser

A browser can upload straight to your app's store once the store allows it:

```sh
carlos store uploads enable --app shop --origin https://shop.example.com
```

This lets those origins `GET`, `HEAD` and `PUT` to the bucket and read each part's `ETag`. It also adds a rule that removes multipart uploads left unfinished for a day. An origin is `https://` and a host with no wildcard, or `http://localhost:<port>` while you develop. You can name up to 8. With no `--origin`, the command uses the app's platform hostnames as they are now and prints them. It doesn't follow later changes, so run it again when they change.

`carlos store uploads status --app shop` shows the origins and whether the bucket still has the rules. `disable` removes them.

Once a store is verified, `carlos store uploads` owns its CORS rule and its rule for unfinished multipart uploads. If someone edits those on the bucket by hand, the next `enable` or `disable` overwrites the edit.

Native apps don't need any of this. The rules are only for browsers.

One presigned `PUT` carries up to 5 GB. Above that the upload must be multipart, and for anything over a few hundred megabytes from a phone it should be:

1. Your server starts a multipart upload for the key and presigns an `UploadPart` URL for each part. Every part but the last must be at least 5 MiB.
2. The browser `PUT`s each part to its URL and reads the `ETag` header from each answer.
3. The browser sends the part numbers and ETags to your server, which completes the upload.
4. Your server sends the `POST` for that key.

If the browser gives up, your server can abort the upload. If nobody does, the bucket removes it after a day.

## Deleting

When your app deletes a source object, delete everything under `derived/<source key>/` too. The platform doesn't do it for you, and the outputs count toward your account's storage.

Destroying a store, purging an app or deleting an account stops its conversions first. Until they have all stopped, the console refuses, for example with `Conversions for “shop” are still stopping. Try again in a minute.` If your app keeps sending conversions, pause its uploads before you destroy the store, or each try can find a new one running.

## Limits

Each job runs in a class. By default the source's size picks it, and you can ask for `"class": "long"`:

| Preset | Short class is used for | Short class converts up to | Stops a short job after | Stops a long job after |
| --- | --- | --- | --- | --- |
| `video-720p` | sources up to 1 GiB | 10 minutes at or below 1080p | 15 minutes | 50 minutes |
| `audio-aac` | sources up to 256 MiB | 2 hours | 10 minutes | 50 minutes |

A video above 1080p converts only in the long class. The short class refuses it with `needs_long_class`, however short it is. A long job converts up to the preset's maximum:

| | `video-720p` | `audio-aac` |
| --- | --- | --- |
| Length, sources up to 1080p | 2 hours | 8 hours |
| Length, HDR sources up to 1080p | 75 minutes | |
| Length, sources above 1080p | 30 minutes | |
| Source size | 40 GiB | 10 GiB |
| Largest picture, frame rate | 3840x2160, 60 | |

Each converted file is at most 5 GB.

Fair use applies on every deployment. By default an account can have 20 conversions waiting or running, and send 30 a minute with bursts of 10. An account runs up to 2 short jobs and 1 long job at once, and the rest wait their turn. The deployment holds at most 200 waiting jobs. Your operator can change these numbers.

### The allowance

Your deployment can give your account a monthly allowance of media minutes, shared by its apps. Where billing is on, the account's Billing page shows the allowance and how much you've used. A minute of video up to 1080p counts as 1 media minute, a minute of video above 1080p counts as 2, and a minute of audio counts as 0.1, so 10 minutes of audio is 1 media minute.

A done job is charged for the length of its source: 1 media minute per minute for video up to 1080p, 2 for video above 1080p, and 0.1 for audio. A failed job is charged for the engine time it used: 1 media minute per minute for video, or 0.1 for audio. A failed long video job whose result says the video is above 1080p is charged at 2 media minutes per minute. If the engine loses the task record, the job is charged the full time it was allowed to run, at 1 media minute per minute for video or 0.1 for audio. A job that never starts is uncharged. While a job runs, the most it could cost is held against the allowance. A long video job is held at 2 media minutes per minute because nothing is known of the picture until the engine reads the file.

As with other monthly limits, the account's owners get a warning at 80% of the limit. At twice the monthly limit, new conversions are refused with `402` until the 1st of the UTC month, or until the account buys a media pack or moves to a larger plan. A job can also fail `allowance_exceeded` when what's left of the allowance won't cover the file. See [Plans](/docs/plans).

## Where conversion runs

Conversion runs in your store's region: the engine reads the source from your store and writes the outputs back to it there. A store in a region with no conversion engine is refused with `no_engine_in_region`. It is never converted somewhere else.
