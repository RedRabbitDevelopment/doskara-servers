#!/bin/bash
# USE: deploy.sh <APP_NAME>
# 
# The script, when given an application name, will run the following process:
# 1. Create an aws instance
# 2. Instantiate docker containers on that instance
# 3. Save instance information
# 4. Shut down existing aws instance for that app (if exists)

app=$1

MONGO_URI="oceanic.mongohq.com:10056/doskara"
MONGO_USER="doskara"
MONGO_PASS="DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn"

SCRIPT=$(cat <<EOF
(function() {
  try {
    var app = '$app';
    var info = db.atoms.findOne({image: app});
    if(!info) throw new Error('AtomNotFound');
    print(info.aws_instance + ' ' + info.aws_ip);
  } catch (e) {
    print('Error: ' + e.message);
  }
  return;
})();
EOF
)
read old_instance_id ipaddress <<< $(mongo --quiet --eval "$SCRIPT" "$MONGO_URI" -u "$MONGO_USER" "-p$MONGO_PASS")

# Create an aws instance
read new_instance_id internal_ip <<< $(aws ec2 run-instances --image-id ami-9cbdd2ac --security-group-ids sg-4b894a2e --instance-type t1.micro --subnet-id subnet-18739e7d --output text --query 'Instances[*].[InstanceId,PrivateIpAddress]')

echo "new $internal_ip"

expect -c "
spawn ssh -o StrictHostKeyChecking=no $internal_ip
expect \"assword\"
send \"foo,bar\r\"
expect \"\#\"
send \"mkdir /usr/local/doskara\r\"
expect \"\#\"
send \"apt-get install mongodb-clients\r\"
expect \"\#\"
send \"exit\r\"
"
expect -c "
spawn scp -o StrictHostKeyChecking=no \"./doskara-servers/hosts/dynos/start-container.sh\" $internal_ip:/usr/local/doskara/start-container.sh
expect \"assword\"
send \"foo,bar\"
"
expect -c "
spawn ssh -o StrictHostKeyChecking=no $internal_ip
expect \"assword\"
send \"foo,bar\"
/usr/local/doskara/start-container.sh $app
"
exit 0
aws ec2 terminate-instances --instance-ids "$new_instance_id"
