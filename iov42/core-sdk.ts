import { Base64 } from "js-base64";
import { v4 as uuidv4 } from "uuid";
import { PlatformUtils} from "./utils";

// Supported protocolIds in the iov42 platform
export type ProtocolIdType = "SHA256WithECDSA" | "SHA256WithRSA";

// Supported asset types in the iov42 platform
export type AssetTypeProperty = "Unique" | "Quantifiable";

// Supported transaction types in the iov42 platform
export type TransactionType = "IssueIdentityRequest" |
    "CreateIdentityRequest" |
    "DefineAssetTypeRequest" |
    "CreateAssetRequest" |
    "TransfersRequest" |
    "AddQuantityRequest" |
    "AddDelegateRequest" |
    "CreateIdentityClaimsRequest" |
    "CreateAssetTypeClaimsRequest" |
    "CreateAssetClaimsRequest" |
    "CreateIdentityEndorsementsRequest" |
    "CreateAssetTypeEndorsementsRequest" |
    "CreateAssetEndorsementsRequest";

// Supported Permissions
export type PermissionType = "Grant" | "Deny";

// Data structure for a key pair
export interface IKeyPairData {
    identityId: string;
    pubKeyBase64: string;
    prvKeyBase64: string;
    protocolId: ProtocolIdType;
}

// Data structure for GET request's headers
export interface IGetHeadersData {
    authenticationBase64Url: string;
    requestId?: string;
}

// Data structure for PUT request's headers
export interface IPutHeadersData {
    authenticationBase64Url: string;
    authorisationsBase64Url: string;
    claims?: string;
    requestId?: string;
}

// Data structure used to create the authorisations header
export interface IAuthorisationData {
    delegateIdentityId?: string;
    identityId: string;
    protocolId: string;
    signature: string;
}

// Data structure used to create an array of authorisations
export interface IAuthorisationsData extends Array<IAuthorisationData> {}

// Data structure used to create the authentication header
export interface IAuthenticationData {
    delegateIdentityId?: string;
    identityId: string;
    protocolId: string;
    signature: string;
}

// Data structure to provide credentials/keys
export interface IPublicCredentials {
    key: string;
    protocolId: string;
}

// Data structure to define permissions
export interface IPermission {
    Everyone?: PermissionType;
    TypeOwner?: PermissionType;
    InstanceOwner?: PermissionType;
}

// Data structure to define request's permissions
export interface IPermissionRequest {
    read?: IPermission;
    createClaim?: IPermission;
    createIdentity?: PermissionType;
    endorseClaim?: IPermission;
    instances?: {
        create?: IPermission;
        read?: IPermission;
        createClaim?: IPermission;
        endorseClaim?: IPermission;
        transfer?: IPermission;
        addQuantity?: IPermission;
    };
}

// Base data structure for all PUT requests
export interface IBaseRequest {
    _type?: TransactionType;
    requestId?: string;
}

// Base data structure for signed PUT requests
export interface IAuthorisedRequest extends IBaseRequest {
    authentication?: IAuthenticationData;
    authorisations: IAuthorisationsData;
    payload: string;
    requestId: string;
}

// Data structure used to create identity
export interface ICreateIdentityRequest extends IBaseRequest {
    identityId: string;
    publicCredentials: IPublicCredentials;
    permissions?: IPermissionRequest;
}

// Data structure used to create asset types
export interface ICreateAssetTypeRequest extends IBaseRequest {
    assetTypeId: string;
    scale?: number;
    type: AssetTypeProperty;
    permissions?: IPermissionRequest;
}

// Data structure used to create assets
export interface ICreateAssetRequest extends IBaseRequest {
    assetId: string;
    assetTypeId: string;
    quantity?: string;
    permissions?: IPermissionRequest;
}

// Data structure used to create claims
export interface ICreateClaimsRequest extends IBaseRequest {
    claims: string[];
    subjectId: string;
    subjectTypeId?: string;
    permissions?: IPermissionRequest;
}

// Data structure used to endorse claims
export interface IEndorseClaimsRequest extends IBaseRequest {
    endorsements: object;
    endorserId: string;
    subjectId: string;
    subjectTypeId?: string;
    permissions?: IPermissionRequest;
}

// Data structure used to add delegate to identity
export interface IAddDelegateRequest extends IBaseRequest {
    delegateIdentityId: string;
    delegatorIdentityId: string;
}

// Data structure common to all transfer requests
export interface ITransferItem {
    assetTypeId: string;
}
// Data structure for transfer of unique assets
export interface ITransferOwnership extends ITransferItem {
    assetId: string;
    fromIdentityId: string;
    toIdentityId: string;
}
// Data structure for transfer of quantifiable assets
export interface ITransferQuantity extends ITransferItem {
    fromAssetId: string;
    quantity: string;
    toAssetId: string;
}

