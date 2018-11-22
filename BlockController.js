const BlockchainClass = require('./simpleChain.js');

const TimeoutRequestsWindowTime = 5*60*1000;

const BitcoinMessage = require('bitcoinjs-message');

const hex2ascii = require('hex2ascii')


class RequestObject{
    constructor(address){
     this.walletAddress = address;
     this.requestTimeStamp = "";
     this.message = "";
     this.validationWindow = 0;
    }
}

class ValidRequestObject {
    constructor() {
        this.registerStar = false;
        this.status = {};
    }
}

/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class BlockController {

    /**
     * Constructor to create a new BlockController, you need to initialize here all your endpoints
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.blockChain = new BlockchainClass.Blockchain();
        this.getBlockByHeight();
        this.getBlockByHash();
        this.getBlocksByAddress();

        this.mempool = [];
        this.mempoolValid = [];
        this.timeoutRequests = [];
        this.requestValidation();
        this.validate();
        this.block();
    }

    /**
     * Implement a GET Endpoint to retrieve a block by height, url: "/block/:height"
     */
    getBlockByHeight() {
        let self = this;
        self.app.get("/block/:height", (req, res) => {
            let height = req.params.height;
            self.blockChain.getBlock(height)
            .then((result) => {
                if (result) {
                    if (result.body.star) {
                        result.body.star.storyDecoded = hex2ascii(result.body.star.story);
                    }
                    res.send(result);
                } else {
                    // undefined means no such block
                    res.status(404).send(`No such block with height:${height}`);
                }
            })
            .catch((err) => {
                res.status(500).send(`Error occurs while fetching block with height:${height}`);
            })
        });
    }

    /**
     * Implement a GET Endpoint to retrieve a block by hash, url: "/block/hash::hash"
     */
    getBlockByHash() {
        let self = this;
        self.app.get("/stars/hash::hash", (req, res) => {
            let hash = req.params.hash;
            self.blockChain.getBlockByHash(hash)
            .then((result) => {
                if (result) {
                    if (result.body.star) {
                        result.body.star.storyDecoded = hex2ascii(result.body.star.story);
                    }
                    res.send(result);
                } else {
                    // undefined means no such block
                    res.status(404).send(`No such block with hash:${hash}`);
                }
            })
            .catch((err) => {
                res.status(500).send(`Error occurs while fetching block with hash:${hash}`);
            })
        });
    }

    /**
     * Implement a GET Endpoint to retrieve blocks by address, url: "/block/address::address"
     */
    getBlocksByAddress() {
        let self = this;
        self.app.get("/stars/address::address", (req, res) => {
            let address = req.params.address;
            self.blockChain.getBlocksByAddress(address)
            .then((result) => {
                if (result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        result[i].body.star.storyDecoded = hex2ascii(result[i].body.star.story);
                    }
                    res.send(result);
                } else {
                    // undefined means no such block
                    res.status(404).send(`No such block with address:${address}`);
                }
            })
            .catch((err) => {
                res.status(500).send(`Error occurs while fetching block with address:${address}`);
            })
        });
    }

    /**
     * Implement a POST Endpoint to submit a validation request, url: "/requestValidation"
     */    
    requestValidation() {
        let self = this;
        self.app.post("/requestValidation", (req, res) => {
            let address = req.body.address;
            if (address) {
                if (address in self.mempool) {
                // The same request is already in the mempool.
                    let request = self.mempool[address];
                    let timeElapse = (new Date().getTime().toString().slice(0,-3)) - request.requestTimeStamp;
                    let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
                    request.validationWindow = timeLeft;
                    res.status(200).send(request);
                } else {
                    let request = new RequestObject(address);
                    request.requestTimeStamp = (new Date().getTime().toString().slice(0,-3));
                    request.validationWindow = TimeoutRequestsWindowTime / 1000;
                    request.message = address + ":" + request.requestTimeStamp
                        + ":starRegistry";
                    self.mempool[address] = request;
                    self.timeoutRequests[address]=setTimeout(function(){ 
                        self.removeValidationRequest(address) 
                        }, TimeoutRequestsWindowTime);
                    res.status(200).send(request);
                }
            } else {
                res.status(500).send("There is no address!");
            }
        });
    }

    removeValidationRequest(walletAddress) {
        if (walletAddress in this.mempool) {
            console.log(`${walletAddress} request, remove it from mempool.`);
            delete this.mempool[walletAddress];
            clearTimeout(this.timeoutRequests[walletAddress]);
            delete this.timeoutRequests[walletAddress];
        }
    }

    /**
     * Implement a POST Endpoint to validate message signature, url: "/message-signature/validate"
     */    
    validate() {
        let self = this;
        self.app.post("/message-signature/validate", (req, res) => {
            let address = req.body.address;
            let signature = req.body.signature;
            if (address && signature) {
                if (address in self.mempool) {
                    let request = self.mempool[address];
                    // Verify time left information
                    let timeElapse = (new Date().getTime().toString().slice(0,-3)) - request.requestTimeStamp;
                    let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
                    request.validationWindow = timeLeft;
                    if (request.validationWindow <= 0) {
                        res.status(500).send(`${address} request is time out!`);
                    } 

                    // Verify the signature
                    let isValid = false;
                    try {
                        isValid = BitcoinMessage.verify(request.message, address, signature);    
                    } catch (err) {
                        isValid = false;
                    }
                    
                    if (!isValid) {
                        console.log(`Signature invalid!\n\tMessage:${request.message}\n\tAddress:${address}\n\tSignature:${signature}`);
                        res.status(500).send("Signature isn't valid!");
                    } else {
                        let validRequest = new ValidRequestObject();
                        validRequest.registerStar = true;
                        validRequest.status = {
                            address: request.walletAddress,
                            requestTimeStamp: request.requestTimeStamp,
                            message: request.message,
                            validationWindow: request.validationWindow,
                            messageSignature: true
                        };
                        self.mempoolValid[address] = validRequest;
                        res.status(200).send(validRequest);
                        // Remove from timeout array and mempool
                        self.removeValidationRequest(address);
                    }

                } else {
                    res.status(500).send(`${address} request is time out or not exist!`);
                }
            } else {
                res.status(500).send("There is no address or signature!");
            }
        });
    }

     /**
     * Implement a POST Endpoint to register star, url: "/block"
     */    
    block() {
        let self = this;
        self.app.post("/block", (req, res) => {
            let address = req.body.address;
            let star = req.body.star;
            if (address && star) {
                if (address in self.mempoolValid) {
                    let validRequest = self.mempoolValid[address];
                    // Verify time left information
                    let timeElapse = (new Date().getTime().toString().slice(0,-3)) - validRequest.status.requestTimeStamp;
                    let timeLeft = (TimeoutRequestsWindowTime/1000) - timeElapse;
                    validRequest.status.validationWindow = timeLeft;
                    if (validRequest.status.validationWindow <= 0) {
                        delete self.mempoolValid[address];
                        res.status(500).send(`${address} request is time out!`);
                    } else {
                        let starStory = star.story;
                        if (starStory.length > 500) {
                            starStory = starStory.slice(0, 500);
                        }
                        let blockBody = {
                            address: address,
                            star: {
                                ra: star.ra,
                                dec: star.dec,
                                story: Buffer(starStory).toString('hex')
                            }
                        }
                        self.blockChain.addBlock(blockBody)
                        .then((result) => {
                            // Decode story
                            result.body.star.storyDecoded = hex2ascii(result.body.star.story);
                            // During the validation window, user can only register a single star.
                            // Once user has registered a star, remove validation request from mempool.
                            delete self.mempoolValid[address];
                            res.send(result);
                        })
                        .catch((err) => {
                            res.status(500).send("Error occurs while adding star block data!");
                        })
                    }
                } else {
                    res.status(500).send("Address hasn't been validated!");
                }
            } else {
                res.status(500).send("There is no address or star!");
            }
        });
    }
}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}