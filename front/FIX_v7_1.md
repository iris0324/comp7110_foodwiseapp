# FoodWise v7.1 startup fix

Fixed `Failed to execute 'fetch' on 'Window': Illegal invocation` on initial load.

Root cause: passing the browser's native `fetch` as an unbound function in `CatalogService`, then calling it as `this.fetcher(url)`. Some browsers reject that invocation.

Fix: wrap `globalThis.fetch` in an arrow function so its browser invocation context is preserved.

No backend or Supabase integration was added. All other project files were preserved.

Start: open this folder in VS Code and run Live Server on `index.html`, or use `python3 -m http.server 7116`.
