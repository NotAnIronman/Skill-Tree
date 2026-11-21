# Gielinor Pathways

A browser-based Old School RuneScape progression tree. All 24 skills have level 1–99 coverage from the OSRS Wiki, with selected core unlocks on the main path and equipment, quests, diaries, and optional upgrades on branches.

## Publish on GitHub Pages

1. Put this repository under your GitHub account and push its files to `main` or `master`.
2. In the repository, open **Settings > Pages**.
3. Set **Build and deployment > Source** to **GitHub Actions**.
4. Open **Actions > Deploy GitHub Pages** and run the workflow, or push another change.
5. Open the URL shown by the successful deployment.

The included workflow checks the code, builds the static site, and deploys the `pages/` output. It uses Node 24 and GitHub's official Pages actions. No dependency installation or API key is needed. Relative asset paths support project URLs such as `https://notanironman.github.io/gielinor-pathways/` as well as a custom domain.

For branch-based publishing, build with `node scripts/build-pages.mjs` and publish the contents of `pages/` as the branch root. The generated `.nojekyll` file disables Jekyll processing.

## Character imports on a static site

GitHub Pages cannot run a server endpoint. The official Hiscores response also does not enable cross-origin browser reads. The default Pages build therefore works without a backend through JSON import:

1. Choose **Import character** and enter a display name.
2. Choose **Open official Hiscores**.
3. Copy the JSON from that page, or save its response as a JSON file.
4. Paste or upload it in the import dialog.
5. Review the current and imported levels, then choose **Apply levels**.

Only skill levels change. Missing or unranked values keep their existing level. Equipment, quests, diaries, and manual confirmations remain as recorded. Main and Ironman profiles are separate. No game login is requested.

For one-click live lookup, deploy the included optional public proxy:

1. In this repository, run `npx wrangler deploy` and follow Cloudflare's account setup if needed. `wrangler.jsonc` points to `worker/public-hiscores.mjs`.
2. Copy the deployed Worker URL and append `/api/hiscores`.
3. In GitHub, open **Settings > Secrets and variables > Actions > Variables**.
4. Add a repository variable named `HISCORES_ENDPOINT` with that HTTPS URL.
5. Run the Pages deployment again.

The public proxy reads only the fixed official Old School Hiscores endpoint. It does not accept arbitrary target URLs or require credentials from visitors. Successful public responses are cached for five minutes. Its permissive CORS header applies to public Hiscores data, with no cookies or credentialed requests.

The WikiSync maintainers ask third-party projects not to use their API. This application does not query WikiSync. See [WikiSync third-party use](https://oldschool.runescape.wiki/w/RuneScape:WikiSync#Third-party_use) and the [official Hiscores API](https://developer.runescape.com/platform/modules/hiscores/index-lite.html).

## Move existing progress

Browser storage is scoped to the website origin. Before moving from another hosted copy, choose **Progress > Export progress**. On the new website, use **Progress > Import progress backup**. Existing progress does not automatically move to a new domain.

## Develop locally

Run `node --test --test-isolation=none test/*.test.mjs` to check progression, imports, and the Pages build. Run `node scripts/build-pages.mjs` to generate the static site. Serve `pages/` through a local HTTP server to preview it; JavaScript modules do not run reliably when opened as local files.

There are no third-party runtime packages. The generated Wiki data and cached icons are already included, so building does not contact the Wiki. Refresh scripts under `scripts/` are optional maintenance tools.

## Content and attribution

The data contains 4,833 unique Wiki unlock-table entries plus curated acquisition advice. It is an overview, not a complete dependency solver or a prescribed training order. Additional quest, location, equipment, charge, and boost requirements can apply.

Unlock text and facts are adapted from OSRS Wiki contributors under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). Original table revisions and source links are retained. Grouping, classification, and central-path selection are adaptations. Game icons remain Jagex property and are used for this unofficial, non-commercial companion under the [Jagex Fan Content Policy](https://legal.jagex.com/docs/policies/fan-content-policy). Neither Wiki availability nor inclusion in this repository makes game assets public domain. Keep the in-app attribution and preserve the applicable content terms when redistributing.

Hosting references: [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
