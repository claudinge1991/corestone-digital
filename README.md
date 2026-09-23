# Corestone

Static public site for Corestone Holdings, including property and field-service coordination, digital capabilities, products, contact intake, and product-support/legal routes.

## Local preview

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/`. The production GitHub Pages URL uses the `/corestone-digital/` path.

The project inquiry form is deliberately a no-secret `mailto:` fallback to `corestoneholdings@gmail.com`. A future server-side endpoint can replace it without exposing credentials in this repository.

## CAD & 3D Design intake (`/cad/`)

`/cad/` is a managed-service intake. `assets/cad.js` validates the request, generates a browser-side request ID (`CAD-YYYYMMDD-XXXXXX`), and opens a prepared email. Reference files are checked locally and never uploaded; the customer attaches them to the email. Storing requests, server-issued IDs, private file storage, quotes, versioned previews, approvals, and delivery need a backend and are not part of this static site.

## Tests

```sh
python3 tests/run.py
```

Runs a sitemap/route check, confirms existing home and digital content still renders, and runs the CAD intake tests in `tests/cad-tests.html` using headless Google Chrome (no network or Node needed).
