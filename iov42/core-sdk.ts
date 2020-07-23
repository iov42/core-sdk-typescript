const rs = require("jsrsasign");
import base64Url from "base64url";
import { fetch } from "cross-fetch";
import { v4 as uuidv4 } from "uuid";

// import { HttpsProxyAgent } from "https-proxy-agent";

// Supported asset types in the iov42 platform
export type ProtocolIdType = "SHA256WithECDSA" | "SHA256WithRSA";

// Data structure for a key pair
export interface IKeyPairData {
    pubKeyBase64: string;
    prvKeyBase64: string;
    protocolId: ProtocolIdType;
}

// Data structure for GET request's headers
export interface IGetHeadersData {
    authenticationBase64Url: string;
    requestId?: string;
}

// Data structure for POST request's headers
export interface IPostHeadersData {
    authenticationBase64Url: string;
    authorisationsBase64Url: string;
    requestId?: string;
}

// Data structure used to create the authorisations header
export interface IAuthorisationData {
    identityId: string;
    protocolId: string;
    signature: string;
}

// Data structure used to create an array of authorisations
export interface IAuthorisationsData extends Array<IAuthorisationData> {}

// Data structure used to create the authentication header
export interface IAuthenticationData {
    identityId: string;
    protocolId: string;
    signature: string;
}

// Data structure to provide credentials/keys
export interface IPublicCredentials {
    key: string;
    protocolId: string;
}

// Data structure used to create identity
export interface ICreateIdentityRequest {
    requestId?: string;
    identityId: string;
    publicCredentials: IPublicCredentials;
}

// This class implements functions to interface with the iov42 rest api.
class PlatformClient {
    // Indicates if the class is ready to interact with the platform
    public ready: Promise<any>;

    // Url endpoint of iov42 api server
    private url: string;

    // Version supported by the iov42 api server
    private version: string;

    // Node id of iov42 api server
    private nodeId: string = "";

    // Initializes the rest client with the url of the api server, and sets the version to "v1" (default)
    constructor(url: string, version: string = "v1") {
        this.url = url;
        if (this.url[this.url.length - 1] === "/") {
            this.url = this.url.substring(0, this.url.length - 1);
        }
        this.version = version;

        this.ready = new Promise( (resolve, reject) => {
            this.getNodeInfo()
            .then((nodeInfo) => {
                this.nodeId = nodeInfo.nodeId;
                resolve(undefined);
            });
        });
    }

    // Generates a key pair using one of the supported protocolId supported by iov42 platform
    // Input:
    // protocolId -> one of the supported iov42 protocols (SHA256WithECDSA or SHA256WithRSA)
    public generateKeypairWithProtocolId(protocolId: ProtocolIdType) {
        let keypair;

        switch ( protocolId ) {
        case "SHA256WithECDSA":
            keypair = this.generateKeypair("ECDSA", "secp256k1", "base64url");
            break;

        case "SHA256WithRSA":
            keypair = this.generateKeypair("RSA", "2048", "base64url");
            break;

        default:
            throw(new Error("Invalid protocolId"));
        }
        return {
            protocolId,
            prvKeyBase64: keypair.prvKeyBase64,
            pubKeyBase64: keypair.pubKeyBase64,
        };
    }

    // Signs the payload using one of the supported protocolId supported by iov42 platform
    // Input:
    // protocolId -> one of the supported iov42 protocols (SHA256WithECDSA or SHA256WithRSA)
    // privateKey -> private key data
    // payload -> string to be signed
    public signWithProtocolId(protocolId: ProtocolIdType, privateKey: string, payload: string) {
        let prvKeyHex;
        let signature;

        switch ( protocolId ) {
        case "SHA256WithRSA":
            prvKeyHex = Buffer.from(this.b64UrlToB64(privateKey), "base64").toString("hex");
            signature = this.sign("SHA256withRSA", "", "base64url", prvKeyHex, payload);
            break;

        case "SHA256WithECDSA":
            prvKeyHex = Buffer.from(this.b64UrlToB64(privateKey), "base64").toString("hex");
            signature = this.sign("SHA256withECDSA", "secp256k1", "base64url", prvKeyHex, payload);
            break;

        default:
            throw (new Error("Invalid protocolId"));
        }
        return signature;
    }

    // Returns the url of the api server
    public getUrl() {
        return this.url;
    }

    // Retrieves information about a node in the iov42 platform
    // See api specs at https://api.sandbox.iov42.dev/api/v1/apidocs/redoc.html#tag/operations/paths/~1node-info/get
    public async getNodeInfo() {
        const response = await this.executeReadRequest(
            this.url + `/api/${this.version}/node-info`,
        );
        return response;
    }

    // Retrieves information about the node's health
    // See api specs at https://api.sandbox.iov42.dev/api/v1/apidocs/redoc.html#tag/operations/paths/~1healthchecks/get
    public async getHealthChecks() {
        const response = await this.executeReadRequest(
            this.url + `/api/${this.version}/healthchecks`,
        );
        return response;
    }

