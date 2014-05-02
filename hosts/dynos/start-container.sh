#!/bin/bash

usage="
usage: start-container.sh APPNAME [ DEPENDENCY ... ]

this script will start all DEPENDENCIES
then start APPNAME, linking in DEPENDENCIES
"

# check for proper number of arguments
if [[ $# -lt 1 ]]; then echo $usage ; fi

# store name of this script
start_container="$0"

# store name of the app to start and remove it from the arguments list
app="$1"
shift

# TODO:
# fetch list of dependencies from mongo instead instead of looking for them on the command line
# e.g.:
# depslist="$(mongo -c <query to fetch dependencies>)"

# start all dependencies
link_args=()
for dep in $@ ; do
    # start container and grab its name
    dep_name="$("$start_container" "$dep" | xargs docker inspect --format='{{.Name}}')"
    # create flags for linking
    link_args+="--link"
    link_args+="$dep_name:$dep"
done

docker run -d --icc=false ${link_args[@]} warehouse:5000/"$app"
