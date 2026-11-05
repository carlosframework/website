package main

import (
	"bytes"
	"database/sql"
	"embed"
	"errors"
	"flag"
	"fmt"
	"html/template"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"amadan.net/rastrillo/rastrillo"
	_ "amadan.net/rastrillo/rastrillo/locales/en"
)

// DRAFT copy, pending review
// 🤖 All starter UI copy is keyed here for the controller's review.
var starterCopy = map[string]string{
	"starter.title":   "Shop list",
	"starter.empty":   "Nothing here yet. Add the first item.",
	"starter.name":    "Item",
	"starter.add":     "Add",
	"starter.invalid": "Enter a name between 1 and 120 characters.",
	"starter.full":    "This list is full. It holds up to 100 items.",
	"starter.error":   "Something went wrong. Try again.",
	"starter.aria":    "Add an item to the shop list",
}

//go:embed templates/index.html static/fiesta.css static/fiesta-plain.css static/fiesta-signal.css
var assets embed.FS

const itemsMigration = `CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY, name TEXT NOT NULL)`

func parseFlags(args []string) (socket, dbPath string, err error) {
	flags := flag.NewFlagSet("shop", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	flags.StringVar(&socket, "socket", "", "")
	flags.StringVar(&dbPath, "db", "", "")
	if err = flags.Parse(args); err != nil {
		return
	}
	if flags.NArg() != 0 || !filepath.IsAbs(socket) || !filepath.IsAbs(dbPath) {
		err = errors.New("--socket and --db require absolute paths; positional arguments are not accepted")
	}
	return
}

func main() {
	socket, dbPath, err := parseFlags(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	err = rastrillo.Serve(rastrillo.Options{
		Router: newRouter, Socket: socket, DBPath: dbPath, Migrations: []string{itemsMigration},
		NoSpeculationRules: true, NoSchemeSwitch: true,
		ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newRouter(db *sql.DB) (*http.ServeMux, error) {
	page, err := template.New("index.html").Funcs(template.FuncMap{"copy": func(id string) string { return starterCopy[id] }}).ParseFS(assets, "templates/index.html")
	if err != nil {
		return nil, err
	}
	type view struct {
		Items []string
		Error string
	}
	render := func(w http.ResponseWriter, status int, data view) {
		var b bytes.Buffer
		if err := page.Execute(&b, data); err != nil {
			http.Error(w, "🤖 "+starterCopy["starter.error"], 500)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(status)
		_, _ = w.Write(b.Bytes())
	}
	fail := func(w http.ResponseWriter, status int, id string) { render(w, status, view{Error: starterCopy[id]}) }
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), "SELECT name FROM items ORDER BY id LIMIT 100")
		if err != nil {
			fail(w, 500, "starter.error")
			return
		}
		defer rows.Close()
		data := view{}
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				fail(w, 500, "starter.error")
				return
			}
			data.Items = append(data.Items, name)
		}
		if err := rows.Err(); err != nil {
			fail(w, 500, "starter.error")
			return
		}
		render(w, 200, data)
	})
	mux.HandleFunc("POST /items", func(w http.ResponseWriter, r *http.Request) {
		origins := r.Header.Values("Origin")
		if len(origins) != 1 || !sameOrigin(origins[0], r.Host) {
			fail(w, 403, "starter.error")
			return
		}
		kind, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || kind != "application/x-www-form-urlencoded" {
			fail(w, 400, "starter.invalid")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4096)
		if err := r.ParseForm(); err != nil {
			var limit *http.MaxBytesError
			if errors.As(err, &limit) {
				fail(w, 413, "starter.invalid")
			} else {
				fail(w, 400, "starter.invalid")
			}
			return
		}
		names := r.PostForm["name"]
		if len(r.PostForm) != 1 || len(names) != 1 {
			fail(w, 400, "starter.invalid")
			return
		}
		name := strings.TrimSpace(names[0])
		if !utf8.ValidString(name) || utf8.RuneCountInString(name) < 1 || utf8.RuneCountInString(name) > 120 {
			fail(w, 400, "starter.invalid")
			return
		}
		// 🤖 One SQL statement keeps the row bound atomic across concurrent requests.
		result, err := db.ExecContext(r.Context(), "INSERT INTO items(name) SELECT ? WHERE (SELECT COUNT(*) FROM items) < 100", name)
		if err != nil {
			fail(w, 500, "starter.error")
			return
		}
		count, err := result.RowsAffected()
		if err != nil {
			fail(w, 500, "starter.error")
			return
		}
		if count == 0 {
			fail(w, 409, "starter.full")
			return
		}
		w.Header().Set("Location", "/")
		w.WriteHeader(http.StatusSeeOther)
	})
	mux.HandleFunc("GET /static/{file}", func(w http.ResponseWriter, r *http.Request) {
		file := r.PathValue("file")
		switch file {
		case "fiesta.css", "fiesta-plain.css", "fiesta-signal.css":
		default:
			w.WriteHeader(404)
			return
		}
		data, err := assets.ReadFile("static/" + file)
		if err != nil {
			fail(w, 500, "starter.error")
			return
		}
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		_, _ = w.Write(data)
	})
	return mux, nil
}

func sameOrigin(origin, host string) bool {
	u, err := url.Parse(origin)
	// 🤖 TLS ends at the platform edge; compare the public authority, never forwarded headers.
	return err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != "" && strings.EqualFold(u.Host, host) && u.User == nil && u.Path == "" && u.RawQuery == "" && !u.ForceQuery && u.Fragment == "" && u.Opaque == ""
}
