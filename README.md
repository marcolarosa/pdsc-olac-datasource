# PARADISEC OLAC Data Source

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [PARADISEC OLAC Data Source](#paradisec-olac-data-source)
    - [Components](#components)
    - [Setup](#setup)
    - [Building the containers](#building-the-containers)
    - [Starting the development environment](#starting-the-development-environment)
    - [Stopping the development environment](#stopping-the-development-environment)
    - [Running a harvest](#running-a-harvest)
    - [Seeing the container logs](#seeing-the-container-logs)
    - [Running the unit tests](#running-the-unit-tests)
    - [Triggering an update or cleanup](#triggering-an-update-or-cleanup)
    - [Python Harvest Tools](#python-harvest-tools)
        - [app/process-language-pages/scraper.py](#appprocess-language-pagesscraperpy)
        - [app/process-language-pages/archiver.py](#appprocess-language-pagesarchiverpy)
        - [app/process-language-pages/reprocess.py](#appprocess-language-pagesreprocesspy)

<!-- /TOC -->

This repository contains a micro-service that harvests OLAC data from http://language-archives.org
and makes it accessible via a simple API.

The API has four routes:

-   `GET /dates` returns an array of dates of the harvested data
-   `/regions` access region data
    -   GET `/regions`: get the list of regions
    -   GET `/regions/Africa`: get the data for Africa - a list of countries is returned
-   `/countries` access country data
    -   GET `/countries`: get the list of countries
    -   GET `/countries/Algeria`: get the data for Algeria - a list of languages is returned
-   `/languages` access language data
    -   GET `/languages/aaa`: get the latest metadata for language code aaa; doesn't include resources
    -   GET `/languages/aaa/resources`: get the latest resources for language code aaa; doesn't include language metadata
    -   GET `/languages/aaa?date=20180501`: get the data for language code aaa harvested on 2018-05-01; doesn't include resources
    -   GET `/languages/aaa/resources?date=20180501`: get the resources for language code aaa harvested on 2018-05-01; doesn't include language metadata

## Components

The repository contains the api source code, docker related information and helper tools as follows:

```
|- app: the API code
   |- process-language-pages: the python based data harvesting code
|- bin: helper tools to build containers and start / stop the docker environment
|- config: docker compose configuration files for development and production
|- docker: dockerfiles to build the various components
```

There are 3 components to this service: an nginx gateway, the api and a postgres db

## Setup

Ensure you have nodejs version 8 or above installed on your machine: see [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Clone the repository locally then setup the application dependencies as:

```
> cd app
> npm install
```

## Building the containers

```
> cd bin
> ./build

To build the producion container
> ./build-production
```

## Starting the development environment

```
> cd bin
> ./start
```

The src code directory is volume mounted in to the container so the service will livereload as you save files (though the file watching is only on the javascript files not the python files in the data harvester tools).

## Stopping the development environment

```
> cd bin
> ./stop
```

## Running a harvest

The harvest needs to be run from within a docker container attached to the same network. Accordingly, there exists a container called
`pdsc/api-tools-production` which contains the python update tools.

```
$ docker run -t --network config_default -e PDSC_ADMIN_PASSWORD=1234 -v ~/src/pdsc/olac-data:/srv/data pdsc/api-tools-production bash -c "python3 ./scraper.py --output-folder /srv/data/scrape --info"
```

Note that we pass in the admin password (PDSC_ADMIN_PASSWORD) as an environment variable. This must match whatever is defined in the
docker compose file that was used to start the environment. Without it, the api won't accept data submissions from the tools.

## Seeing the container logs

```
> cd bin
> ./do log
Select which container logs you want to follow - most of the time `service` is the only one of interest.
```

## Running the unit tests

Assuming you have a terminal open on the service logs, open up `e2e/test-endpoints.spec.js` and save the file. The tests will be run each time the file saves.

## Triggering an update or cleanup

It's possible to tell the API to run a cleanup or update process by POST'ing to the relevant endpoint, viz:

```
Run an update process:
> curl -X POST http://localhost:3000/update

Run a cleanup
> curl -X POST http://localhost:3000/cleanup
```

**Note that this needs to be done inside the container as those endpoints will not respond to external requests**

## Python Harvest Tools

The python harvest tools are designed to work with python3 (which is installed in to the API container). There are 3 tools available.

### app/process-language-pages/scraper.py

The main workhorse script. This runs nightly, harvesting the data for each language on the language-archives site and then writing the data out to disk (so it's archived) in addition to submitting it to the service.

An example invocation is:

```
> python3 process-language-pages/scraper.py
 --output-folder /srv/data
 --info
```

The script assumes the service is at `http://api-service:3000` though there is a flag to override that.

To see the help:

```
> python3 process-language-pages/generate-current-language-list.py --help
```

Note that the service is referred to as `http://localhost:3000`. This script must be run on the API container as the API will not accept data that is not coming from localhost - that is, the data ingest endpoint is not open to the world.

Also, after the harvest process is completed, a cleanup jobs runs to remove all data except for today's harvest and other harvests that happened on the first of the month. As this data does not change that frequently we only keep the most recent harvest and one from each previous month.

### app/process-language-pages/archiver.py

Archiver also runs nightly after the harvest process to tar and zip old data dumps in order to save space. Data dumps are not removed.

An example invocation is:

```
> python3 process-language-pages/archiver.py --data /srv/data
```

To see the help:

```
> python3 process-language-pages/archiver.py --help
```

### app/process-language-pages/reprocess.py

The reprocess script is used to reload a data harvest or upload older harvests. There shouldn't really be any need to use this but just in case:

An example invocation is:

```
> python3 process-language-pages/reprocess.py
 --data /srv/data/scrape/20180501.tbz
```

The script assumes the service is at `http://api-service:3000` though there is a flag to override that.

To see the help:

```
> python3 process-language-pages/reprocess.py --help
```

Again, this script needs to be run on the API container as it submits to the ingest route which only accepts data from localhost.
