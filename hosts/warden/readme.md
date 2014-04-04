## Doskara warden (dyno manager)

This host will start, stop, and run commands on the doskara dynos using the AWS cli.  The cli can be invoked with the `aws` command.  See the [AWS cli documentation](http://aws.amazon.com/cli/) for more info.

### Scripts in this directory

* `get-instance-id.sh NAME`: Outputs the instance tagged with the given NAME.

### Setting up the cli

You need to authorize the cli with AWS IAM in order for it to be allowed to run AWS commands on your behalf.  See AWS documentation for details on how to do this (I set it up once and promptly forgot how to do it again).

### Using the cli to clone an image

You need to clone from an existing image (AMI).  You can get a json object representing your AMIs with the command:

    $ aws ec2 describe-images --owner self

Look for the "ImageId" field, because that contains the value we need in order to clone an image.  Once you have the image id, run the command:

    $ aws ec2 run-instances --image-id <image-id>

In addition, we need to specify some extra parameters, such as instance size, subnet, and so on.  For instance:

    $ aws ec2 run-instances --image-id ami-9cbdd2ac --security-group-ids sg-4b894a2e --instance-type t1.micro --subnet-id subnet-18739e7d

This will launch a new t1.micro instance on the doskara-dev-apps subnet in the doskara-dev-apps-security security group.

### Getting instance info from aws cli

[See this page in the AWS cli documentation](http://docs.aws.amazon.com/cli/latest/userguide/controlling-output.html).  Basically, use a combination of the `--query` flag along with, `sed`, `grep`, `awk`, etc. to get the information you want.  It's cumbersome, but so is the AWS cli, so you'll have to live with it.

### Managing a running instance (a.k.a. structure)

Structures (previously known as dynos) are AWS hosts running applications contained in docker containers.  Management is done through ssh.  As long as the structure is brought up from the proper blueprint and on the proper security group, then doskara@warden can simply SSH to the structure to perform management tasks.
