# Private Blockchain Notary Service

 Build a Star Registry Service using [Express.js](https://expressjs.com) framework that allows users to claim ownership of their favorite star in the night sky.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

Installing Node and NPM is pretty straightforward using the installer package available from the [Node.js web site](https://nodejs.org/en/).

### Configuring your project

- Install project dependencies
```
npm install
```
- Run 
```
node app.js
```

### Endpoints
- Submit a validation request (POST)
  - http://localhost:8000/requestValidation
  - Users start out by submitting a validation request
  - Input
    - wallet address
  ```
  {
    "address":"19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL"
  }
  ```
  - Output
    - wallet address
    - timestamp of request
    - returned message needed to be signed by your private key
    - remaining validation time (s)
  ```
  {
    "walletAddress": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
    "requestTimeStamp": "1541605128",
    "message": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL:1541605128:starRegistry",
    "validationWindow": 300
  }
  ```

- Validate message signature (POST)
  - http://localhost:8000/message-signature/validate
  - Web API post endpoint validates message signature with JSON response
  - Input
    - wallet address
    - signature by signing message returned in validation request step
  ```
  {
    "address":"19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
    "signature":"H8K4+1MvyJo9tcr2YN2KejwvX1oqneyCH+fsUL1z1WBdWmswB9bijeFfOfMqK68kQ5RO6ZxhomoXQG3fkLaBl+Q="
  }
  ```
  - Output
    - result shows that your request in valid
  ```
  {
    "registerStar": true,
    "status": {
        "address": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
        "requestTimeStamp": "1541605128",
        "message": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL:1541605128:starRegistry",
        "validationWindow": 200,
        "messageSignature": true
    }
  }
  ```

- Star registration (POST)
  - http://localhost:8000/block
  - Star object and properties are stored within the body of the block.Star properties include the coordinates with encoded story
  - Input
    - wallet address and star information
  ```
  {
    "address": "19xaiMqayaNrn3x7AjV5cU4Mk5f5prRVpL",
    "star": {
            "dec": "68° 52' 56.9",
            "ra": "16h 29m 1.0s",
            "story": "Found star using https://www.google.com/sky/"
    }
  }
  ```
  - Output
    - the returned block with decoded story

- Get star block by hash (GET)
  - http://localhost:8000/stars/hash:[HASH]
  - Response includes entire star block contents along with the addition of star story decoded to ascii

- Get star block by address (GET)
  - http://localhost:8000/stars/address:[ADDRESS]
  - Response includes entire star block contents along with the addition of star story decoded to ascii.Multiple stars might be registered to a single blockchain identity.The response support multiple star blocks

- Get star block by height (GET)
  - http://localhost:8000/block/[HEIGHT]
  - Response includes entire star block contents along with the addition of star story decoded to ascii