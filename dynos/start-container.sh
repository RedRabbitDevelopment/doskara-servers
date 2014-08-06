#!/bin/bash

usage="
usage: start-container.sh APPNAME [ DEPENDENCY ... ]

this script will start all DEPENDENCIES
then start APPNAME, linking in DEPENDENCIES
"
echo "HERE MAN"

MONGO_URI="oceanic.mongohq.com:10056/doskara"
MONGO_USER="doskara"
MONGO_PASS="DH3e4ZD0UWUsEwwtM7i6pfZulDdk0Bfn"

# Used to pass data back and forth to free up
# stdout. See http://stackoverflow.com/questions/3236871/how-to-return-a-string-value-from-a-bash-function#answer-3243034
ID_VAL=''

function start_container() {
  local app="$1"
  local version="$2"
  echo "Starting $app"
  
  local image_name="10.0.0.111:5000/$app"
  if [ -n "$version" ] ; then
    image_name+=".$version"
  fi
  echo "$image_name"
  
  local SCRIPT=$(cat <<EOF
(function() {
  try {
    var app = '$app';
    var version = '$version';
    var config = db.atoms.findOne({image: app, version: version});
    if(!config) throw new Error('AtomNotFound');
    config = config.config;
    var dependencies = config.dependencies || {};
    var dep_version;
    for(var dep_name in dependencies) {
      dep_version = dependencies[dep_name];
      print(dep_name + '\t' + dep_version);
    }
  } catch (e) {
    print('Error: ' + e.message);
  }
  return;
})();
EOF
  )
  local deps=$(mongo --quiet --eval "$SCRIPT" "$MONGO_URI" -u "$MONGO_USER" "-p$MONGO_PASS")
  if [[ ${deps:0:7} == "Error: " ]] ; then
    echo "$deps"
    echo "Atom $app with version $version doesn't exist."
    exit 101
  fi
  local link_args=()
  echo "Getting dependencies for $app"
  while read -r line; do
    local dep_name="$(echo $line | awk '{print $1}')"
    local dep_version="$(echo $line | awk '{print $2}')"
    if [ -n "$dep_name" ] && [ -n "$dep_version" ] ; then
      start_container "$dep_name" "$dep_version"
      echo "Built dependency with $ID_VAL"
      if [ $? -ne 0 ] ; then
        exit $?
      fi
      
      local container="$(docker inspect --format='{{.Name}}' "$ID_VAL")"
      # create flags for linking
      link_args+=("--link")
      link_args+=("$dep_name:$dep_name")
    fi
  done <<< $deps
  echo "pulling $app"
  docker pull "$image_name"
  echo "Running $app with ${link_args[@]}"
  if [ "$app" == "my_project" ] ; then
    ports="-p 80:80"
  else
    ports=""
  fi
  echo "ABOUT!"
  ID_VAL=$(docker run -d --name "$app" $ports ${link_args[@]} "$image_name" /bin/bash -c "/start web")
  echo "Setting logs for $app $ID_VAL"
  docker logs -f $ID_VAL &>> "/home/ubuntu/logs/${app}.log" &
  echo "Successfully started $app"
}

start_container "$1" "$2"
