# iov42 Core SDK

This repository contains the iov42 core SDK for typescript/javascript, that can be used to interact with the iov42 platform.

 Below you can find instructions on how to install and use this library. For additional information, including description of
 all public methods with examples, visit our [Wiki](https://github.com/iov42/core-sdk-typescript/wiki).

## Installation and setup

The prerequisites for installing the SDK are `git` and Node.js (version 10 or higher).

Clone the repository with the example code, install all dependencies, and build package:
```shell
$ git clone https://github.com/iov42/core-sdk-typescript.git
$ cd core-sdk-typescript
$ npm install
```

## Running automated tests

Before running the tests, you need to create the environment variable ENDPOINT_URL, and set it to the url of the api server.

You can run the test cases by using the npm tool:
```console
$ npm run test
```

## Using the SDK in Node.js applications

The following code snipets show how to use the SDK.

### Importing library and instantiating the platform client.
```node
import { PlatformClient, PlatformUtils } from '../iov42/core-sdk';

const rpcUrl = "api endpoint";
const client = new PlatformClient(rpcUrl);
const utils = new PlatformUtils();
```

### Generating an ECDSA key pair.
```node
const keyPair = utils.generateKeypairWithProtocolId("SHA256WithECDSA" as ProtocolIdType);
```

### Generating an RSA key pair.
```node
const keyPair = utils.generateKeypairWithProtocolId("SHA256WithRSA" as ProtocolIdType);
```

### Creating an identity.
```node
import { v4 as uuidv4 } from "uuid";
const requestId = uuidv4();
const identityId = uuidv4();
const protocolId: ProtocolIdType = "SHA256WithECDSA";
const keyPair = utils.generateKeypairWithProtocolId(protocolId, identityId);
const request = {
    requestId : requestId,
    identityId : identityId,
    publicCredentials : {
        key: keyPair.pubKeyBase64,
        protocolId: keyPair.protocolId
    },
};
return client.createIdentity(request, keyPair)
.then( (response) => {
    console.log(JSON.stringify(response));
})
```

### Retrieving an identity.
```node
return client.getIdentity(identityId, keyPair)
.then( (response) => {
    console.log(JSON.stringify(response));
})
```

## Using the SDK in Web applications

The following code snipets show how to use the SDK.

### Importing library and instantiating the platform client.
```html
<script src="../dist/iov42.min.js"></script>
<script type="module">
    const platformClient = new iov42.PlatformClient("api endpoint");
    const platformUtils = new iov42.PlatformUtils();
</script>
```

### Generating an ECDSA key pair, creating an identity and retrieving it
```html
<script type="module">
    import { v4 as uuidv4 } from 'https://jspm.dev/uuid';
    const platformClient = new iov42.PlatformClient("api endpoint");
    const platformUtils = new iov42.PlatformUtils();
    const requestId = uuidv4();
    const identityId = uuidv4();
    const protocolId = "SHA256WithECDSA";
    const keyPair = platformUtils.generateKeypairWithProtocolId(protocolId, identityId);
    const request = {
        requestId : requestId,
        identityId : identityId,
        publicCredentials : {
            key: keyPair.pubKeyBase64,
            protocolId: protocolId
        },
    };
    platformClient.createIdentity(request, keyPair)
    .then ((response) => {
        console.log(JSON.stringify(response));
        return platformClient.getIdentity(identityId, keyPair )
    })
    .then ((response) => {
        console.log(JSON.stringify(response));
    })
</script>
```

## Library structure

The iov42 folder contains the main source files:
- `core-sdk.ts` exports the PlatformClient class with all the functions to interact with the iov42 platform.
- `utils.ts` exports the PlatformUtils class with helper functions to interact with the iov42 platform.

The tests folder contains the automated tests:
- `identity.ts` uses the SDK functions to work with identities.
- `delegate-identity.ts` uses the SDK functions to add & retrieve identity's delegates.
- `create-keypair.ts` uses the SDK functions to create a key pair.
- `request.ts` uses the SDK functions to retrieve information about requests.
- `proof.ts` uses the SDK functions to retrieve information about proofs.
- `delegate-proof.ts` uses the SDK functions to retrieve information about proofs using delegates.
- `healthchecks.ts` uses the SDK functions to retrieve node's health information.
- `node-info.ts` uses the SDK functions to retrieve node information.
- `asset-types.ts` uses the SDK functions to work with asset-types.
- `delegate-asset-type.ts` uses the SDK functions to work with asset-types using delegates.
- `assets.ts` uses the SDK functions to work with asset.
- `delegate-asset.ts` uses the SDK functions to work with assets using delegates.
- `claims.ts` uses the SDK functions to work with claims.
- `delegate-claim.ts` uses the SDK functions to work with claims using delegates.
- `endorsements.ts` uses the SDK functions to work with endorsements.
- `delegate-endorsement.ts` uses the SDK functions to work with endorsements using delegates.
- `transfer.ts` uses the SDK functions to work with transfers.
- `delegate-transfer.ts` uses the SDK functions to work with transfers using delegates.
- `transaction.ts` uses the SDK functions to retrieve transactions.
- `delegate-transaction.ts` uses the SDK functions to retrieve transactions using delegates.

The html folder contains sample HTML files showing how to use the SDK:
- `create-identity.html` uses the SDK functions to create and retrieve identities.

The use-cases folder contains scenarios using the iov42 platform:
- `car-purchase.ts` uses the iov42 platform to showcase a car purchase.

The dist folder contains the compiled SDK Javascript files:
- `iov42.js` contains the bundled Javascript code.
- `iov42.js.map` contains the source map for SDK code.
- `iov42.min.js` contains the bundled Javascript code (minified version).
- `iov42.min.js.map` contains the source map for SDK code (minified version).

