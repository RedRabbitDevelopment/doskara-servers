
The mongo server partitions mongo databases for the individual atom instances. To build the host, set up a server somewhere, and the run the following command on your local machine:

```
./build <hostname>
```

This script installs mongo on the remote machine, and copies the local scripts onto the remote server. You can then partition a database for an atom instance with the following command:

```
ssh ubuntu@<hostname> "~/getuser <unique-id>"
```
And you'll get a JSON-formatted user:
```
{
  "success":true,
  "db":"RPRZhKUkPWvssG3x",
  "username":"MXqLBU6EmsdZ26go",
  "password":"Z7YthtgROD6AMyh3hvDvO8oQj29DsI7y"
}
```

The unique id gives you the ability to get the same user later on. For example, running the same command twice:
```
ssh ubuntu@mongo.doskara.com "~/getuser project:atom1:145"
ssh ubuntu@mongo.doskara.com "~/getuser project:atom1:145"
```
will give you the same database and user both times.

