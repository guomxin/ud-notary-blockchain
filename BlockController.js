const BlockchainClass = require('./simpleChain.js');

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
}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}