const rs = require("jsrsasign");
import base64Url from "base64url";
import { fetch } from "cross-fetch";
import { v4 as uuidv4 } from "uuid";
import { IAuthenticationData, IAuthorisationsData, IGetHeadersData, IKeyPairData, IPutHeadersData, ProtocolIdType} from "./core-sdk";

// import { HttpsProxyAgent } from "https-proxy-agent";

// This class implements helper methods to interface with the iov42 rest api.
class PlatformUtils {
    // Generates a key pair using one of the supported protocolId supported by iov42 platform
    // Input:
    // protocolId -> one of the supported iov42 protocols ("SHA256WithECDSA" or "SHA256WithRSA")
    public generateKeypairWithProtocolId(protocolId: ProtocolIdType, identityId?: string) {
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
            identityId: identityId !== undefined ? identityId : uuidv4(),
            protocolId,
            prvKeyBase64: keypair.prvKeyBase64,
            pubKeyBase64: keypair.pubKeyBase64,
        };
    }

    // Signs the payload using one of the protocolId supported by iov42 platform
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

    // Verifies a signature using one of the protocolId supported by iov42 platform
    // Input:
    // protocolId -> one of the supported iov42 protocols (SHA256WithECDSA or SHA256WithRSA)
    // publicKey -> public key data
    // payload -> string used to verify signature
    // signature -> payload's signature
    public verifyWithProtocolId(protocolId: ProtocolIdType, publicKey: string, payload: string, signature: string) {
        let pubKeyHex;
        let signatureHex;
        let isValid;

        switch ( protocolId ) {
        case "SHA256WithRSA":
            pubKeyHex = Buffer.from(this.b64UrlToB64(publicKey), "base64").toString("hex");
            signatureHex = Buffer.from(this.b64UrlToB64(signature), "base64").toString("hex");
            isValid = this.verify("SHA256withRSA", "", pubKeyHex, payload, signatureHex);
            break;

        case "SHA256WithECDSA":
            pubKeyHex = Buffer.from(this.b64UrlToB64(publicKey), "base64").toString("hex");
            signatureHex = Buffer.from(this.b64UrlToB64(signature), "base64").toString("hex");
            isValid = this.verify("SHA256withECDSA", "secp256k1", pubKeyHex, payload, signatureHex);
            break;

        default:
            throw (new Error("Invalid protocolId"));
        }

        return isValid;
    }

    // Validates a proof by checking the Authorisation signature
    // Input:
    // proofJson -> string contained the proof retrieved from the platform
    public async validateProof(proofJson: string) {
        const proof = JSON.parse(proofJson);
        const nodeAuth = proof.proof.nodes.find(
            (node: any) => node.id._type === "Authorisation",
          );
        const payload = nodeAuth.payload;
        const signatories = [];
        for (const seal of nodeAuth.links[0].seals) {
            const signatory = proof.signatories.find(
                (signer: any) => signer.identity === seal.identityId,
              );
            const publicKey = signatory.credentials.key;
            const valid = await this.verifyWithProtocolId(seal.protocolId, publicKey, payload, seal.signature);
            signatories.push({
                identityId: seal.identityId,
                protocolId: seal.protocolId,
                publicKey,
                signature: seal.signature,
                valid,
            });
        }
        return {
            payload,
            signatories,
        };
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

    // Creates an array with the sha256 hash of claims
    // Input:
    // claims -> array of claims
    public createClaimsHashArray(claims: string[]) {
        const claimsHashArray: string[] = [];
        for (const claim of claims) {
            const hash: string = this.hash("sha256", claim);
            claimsHashArray.push(hash);
        }
        return claimsHashArray;
    }

    // Creates endorsements object
    // Input:
    // subjectId -> entity that the claims refere to
    // claims -> array of claims
    // keyPair -> key pair of the identity endorsing the claims
    // subjectTypeId -> type of the subjectId (only needed if endorsing asset's claims)
    public createEndorsementsObject(subjectId: string, claims: string[], keyPair: IKeyPairData, subjectTypeId?: string) {
        const endorsements: any = {};
        for (const claim of claims) {
            const hash: string = this.hash("sha256", claim);
            const payload = subjectTypeId !== undefined
                ? subjectId + ";" + subjectTypeId + ";" + hash
                : subjectId + ";" + hash;
            endorsements[hash] =
            this.signWithProtocolId(
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                payload,
            );
        }
        return endorsements;
    }

    // Creates signed headers for GET requests to the iov42 platform
    // Input:
    // keyPair -> key pair of the identity signing the PUT request
    // payload -> string that is beeing signed (uri)
    // delegatorIdentityId -> identityId on which behalf the request is executed (optional)
    public createAuthenticationHeader(keyPair: IKeyPairData, payload: string, delegatorIdentityId?: string) {
        const authentication: IAuthenticationData = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.signWithProtocolId(keyPair.protocolId, keyPair.prvKeyBase64, payload),
        };
        if (delegatorIdentityId !== undefined) {
            authentication.delegateIdentityId = keyPair.identityId;
            authentication.identityId = delegatorIdentityId;
        }
        return authentication;
    }

    // Creates signed headers for PUT requests to the iov42 platform
    // Input:
    // keyPair -> key pair of the identity signing the PUT request
    // payload -> string that is beeing signed (body)
    // delegatorIdentityId -> identityId on which behalf the request is executed (optional)
    public createAuthorisationsHeader(keyPair: IKeyPairData, payload: string, delegatorIdentityId?: string) {
        const signatureBase64 = this.signWithProtocolId(keyPair.protocolId, keyPair.prvKeyBase64, payload);
        const authorisations: IAuthorisationsData = [
            {
                identityId: keyPair.identityId,
                protocolId: keyPair.protocolId,
                signature : signatureBase64,
            },
        ];
        if (delegatorIdentityId !== undefined) {
            authorisations[0].delegateIdentityId = keyPair.identityId;
            authorisations[0].identityId = delegatorIdentityId;
        }
        return authorisations;
    }

    // Creates claims header for PUT requests to the iov42 platform
    // Input:
    // claims -> array of claims
    public createClaimsHeader(claims: string[]) {
        const claimsHeader: any = {};
        const claimsHashArray: string[] = this.createClaimsHashArray(claims);
        for (let i = 0; i < claims.length; i++) {
            claimsHeader[claimsHashArray[i]] = claims[i];
        }
        return claimsHeader;
    }

    // Creates signed headers for GET requests to the iov42 platform
    // Input:
    // keyPair -> key pair of the identity signing the PUT request
    // requestId -> unique id for each request to the iov42 platform
    // payload -> string that is beeing signed (uri)
    // identityId -> identityId on which behalf the request is executed (optional)
    public createGetHeaders(keyPair: IKeyPairData,
                            requestId: string,
                            payload: string,
                            identityId?: string) {
        const authentication: IAuthenticationData = this.createAuthenticationHeader(
            keyPair,
            payload,
            identityId,
        );
        const headers: IGetHeadersData = {
            authenticationBase64Url: base64Url(JSON.stringify(authentication)),
            requestId,
        };
        return headers;
    }

    // Creates signed headers for PUT requests to the iov42 platform
    // Input:
    // keyPair -> key pair of the identity signing the PUT request
    // requestId -> unique id for each request to the iov42 platform
    // payload -> string that is beeing signed (body)
    // delegatorIdentityId -> identityId on which behalf the request is executed
    public createPutHeaders(keyPair: IKeyPairData,
                            requestId: string,
                            payload: string,
                            delegatorIdentityId?: string) {
        const authorisations: IAuthorisationsData = this.createAuthorisationsHeader(
            keyPair,
            payload,
            delegatorIdentityId,
        );
        const authentication: IAuthenticationData = this.createAuthenticationHeader(
            keyPair,
            authorisations[0].signature,
        );
        const headers: IPutHeadersData = {
            authenticationBase64Url: base64Url(JSON.stringify((authentication))),
            authorisationsBase64Url: base64Url(JSON.stringify(authorisations)),
            requestId,
        };
        return headers;
    }

    // Creates signed headers for PUT requests to the iov42 platform
    // Input:
    // keyPair -> key pair of the identity signing the PUT request
    // requestId -> unique id for each request to the iov42 platform
    // payload -> string that is beeing signed (body)
    // delegatorIdentityId -> identityId on which behalf the request is executed
    public createClaimsPutHeaders(keyPair: IKeyPairData,
                                  requestId: string,
                                  payload: string,
                                  claims: string[],
                                  delegatorIdentityId?: string) {
        const headers: IPutHeadersData = this.createPutHeaders(
            keyPair,
            requestId,
            payload,
            delegatorIdentityId,
        );
        headers.claims = base64Url(JSON.stringify(this.createClaimsHeader(claims)));
        return headers;
    }

    public executeReadRequest(url: string, headersData?: IGetHeadersData) {
        const headers: any = {
            Accept: "application/json",
        };
        if (headersData !== undefined) {
            headers["X-IOV42-Authentication"] = headersData.authenticationBase64Url;
        }
        const options = {
            // agent: new HttpsProxyAgent("http://127.0.0.1:8888"),
            headers,
            method: "get",
        };

        return fetch(url, options)
        .then( async (response) => {
            const body = await response.text();
            const json = body !== "" ? JSON.parse(body) : {
                status: response.status,
                statusText: response.statusText,
            };
            if (response.status !== 200) {
                throw (new Error(JSON.stringify(json)));
            }
            return json;
        });
    }

    public executePutRequest(url: string, body: string, headersData: IPutHeadersData) {

        const headers: any = {
            "Content-Type": "application/json",
            "X-IOV42-Authentication": headersData.authenticationBase64Url,
            "X-IOV42-Authorisations": headersData.authorisationsBase64Url,
        };

        if (headersData.claims !== undefined) {
            headers["X-IOV42-Claims"] = headersData.claims;
        }
        const options = {
            // agent: new HttpsProxyAgent("http://127.0.0.1:8888"),
            body,
            headers,
            method: "put",
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

    // Verifies the signature according to the specified algorithm and curve
    // Input:
    // algorithm -> algorithm to use for generating the key (see supported values in jsrsasign library)
    // curveName -> curve to be used for signing payload (see supported values in jsrsasign library)
    // publicKey -> public key data
    // payload -> string to be verified
    // signature -> payload's signature
    private verify(algorithm: string, curveName: string, publicKey: string, payload: string, signature: string) {

        let sig;
        let isValid;

        switch ( algorithm ) {
        case "SHA256withRSA":
            const rsaKey = new rs.RSAKey();
            rsaKey.readPKCS8PubKeyHex(publicKey);
            sig = new rs.KJUR.crypto.Signature({alg: "SHA256withRSA"});
            sig.init(rsaKey);
            sig.updateString(payload);
            isValid = sig.verify(signature);
            break;

        case "SHA256withECDSA":
            const ecKey = new rs.crypto.ECDSA();
            ecKey.readPKCS8PubKeyHex(publicKey);
            sig = new rs.KJUR.crypto.Signature({alg: "SHA256withECDSA", curve: curveName});
            sig.init(ecKey);
            sig.updateString(payload);
            isValid = sig.verify(signature);
            break;

        default:
            throw(new Error("Invalid algorithm"));
        }

        return isValid;
    }

}

export { PlatformUtils };
