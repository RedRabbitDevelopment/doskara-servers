## warehouse - the doskara docker image repository

This host serves the docker image repository (called a "registry" in docker parlance).  The registry is itself a docker container; the images are stored within and served from the container, not the host itself.

This host is pretty straightforward. Here is what I have done to set it up:
* Created a new virtual disk, partitioned it, and attached it to the mountpoint `/data`
* Started up the registry, listening on port 5000 for incoming requests, and using `/data` as the volume for storing images. See the `run-registry.sh` script for details
* Configured Amazon VPC networking to allow for tcp connections on port 5000 between hosts on the doskara-dev subnet.

There are still some things to do:
* Tighten Amazon firewall. Only port 5000 on warehouse should be open, but current configurations are looser than that. However, port 5000 is not available to the outside world.
* Figure out how to start the registry on bootup. This should be fairly easy; I believe there are directions in the Docker documentation.

### Starting & stopping the repository

In most cases, starting the container is just as easy as running the script:

    $ /usr/local/doskara/run-registry.sh

If you want the dirty details, here they are: The repository is just a specialized docker container.  You will need to start it and stop it just like any other container.  In addition, it needs to listen for incoming connections (port 5000 is the usual choice for the docker image repository). Altogether, starting the repository looks something like this:

    $ docker run -p 5000:500 registry

In addition, `/data` on the warehouse host is a separate storage volume.  This is for two reasons:
 * to improve stability & flexibility of the warehouse host
 * to allow the image repository to be attached to different/multiple hosts

In order for the docker container to mount `/data`, the `-v` flag must be passed to `docker run`.  `/tmp/registry` is the location of the docker image repository on the container.  Hence:

    $ docker run -p 5000:5000 -v /data:/tmp/registry registry

To stop the container, you first need the ID of the running container.  To get it, just run:

    $ docker ps

You should see output along the lines of:

    CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS              PORTS                    NAMES
    377d5babbb6b        registry:0.6.5      /bin/sh -c cd /docke   23 seconds ago      Up 22 seconds       0.0.0.0:5000->5000/tcp   goofy_einstein

The ID is the first field.  So to stop the container, pass the ID to the `docker stop` command:

    $ docker stop 377d5babbb6b

If you want to restart a stopped container, just use `docker start`:

    $ docker start 377d5babbb6b
