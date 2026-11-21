# Skill-Tree deployment

Repository: https://github.com/NotAnIronman/Skill-Tree

GitHub Pages address after a successful deployment: https://notanironman.github.io/Skill-Tree/

Enable Settings > Pages > Build and deployment > Source > GitHub Actions. Then rerun the failed Deploy GitHub Pages workflow, run it manually, or push a new change.

The first run failed at Configure GitHub Pages because Pages had not yet been enabled. The application checks and static build completed successfully.

The default site imports skill levels by uploading or pasting official Hiscores JSON. To enable direct lookup, deploy the included public Worker and set the HISCORES_ENDPOINT repository variable as described in README.md.

Progress is stored per website origin. Export it from the old site and import the backup on the new site to keep your existing levels and observations.