    // Generates a hash according to the specified algorithm, and returns the result encoded as base64Url
    // Input:
    // algorithm -> algorithm to use for hashing (see supported values in jsrsasign library)
    // payload -> string to be hashed
    public hash(algorithm: string, payload: string) {
        const md = new rs.KJUR.crypto.MessageDigest({alg : algorithm, prov : "cryptojs"});
        md.updateString (payload);
        const mdHex = md.digest();
        return this.b64ToB64Url(Buffer.from(mdHex, "hex").toString("base64"));
    }

    // Returns the status of a request in the iov42 platform
    // See api specs at https://api.sandbox.iov42.dev/api/v1/apidocs/redoc.html#tag/requests/paths/~1requests~1{requestId}/get
    public async getRequest(requestId: string) {
        const response = await this.executeReadRequest(
            this.url + `/api/${this.version}/requests/${requestId}`,
        );
        return response;
    }

    // Creates an identity in the iov42 platform
    // See api spec at https://api.sandbox.iov42.dev/api/v1/apidocs/redoc.html#tag/identities/paths/~1identities/post
    public async createIdentity(request: ICreateIdentityRequest, keyPair: IKeyPairData) {
        const identityId = request.identityId;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        const payload = JSON.stringify(request);
        const headers: IPostHeadersData = this.createPostHeaders(
            identityId,
            keyPair.prvKeyBase64,
            keyPair.protocolId,
            request.requestId as string,
            payload,
        );

        await this.ready;
        const response = await this.executePostRequest(
            this.url + `/api/${this.version}/identities`,
            payload,
            headers,
        );
        return response;
    }

