## factory - the doskara build host

There is only one script in here at the moment: The build script, `build.sh`. This script accepts a gzipped tarball on stdin and an application name as its first and only argument. Then the script builds a new docker image from the application tarball and pushes it to the remote docker image registry. The new image will be tagged with the application name supplied as the argument to the script. Here is how to invoke the script, assuming our application is called *myapp* and the tarball containing *myapp* is called `myapp.tar.gz`:

    doskara-admin@factory $ /usr/local/doskara/build.sh myapp < myapp.tar.gz

More likely, however, you will be invoking the build script from a remote machine (e.g., the doskara git server, a.k.a. "port"). Here is how you invoke the script remotely:

    doskara-admin@port $ ssh factory "/usr/local/doskara/build.sh myapp" < myapp.tar.gz

(In the future, we will create a "docker" user for this host, through which all docker commands must be run. So eventually the ssh command will change to `ssh docker@factory ...`. But not yet.)

The build script will report all relevant information back to stdout so that you are free to look at it/log it/whatever.

In addition, the build script will implement some basic error-checking and sanity-checking. These checks will be documented here when they are implemented.
