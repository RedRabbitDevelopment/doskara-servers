#!/bin/bash

# mount /dev/xdaf /data
docker run -d -p 5000:5000 -v /data:/tmp/registry registry
