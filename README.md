# PARADISEC OLAC Data Source

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Components](#components)
	- [Setup](#setup)
	- [Building the containers](#building-the-containers)
	- [Starting an environment](#starting-an-environment)
- [Python Harvest Tools](#python-harvest-tools)
	- [app/process-language-pages/generate-current-language-list.py](#appprocess-language-pagesgenerate-current-language-listpy)
	- [app/process-language-pages/archiver.py](#appprocess-language-pagesarchiverpy)
	- [app/process-language-pages/reprocess.py](#appprocess-language-pagesreprocesspy)

<!-- /TOC -->

This repository contains a micro-service that harvests OLAC data from http://language-archives.org
and makes it accessible via a simple API.

The API has two routes:
 * `GET /dates` returns an array of dates of the harvested data
 * `/regions` access region data
     - GET `/regions`: get the list of regions
     - GET `/regions/Africa`: get the data for Africa - a list of countries is returned
 * `/countries` access country data
     - GET `/countries`: get the list of countries
     - GET `/countries/Algeria`: get the data for Algeria - a list of languages is returned
 * `/languages` access language data
     - GET `/languages/aaa`: get the latest metadata for language code aaa; doesn't include resources
     - GET `/languages/aaa/resources`: get the latest resources for language code aaa; doesn't include language metadata
     - GET `/languages/aaa?date=20180501`: get the data for language code aaa harvested on 2018-05-01; doesn't include resources
     - GET `/languages/aaa/resources?date=20180501`: get the resources for language code aaa harvested on 2018-05-01; doesn't include language metadata


## Components
The repository contains the api source code, docker related information and helper tools as follows:
```
|- app: the API code including the python based data harvesting code
|- bin: helper tools to build containers and start / stop the docker environment
|- config: docker compose configuration files for development and production
|- docker: dockerfiles to build the various components
```
There are 3 components to this service: an nginx gateway, the api and a postgres db

### Setup

Ensure you have nodejs version 8 or above installed on your machine: see [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Clone the repository locally then setup the application dependencies as:
```
> cd app
> npm install
```

### Building the containers

```
> cd bin
> ./build

To build the producion container
> ./build-production
```

### Starting an environment

To start the development environment: `cd bin && ./start development`. The src code directory is volume mounted in to the container so the service will livereload as you save files (though the file watching is only on the javascript files not the python files in the data harvester tools).

To start the production environment:

```
> export POSTGRES_PASSWORD="some secure password"
> ./start production
```
* The POSTGRES_PASSWORD is as the name states - the password used for the paradisec database user. See the docker compose file for more information.

## Python Harvest Tools

The python harvest tools are designed to work with python3 (which is installed in to the API container). There are 3 tools available.

### app/process-language-pages/generate-current-language-list.py

The main workhorse script. This runs nightly, harvesting the data for each language on the language-archives site and then writing the data out to disk (so it's archived) in addition to submitting it to the service.

An example invocation is:
```
> python3 process-language-pages/generate-current-language-list.py
 --languages process-language-pages/languages.csv
 --glotto-languoids process-language-pages/languoid.csv
 --service http://localhost:3000
 --output-folder /srv/data
 --info
```

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
 --data /srv/data
 --date 20180501
 --service http://localhost:3000
```

To see the help:
```
> python3 process-language-pages/reprocess.py --help
```

Again, this script needs to be run on the API container as it submits to the ingest route which only accepts data from localhost.
