# Live streams with your own LiveKit

Your app can run a live stream with chat on your own [LiveKit Cloud](https://livekit.io) project. One person streams, viewers watch and chat, and LiveKit records the stream into your app's own store. Then your app converts the recording with [media conversion](/docs/media-conversion) and plays it back like any other upload.

The platform does not run LiveKit for you here. Your app holds its own LiveKit key, talks to LiveKit Cloud directly, and LiveKit bills your own LiveKit account.

## Before you start

You need:

- A LiveKit Cloud project. Its settings page gives you the project URL, such as `wss://shop-a1b2c3.livekit.cloud`, and an API key and secret.
- An object store for the app, made with `carlos store create --app shop`, on a deployment with media conversion turned on. The store must pass the check on the media conversion page. A store made with `carlos store create` and left alone passes.
- A Service credential for media conversion, as in [the media conversion example](/docs/media-conversion#an-example). Once write credentials are on, use that credential to get a write credential for each recording.
- Write credentials turned on for your deployment. Your operator does that. While write credentials are off, the `--write` and `--revoke` forms and their API routes return `503` with one of two codes. `write_credentials_not_configured` means your deployment hasn't turned them on. `write_credentials_not_released` means the deployment has them turned on, but this console release cannot issue them yet. Until they're on, record with the store's own credential instead, as in [Until write credentials are on](#until-write-credentials-are-on).
- CLI v0.43.8 or later for `carlos store credential`. An older CLI doesn't know the command and prints the `carlos store` usage instead.

What the platform needs from your app:

- **No egress setting.** Instances can already reach public addresses, and LiveKit Cloud's API and project hosts are public. `carlos apps set --egress-allow` is only for private addresses, and it takes IP addresses, not hostnames.
- **A public route for LiveKit's webhook.** LiveKit calls your app when a recording is done. Any path on your app's own hostname works, such as `https://shop.example.com/livekit/webhook`. A host behind [carlos gate](/docs/cli#carlos-gate) can't receive it, because the gate asks every request for the password.
- **The store's region in every recording request.** If you leave both the region and endpoint out, LiveKit asks S3 for the bucket's location, and a write credential isn't allowed to ask. The platform gives you the region with the credential.
- **No tags on recordings.** LiveKit can tag the files it uploads. Leave that empty: a write credential can't tag objects, so S3 refuses the upload.

## How it fits together

```text
# once
carlos env set --app shop LIVEKIT_URL=wss://shop-a1b2c3.livekit.cloud
carlos secrets set --app shop LIVEKIT_API_KEY=APIa1b2c3d4
carlos secrets set --app shop LIVEKIT_API_SECRET - < livekit-secret.txt
carlos env set --app shop CARLOS_CONSOLE=https://console.example.com
carlos env set --app shop CARLOS_ACCOUNT=<account>
add https://shop.example.com/livekit/webhook as a webhook in the LiveKit project

# per stream, on the app's server
1. mint a token for the streamer and one for each viewer    -> the browsers join the room
2. ask the platform for a write credential                  -> it can only upload to recordings/<id>/
3. start an Egress with it                                  -> LiveKit records the room
4. LiveKit POSTs egress_ended to /livekit/webhook           -> the recording's key
5. POST the key to media conversion, poll until done        -> the files to play
```

The API key and secret are secrets, so they go in with `carlos secrets set`. The `-` reads the secret from the file, so it never appears on your command line. The project URL isn't secret. Your browser code needs it too. `CARLOS_CONSOLE` is your console's origin and `<account>` is your account ID, as on the media conversion page.

The examples below are in Go, with LiveKit's server SDK (`github.com/livekit/server-sdk-go/v2`, checked against v2.20.1) and its protocol package (`github.com/livekit/protocol`, v1.54.1). LiveKit's other server SDKs have the same calls.

## Tokens for the streamer and the viewers

A browser joins a LiveKit room with a token your server signs. Every token names the room, a participant identity and what that participant may do. Use your own user ID as the identity, so each person appears once.

```go
import (
	"os"
	"time"

	"github.com/livekit/protocol/auth"
)

// joinToken lets one person into a stream's room. The streamer may publish
// a camera and microphone; viewers only watch. Everyone may chat.
func joinToken(room, identity, name string, streamer bool) (string, error) {
	grant := &auth.VideoGrant{RoomJoin: true, Room: room}
	grant.SetCanSubscribe(true)
	grant.SetCanPublish(streamer)
	grant.SetCanPublishData(true)
	return auth.NewAccessToken(os.Getenv("LIVEKIT_API_KEY"), os.Getenv("LIVEKIT_API_SECRET")).
		SetVideoGrant(grant).
		SetIdentity(identity).
		SetName(name).
		SetValidFor(10 * time.Minute).
		ToJWT()
}
```

Set the chat permission even for viewers. If you leave it out, LiveKit gives each participant the same chat permission as their publish permission, so viewers couldn't chat.

Your server decides who is the streamer. Mint a streamer token only for the person who owns the stream, and viewer tokens for everyone else allowed to watch. The token only has to be valid when the browser connects. LiveKit keeps a connected browser's session going after that.

## Chat

Chat travels as LiveKit data messages inside the room. In the browser, the LiveKit client sends reliable data messages and receives them through the `RoomEvent.DataReceived` event. Send each message as a small JSON object, such as `{"text": "hello"}`. One reliable message can carry up to 15 KiB.

LiveKit doesn't store data messages. A viewer who joins late sees only the messages sent after they joined. If you want chat history or a record for moderation, have the browser also send each message to your server, and keep it there.

To stop someone chatting, your server calls `UpdateParticipant` on LiveKit's room service with `CanPublishData` set to false. To remove them from the stream, it calls `RemoveParticipant`. Both are on `lksdk.NewRoomServiceClient`.

## Recording into your store

Your server starts an Egress, LiveKit's recorder, and points it at the app's store. Once write credentials are on, LiveKit gets a write credential, not the store's own credential. It can only upload files under one folder you name, and only until it expires. Until then, see [Until write credentials are on](#until-write-credentials-are-on).

Ask the platform for a write credential just before each recording, with the Service credential:

```go
import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/livekit/protocol/livekit"
)

// recordingUpload asks the platform for a credential that can only upload
// under prefix, for ttl, in the shape LiveKit takes.
func recordingUpload(ctx context.Context, prefix string, ttl time.Duration) (*livekit.S3Upload, error) {
	body, err := json.Marshal(map[string]any{"access": "write", "prefix": prefix, "ttl_seconds": int(ttl.Seconds())})
	if err != nil {
		return nil, err
	}
	url := os.Getenv("CARLOS_CONSOLE") + "/api/cli/apps/" + os.Getenv("CARLOS_ACCOUNT") + "/shop/store/credentials"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CARLOS_SERVICE_TOKEN"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("write credential: %s", resp.Status)
	}
	var c struct {
		AccessKey    string `json:"access_key"`
		Secret       string `json:"secret"`
		SessionToken string `json:"session_token"`
		Region       string `json:"region"`
		Bucket       string `json:"bucket"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		return nil, err
	}
	return &livekit.S3Upload{
		AccessKey:    c.AccessKey,
		Secret:       c.Secret,
		SessionToken: c.SessionToken,
		Region:       c.Region, // required: see Before you start
		Bucket:       c.Bucket,
		// No Tagging. A write credential can't tag, so S3 refuses the upload.
	}, nil
}
```

Give each recording a folder of its own. A write credential can replace a file already in its folder, but it can't touch anything else.

Then start the Egress with LiveKit's `StartEgress` call. A template source records the room as one MP4, laid out the way a viewer sees it:

```go
import (
	"context"
	"os"
	"time"

	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

func egressClient() *lksdk.EgressClient {
	return lksdk.NewEgressClient(os.Getenv("LIVEKIT_URL"), os.Getenv("LIVEKIT_API_KEY"), os.Getenv("LIVEKIT_API_SECRET"))
}

// startRecording records the whole room under recordings/<id>/.
func startRecording(ctx context.Context, room, id string) (string, error) {
	upload, err := recordingUpload(ctx, "recordings/"+id+"/", 4*time.Hour)
	if err != nil {
		return "", err
	}
	info, err := egressClient().StartEgress(ctx, &livekit.StartEgressRequest{
		RoomName: room,
		Source:   &livekit.StartEgressRequest_Template{Template: &livekit.TemplateSource{Layout: "speaker"}},
		Outputs: []*livekit.Output{{
			Config: &livekit.Output_File{File: &livekit.FileOutput{
				FileType: livekit.EncodedFileType_MP4,
				Filepath: "recordings/" + id + "/",
			}},
		}},
		Storage: &livekit.StorageConfig{Provider: &livekit.StorageConfig_S3{S3: upload}},
	})
	if err != nil {
		return "", err
	}
	return info.EgressId, nil
}
```

`Filepath` ends in `/`, so LiveKit names the file itself inside that folder, as `<room>-<time>.mp4`. That also keeps a retried recording from overwriting the first try. Don't record under `derived/`: media conversion won't take a source there, and the platform won't issue a write credential for it.

The credential has to last until LiveKit has uploaded the file, which it does when the recording stops. LiveKit Cloud stops a room recording at 3 hours, so 4 hours covers the recording and the upload.

A media source records one video track as it arrives, without re-encoding it. LiveKit picks the file type from the track's codec, so leave `FileType` unset. Media conversion reads WebM and MP4. Use it when you only need the streamer's camera:

```go
upload, err := recordingUpload(ctx, "recordings/"+id+"/", 13*time.Hour)
if err != nil {
	return err
}
info, err := egressClient().StartEgress(ctx, &livekit.StartEgressRequest{
	RoomName: room,
	Source: &livekit.StartEgressRequest_Media{Media: &livekit.MediaSource{
		Video: &livekit.MediaSource_VideoTrackId{VideoTrackId: trackID},
	}},
	Encoding: &livekit.StartEgressRequest_Preset{Preset: livekit.EncodingOptionsPreset_PASSTHROUGH},
	Outputs: []*livekit.Output{{
		Config: &livekit.Output_File{File: &livekit.FileOutput{Filepath: "recordings/" + id + "/"}},
	}},
	Storage: &livekit.StorageConfig{Provider: &livekit.StorageConfig_S3{S3: upload}},
})
```

LiveKit Cloud stops a track recording at 12 hours, so that credential asks for 13. The longest a write credential can last is 24 hours.

LiveKit uploads the file when the recording stops. It also writes a small JSON manifest beside the file in your store, named `<egress_id>.json`, and the webhook's `manifest_location` points to it. Your app can ignore it or delete it. Set `DisableManifest: true` on the output if you don't want it.

Write credentials need AWS S3. If your app gets `CARLOS_STORE_ENDPOINT`, its store is on an S3-compatible server, and the platform can't issue one for it.

### Until write credentials are on

Until your deployment can issue write credentials, no `carlos` command gives you a credential to hand LiveKit. `carlos store status` shows only the store credential's key ID, and the secret is sealed in the app's config.

Your app's server already has the store's own credential. The platform puts it in the app's environment as `CARLOS_STORE_ACCESS_KEY` and `CARLOS_STORE_SECRET_KEY`, beside `CARLOS_STORE_REGION` and `CARLOS_STORE_BUCKET`. If you made the store with `--env-prefix`, use that prefix in every variable name in the sample. Build LiveKit's `S3Upload` from them:

```go
import (
	"errors"
	"os"

	"github.com/livekit/protocol/livekit"
)

// storeUpload gives LiveKit the store's own credential, from the app's
// environment. Use it only until write credentials are on.
func storeUpload() (*livekit.S3Upload, error) {
	upload := &livekit.S3Upload{
		AccessKey: os.Getenv("CARLOS_STORE_ACCESS_KEY"),
		Secret:    os.Getenv("CARLOS_STORE_SECRET_KEY"),
		Region:    os.Getenv("CARLOS_STORE_REGION"), // required: see Before you start
		Bucket:    os.Getenv("CARLOS_STORE_BUCKET"),
		// No Tagging. The store's credential can't tag either.
	}
	if upload.AccessKey == "" || upload.Secret == "" || upload.Bucket == "" {
		return nil, errors.New("this app has no store credential in its environment")
	}
	return upload, nil
}
```

In each recording example, call `storeUpload()` in place of `recordingUpload`. The rest of this page stays the same.

This gives LiveKit a credential for the whole store. It can read, list, replace and delete every file in it, not only the recording's folder, and it doesn't expire. Whether LiveKit may hold that is your app's decision. If you finish a rotation with `carlos store rotate --finish` while a recording runs, its upload fails. Once write credentials are on, switch to `recordingUpload`, and LiveKit holds only a write credential for one folder.

## When the recording is done

LiveKit POSTs events to the webhook URL you set in the LiveKit project, with `Content-Type: application/webhook+json`. Each one carries an `Authorization` token signed with the webhook's configured signing key. Configure the webhook to use the API key above, so the SDK can verify it for you. The one you need is `egress_ended`:

```go
import (
	"net/http"
	"os"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	"github.com/livekit/protocol/webhook"
)

func livekitWebhook(w http.ResponseWriter, r *http.Request) {
	keys := auth.NewSimpleKeyProvider(os.Getenv("LIVEKIT_API_KEY"), os.Getenv("LIVEKIT_API_SECRET"))
	event, err := webhook.ReceiveWebhookEvent(r, keys)
	if err != nil {
		http.Error(w, "signature does not verify", http.StatusUnauthorized)
		return
	}
	if event.GetEvent() == webhook.EventEgressEnded {
		info := event.GetEgressInfo()
		switch {
		case info.GetBackupStorageUsed():
			// The upload to your store failed. See "When an upload fails".
		case info.GetStatus() == livekit.EgressStatus_EGRESS_COMPLETE,
			info.GetStatus() == livekit.EgressStatus_EGRESS_LIMIT_REACHED:
			for _, f := range info.GetFileResults() {
				queueConversion(f.GetFilename(), time.Duration(f.GetDuration()))
			}
		default:
			// EGRESS_FAILED: info.GetError() says why.
		}
	}
	w.WriteHeader(http.StatusOK)
}
```

`Filename` is the recording's key in your store, such as `recordings/a1b2/stream-a1b2-2026-11-25T101500.mp4`. `Duration` is in nanoseconds. `EGRESS_LIMIT_REACHED` means LiveKit stopped a long recording at its time limit, and the file up to that point is still in your store.

LiveKit retries a webhook a few times and may send one more than once. Make the handler safe to run twice. Submitting the same key with the same preset and class to media conversion twice is already safe: the second `POST` returns the first job.

## Converting and playing the recording

Send the recording's key to media conversion, as on the [media conversion page](/docs/media-conversion#starting-a-conversion):

```http
POST /api/cli/apps/{account}/shop/media/conversions
Authorization: Bearer <service token>
{"key": "recordings/a1b2/stream-a1b2-2026-11-25T101500.mp4", "class": "long"}
```

Ask for `"class": "long"` when the recording is longer than 10 minutes. A short job converts up to 10 minutes and reports `needs_long_class` for anything longer. A video track above 1080p also needs the long class. A long job converts up to 3 hours of SDR video at or below 1080p. LiveKit Cloud limits a room-composite file to 3 hours. A room composite recording is 720p SDR at 30 frames a second, with Opus sound, unless you ask for other encoding options. Media conversion reads that MP4.

Poll the job until it is `done`, save the output keys with the stream, and serve them as the page's [Serving](/docs/media-conversion#serving) section describes: the playlist and the MP4 from your app's own origin, side by side.

Conversion counts against your account's [media allowance](/docs/media-conversion#the-allowance) like any other video.

## When an upload fails

If LiveKit can't upload the recording to your store, the recording isn't in your store and there is nothing to convert. Two common causes:

- **The store is full.** A store past its plan's storage allowance refuses new objects, recordings included.
- **The write credential stopped working before the upload.** LiveKit uses the credential it was given when the recording started, and uploads at the end. The upload fails if the recording runs longer than the credential lasts, or if you run `carlos store credential --revoke --app shop` during a stream. Rotating the store's own credential with `carlos store rotate` doesn't affect write credentials.

Without a backup copy, the webhook reports `EGRESS_FAILED`, and its error says the upload failed. With backup storage, it reports `EGRESS_COMPLETE` with `backup_storage_used` set instead.

LiveKit Cloud can keep a copy of a recording whose upload failed in its own backup storage for 7 days. LiveKit turns this on for a project when you ask. When it happens, `manifest_location` in the webhook points to a manifest at LiveKit for retrieving it, not to one in your store, and its file URLs are valid for 7 days. The recording is at LiveKit, not in your store.

## Virus scanning

If your store has [virus scanning](/docs/cli#carlos-store-scan), a recording is scanned like any other new object. Most recordings are bigger than the scanner's size limit, 25 MiB unless your operator changed it, so they are counted as skipped, not scanned. Media conversion doesn't wait for a scan. It only refuses an object a scan has found infected while the store enforces scanning.

## Privacy: a third party in the media path

With this setup, LiveKit Cloud carries every stream. The video, the audio and the chat pass through LiveKit's servers, and LiveKit records the stream before it reaches your store. LiveKit also holds a write credential while a recording runs. It can only upload files to that recording's folder, until it expires. It can't read, list or delete anything in your store. If you use the fallback above, LiveKit receives the store's own credential. It can read, list and delete every file in your store.

The platform doesn't tell your users any of this. Whether and how to tell them is your app's decision. If you do, say it where people decide to stream or watch: near the start of your app's description, and on anything the stream produces, such as the recording's page.

## Billing

LiveKit bills your own LiveKit account for everything LiveKit does: participant minutes, data sent out of LiveKit to viewers, and Egress recording time. Check LiveKit's pricing page for current prices and free allowances. A room composite recording is billed as transcoding minutes. A track recording is billed at the track-egress rate.

The platform bills your account as usual for the instance, the recording's storage in your store, and the media minutes used for conversion.
