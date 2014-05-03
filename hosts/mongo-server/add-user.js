var username, password, dbname, db, connection, possible,
  existingDatabases, result;

if(typeof db_id !== 'undefined' && db_id) {
  db = db.getSiblingDB('administration');
  connection = db.connections.findOne({db_id: db_id});
  if(connection) {
    username = connection.username;
    password = connection.password;
    dbname = connection.dbname;
  } else {
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz0123456789';
    function random(num) {
      var text = "", randomInt;

      for( i=0; i < num; i++ ) {
        randomInt = Math.floor(Math.random() * possible.length);
        text += possible.charAt(randomInt);
      }
      return text;
    }

    existingDatabases = db.getMongo().getDBNames();
    do {
      dbname = random(16);
    } while(-1 !== existingDatabases.indexOf(dbname));
    username = random(16);
    password = random(32);

    db.connections.insert({
      db_id: db_id,
      username: username,
      password: password,
      dbname: dbname
    });
    db = db.getSiblingDB(dbname);
    db.addUser({user: username, pwd: password, roles: ['readWrite']});
  }

  result = {
    success: true,
    db: dbname,
    username: username,
    password: password
  };
} else {
  result = {success: false, error: 'db_id not defined'};
}
print(JSON.stringify(result));
