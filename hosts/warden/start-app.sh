#!/bin/bash

usage="start-app HOST APPNAME"

# check for proper number of arguments
if [[ $# -ne 2 ]]; then echo $usage ; fi

host="$1"
app="$2"

ssh "$host" "/usr/local/doskara/start-container.sh $app"
