# doskara blueprint

One of the services offered by Amazon EC2 is snapshots of EC2 instances.  Such snapshots are called "AMIs".  These can be used to clone instances.  The basic method for cloning an instance is to:
  1. Stop the instance you want to clone.
  2. Create an AMI from that instance.
  3. Create a new instance using the AMI as a base.

The `blueprint` instance is used solely to create AMIs for cloning.  `blueprint`, as a host, offers no services of its own; it's used merely to create a uniform platform for cloning new doskara hosts.

## files in this directory

* [clone instance](clone_instance.md) describes how to create a cloned instance from the blueprint AMI and how to create an AMI from an instance.
* [new doskara instance](new_doskara_instance.md) describes how to create a new blueprint from scratch and what decisions were made in the process of creating the first ones.

## creating a new blueprint AMI for cloning

This is a really simple and intuitive process.  You can read about it on the [clone instance](clone_instance.md) page.

## currently available blueprint AMIs

AMIs are viewable by selecting the "AMI" menu in the Amazon EC2 console.  There are currently two instances available:
  * `ami-d0620de0`: the first blueprint created; do not use
  * `ami-9cbdd2ac`: the second blueprint created; this is the current version.

These images can be improved.  [The todo list](todo.md) describes possible upgrades that can be made to the blueprint.

## updating a blueprint AMI

To update a blueprint AMI, just:
  1. start the blueprint instance and log into it (you may need to assign it an IP in order to connect)
  2. make the desired changes
  3. stop the instance
  4. create a new AMI as described [here](clone_instance.md)
