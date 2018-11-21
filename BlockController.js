const BlockchainClass = require('./simpleChain.js');

const TimeoutRequestsWindowTime = 0.5*60*1000;

class RequestObject{
    constructor(address){
     this.walletAddress = address;
     this.requestTimeStamp = "";
     this.message = "";
     this.validationWindow = 0;
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
        this.timeoutRequests = [];
        this.requestValidation();
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
                req.status(500).send("This is no address!");
            }
        });
    }

    removeValidationRequest(walletAddress) {
        console.log(`${walletAddress} request is time out, remove it from mempool.`);
        delete this.mempool[walletAddress];
        delete this.timeoutRequests[walletAddress];
    }
}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}