#!/bin/bash

# sanity checks
app_name="$1"
appdir="/tmp/doskara-apps/${app_name}"

# check to see if directory already exists

dockerfile="${appdir}/Dockerfile"
mkdir -p "${appdir}"

# read input into tar file
tarname=build.tar.gz
tarfile="${appdir}/${tarname}"
cat > "${tarfile}"


# create dockerfile
echo "
FROM ubuntu:latest
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update -y
ADD ./${tarname} /build/
WORKDIR /build
RUN /bin/ls -al .
RUN /bin/bash ./build.sh
EXPOSE 80
ENTRYPOINT /bin/bash ./run.sh
" > "${dockerfile}"

# build docker container
docker build -t "warehouse:5000/${app_name}" "${appdir}"

# push to build host
docker push "warehouse:5000/${app_name}"

# clean up
rm -rf "${appdir}"
