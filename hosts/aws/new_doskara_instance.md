## New Doskara Instance

1. Launch a new instance from the Amazon EC2 console.
  1. Select your OS. Ubuntu 13.10 was my choice, because it comes loaded with the proper kernel version necessary to run LXC (the Linux namespace architecture underlying Docker containers), Docker officially supports installation on Ubuntu, and because Ubuntu is more familiar and easier to learn for those who have never used an enterprise-grade Linux OS before. Red Hat (RHEL) 6.4 and Amazon Linux are also good choices.
  2. Choose your instance type. This is probably t1.micro.
  3. Configure instance details. This contains important stuff like networking information, but much of it can be changed later, after the instance has already been launched. Pay attention to these options:
    * Network: choose the Doskara Virtual Private Cloud (VPC) (should be the 10.0.0.0/16 network). This is the private network where the new instance will live. We want to keep our new instance on the same private network as our existing services.
    * Subnet: Choose an appropriate subnet from the list. These subnets live inside the Doskara VPC. For instance: doskara-dev (10.0.0.0/24), doskara-prod (10.0.1.0/24). Create a new subnet if the new instance is part of a new system.
    * Public IP: do **not** assign a public IP to this machine. If you assign a public IP at this stage, there is no guarantee that it will be a static IP. If you want a public, static IP, you can provision an IP for the instance later.

  4. Add storage: Choose the size of the virtual HDD to add to your instance. Use your best discretion. 
  5. Tag instance: Give your instance a memorable name. This name is *only* used to identify the instance inside the EC2 console. You can change the actual hostname later.
  6. Configure security group: This is important to be able to access your instance publicly. Choose an existing security group to put this instance behind the same firewall as others. Choose "launch-wizard-1", which is the security group for the rest of the Doskara instances.
  7. Review and Launch. You will likely need to set up a public/private key pair so that you can connect to your new instance for the first time.

2. If your instance needs to be accessible from the Internet, give it an Elastic IP. If you only need to access it via other Doskara instances, then you can SSH to your new instance via existing ones on the same subnet. If this is the first instance on a new VPC, it needs a public IP in order for you to SSH to it.
  1. Under "Network & Security", choose "Elastic IPs".
  2. Click "Allocate New Address" in the top left corner and confirm.
  3. When the address has been allocated, it needs to be associated. Left-click the new address and choose "Associate Address".
  4. In the pop-up menu, type the name you assigned to your new instance. You will need to wait for your new instance to fully start before you can associate the address.
  5. Done. The new, public IP address will be viewable from the EC2 Instances console.

3. Login to the new instance using SSH: `ssh -i path/to/private-key.pem ubuntu@xx.xx.xx.xx`
4. Configure the new instance.
  1. Create new users and groups.
    * On Ubuntu: Create the `doskara` group: `sudo addgroup doskara`. Then, for each new user you wish to add, run `sudo adduser --ingroup doskara [username]`.
    * On Amazon Linux / RHEL: Use the `useradd` tool and manually create home directories and manually copy dotfiles from `/etc/skel`. You will also need to manually create groups and add users to groups using the `vigr` tool.

  2. Set user passwords using `sudo passwd [username]`.
  3. Give members of the doskara group sudo permissions. Add the following line to `/etc/sudoers` using the command `sudo visudo`:

     ``` 
     %doskara    ALL=(ALL) ALL
     ```

  4. Configure SSH. We want to allow password authentication, but disallow logging in as root. Change the following lines:

     ```
     PermitRootLogin yes
     
     PasswordAuthentication no
     ```

     to:

     ```
     PermitRootLogin no
     
     PasswordAuthentication yes
     ```

  5. Ensure that you can log in as one of the new users by running `ssh [username]@[ip address]` from a remote machine. You can copy over ssh keys to the new user at this time if you wish.
  6. While logged in as a new user, ensure that your sudo privileges are working by running: `sudo -l` and confirming that the user has `ALL` permissions.
  7. Install necessary software. Run the following commands:

     ```
     sudo apt-get update -y
     sudo apt-get install -y git
     ```

  8. Install docker. Follow the docker documentation.
    * Ubuntu: http://docs.docker.io/en/latest/installation/ubuntulinux/
    * RHEL: http://docs.docker.io/en/latest/installation/rhel/
    * Amazon Linux: http://docs.docker.io/en/latest/installation/amazon/

  9. Change the hostname if you wish by editing `/etc/hostname`.
  9. Since Amazon does not allow us to modify DNS entries on our private subnet, we can use `/etc/hosts` instead (or set up a name server, but that takes substantial extra effort). In `/etc/hosts`, add the `[private ip address] [hostname]` combination for every host on the Doskara VPC that you wish to connect to by hostname. Also, if you changed the hostname in `/etc/hostname`, add `127.0.0.1 [hostname]`.
  9. Cleanup. Remove sudo privileges from the default user and remove the default account. **MAKE SURE ALL PREVIOUS STEPS ARE COMPLETE BEFORE DOING THIS!** You may not be able to log in to your machine otherwise.
    * Remove sudo privileges. Comment out the following line in `/etc/sudoers.d/90-cloud-init-users`:

        ```
        ubuntu ALL=(ALL) NOPASSWD:ALL
        ```

    * Remove the default user. Use `sudo deluser ubuntu` on ubuntu. Use the manual method and the `userdel` on RHEL / Amazon Linux.

6. Reboot, ensure everything comes back up properly and you can log in as one of the new users, and you are ready to rock and roll!