    // Retrieves an identity in the iov42 platform
    // See api spec at https://api.sandbox.iov42.dev/api/v1/apidocs/redoc.html#tag/identities/paths/~1identities~1{identityId}/get
    public async getIdentity(identityId: string, keyPair: IKeyPairData) {
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.createGetHeaders(
            identityId,
            keyPair.prvKeyBase64,
            keyPair.protocolId,
            requestId,
            relativeUrl,
        );
        await this.ready;
        const response = await this.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Generates a key pair according to the specified algorithm, length or curve,
    // and returns the result in the chosen format/encoding
    // Input:
    // algorithm -> algorithm to use for generating the key (see supported values in jsrsasign library)
    // keylenOrCurveName -> length of key or curve to be used for generating the
    // key (see supported values in jsrsasign library)
    // format -> encoding format for returning key data (only supports "base64url")
    private generateKeypair(algorithm: string, keylenOrCurveName: string, format: string) {
        let keypair;

        switch ( algorithm ) {
        case "RSA":
            keypair = rs.KEYUTIL.generateKeypair("RSA", keylenOrCurveName);
            break;

        case "ECDSA":
            keypair = rs.KEYUTIL.generateKeypair("EC", keylenOrCurveName);
            break;

        default:
            throw(new Error("Invalid algorithm"));
        }

        const pubKeyPEM = rs.KEYUTIL.getPEM(keypair.pubKeyObj, "PKCS8PUB");
        const prvKeyPEM = rs.KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS8PRV" );
        const pubKeyHex = rs.pemtohex(pubKeyPEM);
        const prvKeyHex = rs.pemtohex(prvKeyPEM);
        const pubKeyBase64 = this.b64ToB64Url(Buffer.from(pubKeyHex, "hex").toString("base64"));
        const prvKeyBase64 = this.b64ToB64Url(Buffer.from(prvKeyHex, "hex").toString("base64"));

        switch (format) {
        case "base64url":
            return { pubKeyBase64, prvKeyBase64 };

        default:
            throw (new Error("Invalid keypair format"));
        }
    }

    // Converts a base64 string to base64Url string
    // Input:
    // input -> string in base64
    private b64ToB64Url(input: string) {
        const output = input.split("=")[0];
        const output1 = output.replace(/\+/g, "-");
        const output2 = output1.replace(/\//g, "_");
        return output2;
    }

    // Converts a base64Url string to base64 string
    // Input:
    // input -> string in base64Url
    private b64UrlToB64(input: string) {
        const output = input.split("=")[0];
        const output1 = output.replace(/\-/g, "+");
        let output2 = output1.replace(/\_/g, "/");
        switch (output.length % 4) {
            case 0:
                break;
            case 2:
                output2 = output2 + "==";
                break;
            case 3:
                output2 = output2 + "=";
                break;
            default:
                throw (new Error("Illegal base64url string!"));
        }
        return output2;
    }

    // Signs the payload according to the specified algorithm, curve, and returns the result in
    // the chosen format/encoding
    // Input:
    // algorithm -> algorithm to use for generating the key (see supported values in jsrsasign library)
    // curveName -> curve to be used for signing payload (see supported values in jsrsasign library)
    // format -> encoding format for returning signature data (only supports "base64url")
    // privateKey -> private key data
    // payload -> string to be signed
    private sign(algorithm: string, curveName: string, format: string, privateKey: string, payload: string) {
        let signature;
        let sig;

        switch ( algorithm ) {
        case "SHA256withRSA":
            const rsaKey = new rs.RSAKey();
            rsaKey.readPKCS8PrvKeyHex(privateKey);
            sig = new rs.KJUR.crypto.Signature({alg: "SHA256withRSA"});
            sig.init(rsaKey);
            sig.updateString(payload);
            signature = sig.sign();
            break;

        case "SHA256withECDSA":
            const ecKey = new rs.crypto.ECDSA();
            ecKey.readPKCS8PrvKeyHex(privateKey);
            sig = new rs.KJUR.crypto.Signature({alg: "SHA256withECDSA", curve: curveName});
            sig.init(ecKey);
            sig.updateString(payload);
            signature = sig.sign();
            break;

        default:
            throw (new Error("Invalid protocolId"));
        }

        switch (format) {
        case "base64url":
            const signatureBase64 = this.b64ToB64Url(Buffer.from(signature, "hex").toString("base64"));
            return signatureBase64;

        default:
            throw (new Error("Invalid format"));

        }
    }

    // Creates signed headers for GET requests to the iov42 platform
    // Input:
    // identityId -> identity that is signing the GET request
    // privateKey -> private key data for the identity signing the GET request
    // protocolId -> one of the supported iov42 protocols (SHA256WithECDSA or SHA256WithRSA)
    // requestId -> unique id for each request to the iov42 platform
    // payload -> string that is beeing signed (uri)
    private createGetHeaders(identityId: string, privateKey: string, protocolId: ProtocolIdType,
                             requestId: string, payload: string) {
        const authentication: IAuthenticationData = {
            identityId,
            protocolId,
            signature : this.signWithProtocolId(protocolId, privateKey, payload),
        };
        const authenticationJson = JSON.stringify(authentication);
        const authenticationBase64Url = base64Url(authenticationJson);

        const headers: IGetHeadersData = {
            authenticationBase64Url,
            requestId,
        };
        return headers;
    }

    // Creates signed headers for POST requests to the iov42 platform
    // Input:
    // identityId -> identity that is signing the POST request
    // privateKey -> private key data for the identity signing the POST request
    // protocolId -> one of the supported iov42 protocols (SHA256WithECDSA or SHA256WithRSA)
    // requestId -> unique id for each request to the iov42 platform
    // payload -> string that is beeing signed (body)
    private createPostHeaders(identityId: string, privateKey: string, protocolId: ProtocolIdType,
                              requestId: string, payload: string) {
        const signatureBase64 = this.signWithProtocolId(protocolId, privateKey, payload);
        const authorisations: IAuthorisationsData = [
            {
                identityId,
                protocolId,
                signature : signatureBase64,
            },
        ];
        const authorisationsJson = JSON.stringify(authorisations);
        const authorisationsBase64Url = base64Url(authorisationsJson);
        const authentication: IAuthenticationData = {
            identityId,
            protocolId,
            signature : this.signWithProtocolId(protocolId, privateKey, signatureBase64),
        };
        const authenticationJson = JSON.stringify(authentication);
        const authenticationBase64Url = base64Url(authenticationJson);
        const headers: IPostHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId,
        };
        return headers;
    }

    private executeReadRequest(url: string, headers?: IGetHeadersData) {
        let options: object;

        if (headers !== undefined) {
            options = {
                // agent: new HttpsProxyAgent('http://127.0.0.1:8888'),
                headers: {
                    "Accept": "application/json",
                    "X-IOV42-Authentication": headers.authenticationBase64Url,
                },
                method: "get",
            };

        } else {
            options = {
                // agent: new HttpsProxyAgent('http://127.0.0.1:8888'),
                headers: {
                    Accept: "application/json",
                },
                method: "get",
            };
        }

        return fetch(url, options)
        .then( async (response) => {
            const json = await response.json();
            if (response.status !== 200) {
                throw (new Error(JSON.stringify(json)));
            }
            return json;
        });
    }

    private executePostRequest(url: string, body: string, headers: IPostHeadersData) {
        const options = {
            // agent: new HttpsProxyAgent('http://127.0.0.1:8888'),
            body,
            headers: {
                "Content-Type": "application/json",
                "X-IOV42-Authentication": headers.authenticationBase64Url,
                "X-IOV42-Authorisations": headers.authorisationsBase64Url,
            },
            method: "post",
            // redirect: "manual" as RequestRedirect,
        };

        return fetch(url, options)
        .then( async (response) => {
            const json = await response.json();
            if (response.status !== 200) {
                throw (new Error(JSON.stringify(json)));
            }
            return json;
        });
    }

}

export { PlatformClient };
