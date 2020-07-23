# iov42 Core SDK

This repository contains the iov42 core SDK for typescript/javascript, that can be used to interact with the iov42 platform.

## Installation and setup

The prerequisites for installing the SDK are `git` and Node.js (version 10 or higher).

Clone the repository with the example code, install all dependencies, and build package:
```
$ git clone https://github.com/iov42/core-sdk-typescript.git
$ cd core-sdk-typescript
$ npm install
```

## Running automated tests

You can run the test cases by using the npm tool:
```
$ npm run test
```

## Using the SDK in Node.js applications

The following code snipets show how to use the SDK.

### Importing library and instantiating the platform client.
```
import { PlatformClient } from '../iov42/core-sdk';

const rpcUrl = "https://api.sandbox.iov42.dev";
const client = new PlatformClient(rpcUrl);
```

### Generating an ECDSA key pair.
```
const keyPair = client.generateKeypairWithProtocolId("SHA256WithECDSA" as ProtocolIdType);
```

### Generating an RSA key pair.
```
const keyPair = client.generateKeypairWithProtocolId("SHA256WithRSA" as ProtocolIdType);
```

### Creating an identity.
```
import { v4 as uuidv4 } from "uuid";
const requestId = uuidv4();
const identityId = uuidv4();
const protocoldId: ProtocolIdType = "SHA256WithECDSA";
const keyPair = client.generateKeypairWithProtocolId(protocolId);
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
```
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
    const platformClient = new iov42.PlatformClient("https://api.sandbox.iov42.dev");
</script>
```

### Generating an ECDSA key pair, creating an identity and retrieving it
```html
<script type="module">
    import { v4 as uuidv4 } from 'https://jspm.dev/uuid';
    const platformClient = new iov42.PlatformClient("https://api.sandbox.iov42.dev");
    const requestId = uuidv4();
    const identityId = uuidv4();
    const protocolId = "SHA256WithECDSA";
    const keyPair = platformClient.generateKeypairWithProtocolId(protocolId);
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

## Code structure

The iov42 folder contains the main source files:
- `core-sdk.ts` exports the PlatformClient class with all the functions to interact with the iov42 platform.

The tests folder contains the automated tests:
- `create-identity.ts` uses the SDK functions to create and retrieve identities.
- `create-keypair.ts` uses the SDK functions to create a key pair.
- `node-info.ts` uses the SDK functions to retrieve node information.

The html folder contains sample HTML files showing how to use the SDK:
- `create-identity.html` uses the SDK functions to create and retrieve identities.

The dist folder contains the compiled SDK Javascript files:
- `iov42.js` contains the bundled Javascript code.
- `iov42.js.map` contains the source map for SDK code.
- `iov42.min.js` contains the bundled Javascript code (minified version).
- `iov42.min.js.map` contains the source map for SDK code (minified version).


## License

Write license text.