export interface ITransferRequest extends IBaseRequest {
    transfers: ITransferItem[];
}
// Data structure for retrieving transactions
export interface ITransferQuery {
    assetId: string;
    assetTypeId: string;
    limit?: number;
    next?: string;
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

    // Helper methods to interact with iov42 platform
    private platformUtils: PlatformUtils;

    // Initializes the rest client with the url of the api server, and sets the version to "v1" (default)
    constructor(url: string, version: string = "v1") {
        this.url = url;
        if (this.url[this.url.length - 1] === "/") {
            this.url = this.url.substring(0, this.url.length - 1);
        }
        this.version = version;
        this.platformUtils = new PlatformUtils();
        this.ready = new Promise( (resolve, reject) => {
            this.getNodeInfo()
            .then((nodeInfo) => {
                this.nodeId = nodeInfo.nodeId;
                resolve(undefined);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    // Returns the url of the api server
    public getUrl() {
        return this.url;
    }

    // Retrieves information about a node in the iov42 platform
    public async getNodeInfo() {
        const response = await this.platformUtils.executeReadRequest(
            this.url + `/api/${this.version}/node-info`,
        );
        return response;
    }

    // Retrieves information about the node's health
    public async getHealthChecks() {
        const response = await this.platformUtils.executeReadRequest(
            this.url + `/api/${this.version}/healthchecks`,
        );
        return response;
    }

    // Returns information about a proof
    public async getProof(requestId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const readRequestId: string = uuidv4();
        const relativeUrl = `/api/${this.version}/proofs/${requestId}?requestId=${readRequestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            readRequestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Returns the status of a request in the iov42 platform
    public async getRequest(requestId: string) {
        await this.ready;
        const response = await this.platformUtils.executeReadRequest(
            this.url + `/api/${this.version}/requests/${requestId}`,
        );
        return response;
    }

    // Returns transactions related to an asset
    public async getTransactions(query: ITransferQuery, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const readRequestId: string = uuidv4();
        let relativeUrl: string;
        relativeUrl = `/api/${this.version}/asset-types/${query.assetTypeId}/assets/${query.assetId}/transactions?requestId=${readRequestId}&nodeId=${this.nodeId}`;
        if (query.limit !== undefined) {
            relativeUrl = relativeUrl + `&limit=${query.limit}`;
        }
        if (query.next !== undefined) {
            relativeUrl = relativeUrl + `&next=${query.next}`;
        }
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            readRequestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates an asset type in the iov42 platform
    // Input:
    // request -> request details
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async createAssetType(request: ICreateAssetTypeRequest, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "DefineAssetTypeRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;
    }

    // Retrieves an asset-type in the iov42 platform
    // Input:
    // assetTypeId -> asset type identifier
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async getAssetType(assetTypeId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates an asset in the iov42 platform
    // Input:
    // request -> request details
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async createAsset(request: ICreateAssetRequest, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "CreateAssetRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;
    }

    // Adds quantity to the balance of a quantifiable asset in the iov42 platform
    // Input:
    // request -> request details
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async addAssetQuantity(request: ICreateAssetRequest, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "AddQuantityRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;
    }

    // Transfers assets
    // Input:
    // request -> request details
    // keyPair -> key pair used to sign the request
    public async transferAssets(request: IAuthorisedRequest, keyPair: IKeyPairData) {
        await this.ready;

        const authorisationsJson = JSON.stringify(request.authorisations);
        const authorisationsBase64Url = Base64.encodeURI(authorisationsJson);
        request.authentication = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.platformUtils.signWithProtocolId (
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                request.authorisations.reduce( (p: any, c: any) => `${p}${c.signature};`, "").slice(0, -1)),
        };
        const authenticationJson = JSON.stringify(request.authentication);
        const authenticationBase64Url = Base64.encodeURI(authenticationJson);

        const headers: IPutHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId: request.requestId,
        };

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            request.payload,
            headers,
        );
        return response;
    }

    // Retrieves an asset in the iov42 platform
    // Input:
    // assetId -> asset identifier
    // assetTypeId -> asset type identifier of assetId
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async getAsset(assetId: string, assetTypeId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/assets/${assetId}?requestId=${requestId}&nodeId=${this.nodeId}`;

        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates an identity in the iov42 platform
    // Input:
    // request -> request details
    // keyPair -> key pair used to sign the request
    public async createIdentity(request: ICreateIdentityRequest, keyPair: IKeyPairData) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "IssueIdentityRequest";
        }
        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;
    }

    // Retrieves an identity in the iov42 platform
    // Input:
    // identityId -> identity's identifier
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is executed, if different than the one in the keyPair
    public async getIdentity(identityId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Retrieves the public key of an identity
    // Input:
    // identityId -> identity's identifier
    // keyPair -> key pair used to sign the request
    public async getPublicKey(identityId: string, keyPair: IKeyPairData) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}/public-key?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates identity's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async createIdentityClaims(request: ICreateClaimsRequest, claims: string[], keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "CreateIdentityClaimsRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createClaimsPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            claims,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;

    }

    // Retrieves an identity's claims
    // Input:
    // identityId -> identity's identifier
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getIdentityClaims(identityId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}/claims?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Retrieves a single identity's claim
    // Input:
    // identityId -> identity's identifier
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getIdentityClaim(identityId: string, claim: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}/claims/${claim}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Endorses identity's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async endorseIdentityClaims(request: IAuthorisedRequest, claims: string[], keyPair: IKeyPairData) {
        await this.ready;

        const authorisationsJson = JSON.stringify(request.authorisations);
        const authorisationsBase64Url = Base64.encodeURI(authorisationsJson);
        request.authentication = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.platformUtils.signWithProtocolId (
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                request.authorisations.reduce( (p: any, c: any) => `${p}${c.signature};`, "").slice(0, -1)),
        };
        const authenticationJson = JSON.stringify(request.authentication);
        const authenticationBase64Url = Base64.encodeURI(authenticationJson);

        const headers: IPutHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId: request.requestId,
        };
        headers.claims = Base64.encodeURI(JSON.stringify(this.platformUtils.createClaimsHeader(claims)));

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            request.payload,
            headers,
        );
        return response;
    }

    // Retrieves an identity's claim endorsement
    // Input:
    // identityId -> identity's identifier
    // claim -> claim, hashed using sha(256) algorithm
    // endorserId -> identityId of the endorser of the claim
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getIdentityClaimEndorsement(identityId: string, claim: string, endorserId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}/claims/${claim}/endorsements/${endorserId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates asset type's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async createAssetTypeClaims(request: ICreateClaimsRequest, claims: string[], keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "CreateAssetTypeClaimsRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createClaimsPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            claims,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;

    }

    // Retrieves an asset type's claims
    // Input:
    // assetTypeId -> asset type's identifier
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetTypeClaims(assetTypeId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/claims?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Retrieves a single asset type's claim
    // Input:
    // assetTypeId -> asset type's identifier
    // claim -> claim, hashed using sha(256) algorithm
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetTypeClaim(assetTypeId: string, claim: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/claims/${claim}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Endorses asset type's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async endorseAssetTypeClaims(request: IAuthorisedRequest, claims: string[], keyPair: IKeyPairData) {
        await this.ready;

        const authorisationsJson = JSON.stringify(request.authorisations);
        const authorisationsBase64Url = Base64.encodeURI(authorisationsJson);
        request.authentication = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.platformUtils.signWithProtocolId (
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                request.authorisations.reduce( (p: any, c: any) => `${p}${c.signature};`, "").slice(0, -1)),
        };
        const authenticationJson = JSON.stringify(request.authentication);
        const authenticationBase64Url = Base64.encodeURI(authenticationJson);
        const headers: IPutHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId: request.requestId,
        };
        headers.claims = Base64.encodeURI(JSON.stringify(this.platformUtils.createClaimsHeader(claims)));

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            request.payload,
            headers,
        );
        return response;
    }

    // Retrieves an asset type's claim endorsement
    // Input:
    // assetTypeId -> asset type's identifier
    // claim -> claim, hashed using sha(256) algorithm
    // endorserId -> identityId of the endorser of the claim
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetTypeClaimEndorsement(assetTypeId: string, claim: string, endorserId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/claims/${claim}/endorsements/${endorserId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Creates asset's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async createAssetClaims(request: ICreateClaimsRequest, claims: string[], keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }
        if (!request.hasOwnProperty("_type")) {
            request._type = "CreateAssetClaimsRequest";
        }

        const payload = JSON.stringify(request);
        const headers: IPutHeadersData = this.platformUtils.createClaimsPutHeaders(
            keyPair,
            request.requestId as string,
            payload,
            claims,
            delegatorIdentityId,
        );

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            payload,
            headers,
        );
        return response;

    }

    // Retrieves an asset's claims
    // Input:
    // assetId -> asset's identifier
    // assetTypeId -> asset's asse type
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetClaims(assetId: string, assetTypeId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/assets/${assetId}/claims?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Retrieves a single asset's claim
    // Input:
    // assetId -> asset's identifier
    // assetTypeId -> asset's asse type
    // claim -> claim, hashed using sha(256) algorithm
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetClaim(assetId: string, assetTypeId: string, claim: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/assets/${assetId}/claims/${claim}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Endorses asset`s or account's claims
    // Input:
    // request -> request details
    // claims -> array of claims, encoded as strings
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async endorseAssetClaims(request: IAuthorisedRequest, claims: string[], keyPair: IKeyPairData) {
        await this.ready;

        const authorisationsJson = JSON.stringify(request.authorisations);
        const authorisationsBase64Url = Base64.encodeURI(authorisationsJson);
        request.authentication = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.platformUtils.signWithProtocolId (
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                request.authorisations.reduce( (p: any, c: any) => `${p}${c.signature};`, "").slice(0, -1)),
        };
        const authenticationJson = JSON.stringify(request.authentication);
        const authenticationBase64Url = Base64.encodeURI(authenticationJson);
        const headers: IPutHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId: request.requestId,
        };
        headers.claims = Base64.encodeURI(JSON.stringify(this.platformUtils.createClaimsHeader(claims)));

        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            request.payload,
            headers,
        );
        return response;
    }

    // Retrieves an asset's or account's claim endorsement
    // Input:
    // assetId -> asset's identifier
    // assetTypeId -> asset type's identifier of assetId
    // claim -> claim, hashed using sha(256) algorithm
    // endorserId -> identityId of the endorser of the claim
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public async getAssetClaimEndorsement(assetId: string, assetTypeId: string, claim: string, endorserId: string, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/asset-types/${assetTypeId}/assets/${assetId}/claims/${claim}/endorsements/${endorserId}?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
            delegatorIdentityId,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

    // Prepares request with initial authorisation signature
    // Input:
    // request -> request to be signed
    // keyPair -> key pair used to sign the request
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public prepareRequest(request: IBaseRequest, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        if (!request.hasOwnProperty("requestId")) {
            request.requestId = uuidv4();
        }

        const payload = JSON.stringify(request);
        const authorisations: IAuthorisationsData = this.platformUtils.createAuthorisationsHeader(
            keyPair,
            payload,
            delegatorIdentityId,
        );
        const signedRequest: IAuthorisedRequest = {
            authorisations,
            payload,
            requestId: request.requestId as string,
        };
        return signedRequest;
    }

    // Adds authorisation signature to request
    // Input:
    // request -> request to be signed
    // keyPair -> identityId's key pair
    // delegatorIdentityId -> identity on which behalf the request is signed, if different than the one in the keyPair
    public addSignatureRequest(request: IAuthorisedRequest, keyPair: IKeyPairData, delegatorIdentityId?: string) {
        const authorisations: IAuthorisationsData = this.platformUtils.createAuthorisationsHeader(
            keyPair,
            request.payload,
            delegatorIdentityId,
        );
        request.authorisations.push(authorisations[0]);
        return request;
    }

    // Adds delegate to an identity
    // Input:
    // identityId -> identity's identifier
    // request -> signed request
    // keyPair -> key pair used to sign the transaction
    public async addDelegate(request: IAuthorisedRequest, keyPair: IKeyPairData) {
        await this.ready;

        const authorisationsJson = JSON.stringify(request.authorisations);
        const authorisationsBase64Url = Base64.encodeURI(authorisationsJson);
        request.authentication = {
            identityId: keyPair.identityId,
            protocolId: keyPair.protocolId,
            signature : this.platformUtils.signWithProtocolId (
                keyPair.protocolId,
                keyPair.prvKeyBase64,
                request.authorisations.reduce( (p: any, c: any) => `${p}${c.signature};`, "").slice(0, -1)),
        };
        const authenticationJson = JSON.stringify(request.authentication);
        const authenticationBase64Url = Base64.encodeURI(authenticationJson);

        const headers: IPutHeadersData = {
            authenticationBase64Url,
            authorisationsBase64Url,
            requestId: request.requestId,
        };
        const response = await this.platformUtils.executePutRequest(
            this.url + `/api/${this.version}/requests/${request.requestId}`,
            request.payload,
            headers,
        );
        return response;
    }

    // Retrieves the delegates of an identity
    // Input:
    // identityId -> identity's identifier
    // keyPair -> key pair used to sign the transaction
    public async getDelegates(identityId: string, keyPair: IKeyPairData) {
        await this.ready;
        const requestId = uuidv4();
        const relativeUrl = `/api/${this.version}/identities/${identityId}/delegates?requestId=${requestId}&nodeId=${this.nodeId}`;
        const headers: IGetHeadersData = this.platformUtils.createGetHeaders(
            keyPair,
            requestId,
            relativeUrl,
        );
        const response = await this.platformUtils.executeReadRequest(
            this.url + relativeUrl,
            headers,
        );
        return response;
    }

}

export { PlatformClient, PlatformUtils };
