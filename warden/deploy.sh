#!/bin/bash
# USE: deploy.sh <APP_NAME>
# 
# The script, when given an application name, will run the following process:
# 1. Create an aws instance
# 2. Instantiate docker containers on that instance
# 3. Save instance information
# 4. Shut down existing aws instance for that app (if exists)

echo "HERE"
cat >> ./testfile.tz

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
read new_instance_id internal_ip <<< $(aws ec2 run-instances --image-id ami-d57a00e5 --security-group-ids sg-00810465 --instance-type t2.micro --subnet-id subnet-03739e66 --output text --query 'Instances[*].[InstanceId,PrivateIpAddress]')

echo "new $internal_ip"

cat | ssh -i ~/.ssh/yourdeveloperfriend.pem ubuntu@$internal_ip "sudo /usr/local/doskara/start-container.sh \"$app\" \"\"" 

if [[ -n "$old_instance_id" && "$old_instance_id" -ne "undefined" ]]; then
  aws ec2 terminate-instances --instance-ids "$old_instance_id"
fi
SCRIPT=$(cat <<EOF
(function() {
  try {
    var app = '$app';
    var instanceId = '$new_instance_id';
    var ipAddress = '$internal_ip';
    var info = db.atoms.update({
      image: app,
      aws_instance: instanceId,
      aws_ip: ipAddress
    });
  } catch (e) {
    print('Error: ' + e.message);
  }
  return;
})();
EOF
)
read old_instance_id ipaddress <<< $(mongo --quiet --eval "$SCRIPT" "$MONGO_URI" -u "$MONGO_USER" "-p$MONGO_PASS")
