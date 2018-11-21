const BlockchainClass = require('./simpleChain.js');

const TimeoutRequestsWindowTime = 5*60*1000;

const BitcoinMessage = require('bitcoinjs-message');

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
        this.getBlockByIndex();
        this.postNewBlock();

        this.mempool = [];
        this.validRequests = [];
        this.timeoutRequests = [];
        this.requestValidation();
        this.validate();
    }

    /**
     * Implement a GET Endpoint to retrieve a block by index, url: "/block/:index"
     */
    getBlockByIndex() {
        let self = this;
        self.app.get("/block/:index", (req, res) => {
            let index = req.params.index;
            self.blockChain.getBlock(index)
            .then((result) => {
                if (result) {
                    res.send(result);
                } else {
                    // undefined means no such block
                    res.status(404).send(`No such block with index:${index}`);
                }
            })
            .catch((err) => {
                res.status(500).send(`Error occurs while fetching block with index:${index}`);
            })
        });
    }

    /**
     * Implement a POST Endpoint to add a new Block, url: "/block"
     */
    postNewBlock() {
        let self = this;
        self.app.post("/block", (req, res) => {
            let data = req.body.body;
            if (data) {
                self.blockChain.addBlock(data)
                .then((result) => {
                    res.send(result);
                })
                .catch((err) => {
                    res.status(500).send("Error occurs while adding block data!");
                })
            } else {
                res.status(500).send("There is no data payload!");
            }
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
                    self.timeoutRequests[address]=setTimeout(function(){ self.removeValidationRequest(address) }, TimeoutRequestsWindowTime);
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
                    let isValid = BitcoinMessage.verify(request.message, address, signature);
                    if (!isValid) {
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
                        self.validRequests[address] = validRequest;
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
}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}