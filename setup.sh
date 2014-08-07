sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install git-core
sudo apt-get install nodejs
sudo apt-get install mongodb-clients
sudo mkdir /usr/local/doskara
cd /usr/local/doskara
sudo chown root:ubuntu -R /usr/local/doskara
sudo chmod g+w -R /usr/local/doskara
git clone git@github.com:RedRabbitDevelopment/doskara-servers.git
cd /usr/local/doskara/doskara-servers

# Docker
# http://docs.docker.com/installation/ubuntulinux/
sudo apt-get update
sudo apt-get install docker.io
sudo ln -sf /usr/bin/docker.io /usr/local/bin/docker
sudo sed -i '$acomplete -F _docker docker' /etc/bash_completion.d/docker.io
