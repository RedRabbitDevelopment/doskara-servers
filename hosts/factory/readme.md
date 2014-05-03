## factory - the doskara build host

There is only one script in here at the moment: The build script, `build.sh`. This script accepts a gzipped tarball on stdin and an application name as its first and only argument. Then the script builds a new docker image from the application tarball and pushes it to the remote docker image registry. The new image will be tagged with the application name supplied as the argument to the script. Here is how to invoke the script, assuming our application is called *myapp* and the tarball containing *myapp* is called `myapp.tar.gz`:

    doskara-admin@factory $ /usr/local/doskara/build.sh myapp < myapp.tar.gz

More likely, however, you will be invoking the build script from a remote machine (e.g., the doskara git server, a.k.a. "port"). Here is how you invoke the script remotely:

    doskara-admin@port $ ssh factory "/usr/local/doskara/build.sh myapp" < myapp.tar.gz

The tarball needs to be in a specific format.  We can change this format, but this is the easiest format to work with.  All files need to be located in the root of the tarball, and there needs to exist two shell scripts, `build.sh` and `run.sh`, which are used to build and run the app, respectively.  For instance, the following format is acceptable:

    + my-files/
        - foo.py
        - bar.py
        - index.html
    - build.sh
    - run.sh
    - my-server.py

The following format will cause a build error:

    + my-app/
        + my-files/
            - foo.py
            - bar.py
            - index.html
        - build.sh
        - run.sh
        - my-server.py

(In the future, we will create a "docker" user for this host, through which all docker commands must be run. So eventually the ssh command will change to `ssh docker@factory ...`. But not yet.)

The build script will report all relevant information back to stdout so that you are free to look at it/log it/whatever.

In addition, the build script will implement some basic error-checking and sanity-checking. These checks will be documented here when they are implemented.

**WARNING:** Due to [a bug with the pre-production release of Docker](https://github.com/dotcloud/docker/issues/2714), Docker images may be difficult or impossible to remove.  As a result, the build host will accumulate images very quickly and can easily fill up small disks.  Please keep this in mind on the development environment, and hopefully we can find a fix/workaround soon!
