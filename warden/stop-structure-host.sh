#!/bin/bash

# Grab args with getopt
ARGS=`getopt -o "t" -- "$@"`

if [ $? -ne 0 ]; then
    exit 1
fi

eval set -- "$ARGS"

# set default values
CMD="stop-instances"

while true; do
    case "$1" in
        -t) CMD="terminate-instances"; shift;;
        --) shift; break;;
    esac
done

if [ -z "$1" ]; then echo "Must provide instance id!"; exit 1; fi

aws ec2 "$CMD" --instance-ids $@
