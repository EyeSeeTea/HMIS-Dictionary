# E2E instance

A DHIS2 started with [d2-docker](https://github.com/EyeSeeTea/d2-docker) and filled with the metadata in `seed/`, so the e2e tests do not depend on a copy of a client instance. The app only reads metadata, so the seed has no data values.

## Running the tests

```sh
yarn test:e2e:docker                                  # v42, stopped at the end
yarn test:e2e:docker --version 40 --keep -- --project=read
yarn test:e2e:docker --help
```

The script starts a seeded instance with d2-docker, installs the app (built first if `hmis-dictionary.zip` is missing or older than `src/`), runs Playwright with the arguments after `--`, and stops the instance unless `--keep`. If the same image is already running, it uses it. The instance belongs to the script, so it has fixed users and ports: see `--help`.

For an existing instance, use `yarn test:e2e:instance --url URL --auth USER:PASSWORD` instead.

Each start of the data image gives a clean database, so an interrupted write test leaves nothing behind.

The first run of a version builds two local images, which takes a few minutes:

- `hmis-e2e/dhis2-core:VERSION`, from the DHIS2 release WAR (`d2-docker create core`).
- `hmis-e2e/dhis2-data:VERSION-HASH`: an empty database, seeded with `seed.sh` and committed. `HASH` changes when the seed changes, so a new seed builds a new image. Old ones can be removed with `d2-docker rm`.

Later runs start the data image in about a minute. The test user, `e2e` with password `E2e-tests-1`, is a superuser. The `admin` user keeps the default DHIS2 password (`district`).

`seed.sh` also works on its own, on any empty DHIS2: see the comment at its start.

## Where the seed comes from

The seed is a subset of a real instance, with neutral names. Only someone with access to that instance can rebuild it:

```sh
python3 -I scripts/extract.py --url http://localhost:8098 --auth admin:district --out /tmp/x/raw.json
python3 -I scripts/sanitize.py /tmp/x/raw.json seed --report /tmp/x/replaced.tsv
```

- `extract.py` takes the programs, all indicators, the data sets and indicator groups of a few services, the objects the configuration and the tests name, and everything they depend on. The ids stay the same, so the fixtures in `e2e/support/fixtures.ts` keep working.
- `sanitize.py` replaces the words that are not in a common dictionary (place names, people, project codes) with made-up words, and organisation and country names always. Descriptions become a short text built from the name. The same word always gets the same replacement, so codes and expressions stay consistent. Review `replaced.tsv` before committing.
- `seed/metadata.json.gz` is compressed with no timestamp, so the same seed gives the same file. Read it with `zcat`.

Keep the raw extract out of the repository: it has the original names and texts.
