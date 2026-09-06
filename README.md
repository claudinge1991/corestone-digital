# Corestone

Static public site for Corestone Holdings, including property and field-service coordination, digital capabilities, products, contact intake, and product-support/legal routes.

## Local preview

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/`. The production GitHub Pages URL uses the `/corestone-digital/` path.

The project inquiry form is deliberately a no-secret `mailto:` fallback to `corestoneholdings@gmail.com`. A future server-side endpoint can replace it without exposing credentials in this repository.
