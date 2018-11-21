/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';

class LevelSandbox {
  constructor() {
    this.db = level(chainDB);
  }

  // Add data to levelDB with key/value pair
  addLevelDBData(key,value){
    let self = this;
    return new Promise(function(resolve, reject) {
      self.db.put(key, value, function(err) {
        if (err) {
          console.log('Block ' + key + ' submission failed', err);
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  // Get data from levelDB with key
  getLevelDBData(key){
    let self = this;
    return new Promise(function(resolve, reject) {
      self.db.get(key, function(err, value) {
        if (err) {
          if (err.type == 'NotFoundError') {
            resolve(undefined);
          } else {
            console.log('Block ' + key + ' get failed', err);
            reject(err);
          }
        } else {
          resolve(value);
        }
      });
    });
  }

  // Add data to levelDB with value
  addDataToLevelDB(value) {
    let self = this;
    return new Promise(function(resolve, reject) {
      let i = 0;
      self.db.createReadStream().on('data', function(data) {
        i++;
      }).on('error', function(err) {
        console.log('Unable to read data stream!', err);
        reject(err);
      }).on('close', function() {
        return self.addLevelDBData(i, value)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          reject(err);
        });
      });
    });
  }

  // Get data count
  getDataCount() {
    let self = this;
    return new Promise(function(resolve, reject) {
      let i = 0;
      self.db.createReadStream().on('data', function(data) {
        i++;
      }).on('error', function(err) {
        console.log('Unable to read data stream!', err);
        reject(err);
      }).on('close', function() {
        resolve(i);
      });
    });
  }  
}

// Export the class
module.exports.LevelSandbox = LevelSandbox;