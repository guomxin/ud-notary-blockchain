/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

//Importing levelSandbox class
const LevelSandboxClass = require('./levelSandbox.js');

// Creating the levelSandbox class object
const db = new LevelSandboxClass.LevelSandbox();

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    // Do nothing now
  }

  // Add new block
  addBlock(data){
    let self = this;
    let newBlock = new Block(data);
    return new Promise(function(resolve, reject) {
      self.getBlockHeight()
      .then((height) => {
        if (height == -1) {
          // No block in block chain, add genesis block first
          let genesisBlock = new Block("First block in the chain - Genesis block");
          genesisBlock.height = 0;
          genesisBlock.time = new Date().getTime().toString().slice(0,-3);
          genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
          db.addLevelDBData(genesisBlock.height, JSON.stringify(genesisBlock))
          .then((result) => {
            // Block height
            newBlock.height = 1;
            // UTC timestamp
            newBlock.time = new Date().getTime().toString().slice(0,-3);
            // previous block hash
            newBlock.previousBlockHash = genesisBlock.hash;
            // Block hash with SHA256 using newBlock and converting to a string
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            // Saving block object to LevelDB
            db.addLevelDBData(newBlock.height, JSON.stringify(newBlock))
            .then((result) => {
              resolve(newBlock);
            })
            .catch((err) => {
              reject(err);
            })
          })
          .catch((err) => {
            reject(err);
          })
        } else {
          // Block height
          newBlock.height = height + 1;
          // UTC timestamp
          newBlock.time = new Date().getTime().toString().slice(0,-3);
          // Get previous block
          self.getBlock(height)
          .then((prevBlock) => {
            newBlock.previousBlockHash = prevBlock.hash;
            // Block hash with SHA256 using newBlock and converting to a string
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            // Saving block object to LevelDB
            db.addLevelDBData(newBlock.height, JSON.stringify(newBlock))
            .then((result) => {
              resolve(newBlock);
            })
            .catch((err) => {
              reject(err);
            })
          })
          .catch((err) => {
            reject(err);
          })        
        }
      })
      .catch((err) => {
        console.log(err);
      })
    });
  }

  // Get block height
    getBlockHeight(){
      return new Promise(function(resolve, reject) {
        db.getDataCount()
        .then((count) => {
          resolve(count - 1);
        })
        .catch((err) => {
          reject(err);
        });
      });
    }

    // get block
    getBlock(blockHeight){
      return new Promise(function(resolve, reject) {
        db.getLevelDBData(blockHeight)
        .then((result) => {
          if (result) {
            resolve(JSON.parse(result));
          } else {
            resolve(undefined);
          }
        })
        .catch((err) => {
          reject(err);
        })
      });
    }

    // validate block
    validateBlock(blockHeight){
      let self = this;
      return new Promise(function(resolve, reject) {
        self.getBlock(blockHeight)
        .then((block) => {
          // get block hash
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';
          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash===validBlockHash) {
            resolve(true);
          } else {
            //console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
            resolve(false);
          }          
        })
        .catch((err) => {
          reject(err);
        })
      });
    }

   // Validate blockchain
    validateChain(){
      let self = this;
      return new Promise(function(resolve, reject) {
        db.getDataCount()
        .then((chainLength) => {
          let verifyPromises = [];
          let blockPromises = [];
          let errorLog = [];
          for (let i = 0; i < chainLength; i++) {
            verifyPromises.push(self.validateBlock(i));
            blockPromises.push(self.getBlock(i));
          }
          Promise.all(blockPromises).then((chain) => {
            for (let i = 0; i < chain.length-1; i++) {
              // compare blocks hash link
              let blockHash = chain[i].hash;
              let previousHash = chain[i+1].previousBlockHash;
              if (blockHash !== previousHash) {
                errorLog.push(i);
              }
            }
            // Get all blocks validating results
            Promise.all(verifyPromises).then((results) => {
              for (let i = 0; i < results.length; i++) {
                if (!results[i]) errorLog.push(i);
              }
              if (errorLog.length > 0) {
                console.log('Block errors = ' + errorLog.length);
                console.log('Blocks: '+errorLog);
                resolve(false);
              } else {
                resolve(true);
              }
            })
            .catch((err) => {
              reject(err);
            })
          })
          .catch((err) => {
            reject(err);
          })
        })
        .catch((err) => {
          reject(err);
        });
      }) 
    }
}

// Export the class
module.exports.Blockchain = Blockchain;