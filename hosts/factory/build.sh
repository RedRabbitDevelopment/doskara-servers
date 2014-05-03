#!/bin/bash
set -e
echo "Building project..."
# sanity checks
app_name="$1"
appdir="/tmp/doskara-apps/${app_name}"

# check to see if directory already exists
echo "Making directory"
dockerfile="${appdir}/Dockerfile"
mkdir -p "${appdir}"

# read input into tar file
echo "Reading tarball"
tarname=build.tar.gz
tarfile="${appdir}/${tarname}"
cat > "${tarfile}"


# create dockerfile
echo "Making dockerfile"
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
echo "Building docker container"
docker build -t "warehouse:5000/${app_name}" "${appdir}"

# push to build host
echo "Pushing container to repository"
docker push "warehouse:5000/${app_name}"

# clean up
echo "Cleaning up"
rm -rf "${appdir}"
