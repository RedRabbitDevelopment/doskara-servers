## warehouse - the doskara docker image repository

This host is pretty straightforward. Here is what I have done to set it up:
* Created a new virtual disk, partitioned it, and attached it to /data
* Started up the registry, listening on port 5000 for incoming requests, and using /data as the volume for storing images. See the `run-registry.sh` script for details
* Configured Amazon VPC networking to allow for tcp connections on port 5000 on the doskara-dev subnet.

There are still some things to do:
* Tighten Amazon firewall. Only port 5000 on warehouse should be open, but current configurations are looser than that. However, port 5000 is not available to the outside world.
* Figure out how to start the registry on bootup. This should be fairly easy; I believe there are directions in the Docker documentation.
