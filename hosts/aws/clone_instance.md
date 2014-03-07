## Create new image from existing instance

1. First, stop your instance. Wait for it to fully stop.
2. From the EC2 Instances console, right-click the instance and choose "Create Image". Wait for your image to be created.
3. Verify that the image has been created by going to Images > AMIs in the EC2 dashboard. 

## Create new instance from existing image

1. Launch a new instance from the EC2 Instances console.
2. Follow the instructions in "new_doskara_instance.md" for launching a new instance, but instead of choosing an OS, select "My AMIs" and choose an image to clone from. You do not need to set up a key pair for the new instance; just use login credentials for the image from which the new instance was cloned.
3. Set up a new Elastic IP if this instance needs to be accessible from the Internet. Follow the instructions in "new_doskara_instance.md" for setting up an Elastic IP.
4. Login over SSH. You are ready to start using your instance.
5. Change `/etc/hostname` and `/etc/hosts` if necessary.
