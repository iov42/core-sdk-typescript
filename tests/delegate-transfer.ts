import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IAddDelegateRequest, IAuthorisedRequest, IKeyPairData, ITransferOwnership, ITransferRequest, PlatformClient, PlatformUtils, ProtocolIdType, ICreateAssetRequest, ICreateAssetTypeRequest, ICreateIdentityRequest, ITransferItem, ITransferQuantity } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

let identityId1: string;
let identityId2: string;
let delegateIdentityId: string;
let delegateKeyPair: IKeyPairData;
let requestId: string
let keyPair1: IKeyPairData;
let keyPair2: IKeyPairData;
let uniqueAssetTypeId: string;
let quantifiableAssetTypeId: string;
let uniqueAssetId: string;
let accountId1: string;
let accountId2: string;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];


inputs.forEach(input => {

    describe(`Testing transfer methods using delegate with protocolId="${input.protocolId}"`, function () {
        this.timeout(60000);

        before('Initializing identities, asset types', () => {
            identityId1 = uuidv4();
            identityId2 = uuidv4();
            delegateIdentityId = uuidv4();
            accountId1 = uuidv4();
            accountId2 = uuidv4();
            keyPair1 = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId1);
            keyPair2 = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId2);
            delegateKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, delegateIdentityId);

            const request: ICreateIdentityRequest = {
                identityId: identityId1,
                publicCredentials: {
                    key: keyPair1.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request, keyPair1)
            .then( () => {
                const request: ICreateIdentityRequest = {
                    identityId: identityId2,
                    publicCredentials: {
                        key: keyPair2.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request, keyPair2)
            })
            .then(() => {
                const request: ICreateIdentityRequest = {
                    identityId: delegateIdentityId,
                    publicCredentials : {
                        key: delegateKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request, delegateKeyPair);
            }) 
            .then(() => {
                const request: IAddDelegateRequest = {
                    _type: "AddDelegateRequest",
                    delegateIdentityId,
                    delegatorIdentityId: identityId1,
                    requestId: uuidv4(),
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair1);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    delegateKeyPair
                );
                return platformClient.addDelegate(finalRequest, delegateKeyPair);
            })
            .then(() => {
                const request: IAddDelegateRequest = {
                    _type: "AddDelegateRequest",
                    delegateIdentityId,
                    delegatorIdentityId: identityId2,
                    requestId: uuidv4(),
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair2);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    delegateKeyPair
                );
                return platformClient.addDelegate(finalRequest, delegateKeyPair);
            })
            .then( () => {
                uniqueAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: uniqueAssetTypeId,
                    type: "Unique",
                    requestId: uuidv4(),
                }
                return platformClient.createAssetType(request, keyPair1)
            })
            .then( () => {
                quantifiableAssetTypeId = uuidv4();
                const request: ICreateAssetTypeRequest = {
                    assetTypeId: quantifiableAssetTypeId,
                    requestId: uuidv4(),
                    scale: 2,
                    type: "Quantifiable",
                }
                return platformClient.createAssetType(request, keyPair1)
            })
            .then( () => {
                uniqueAssetId = uuidv4();
                requestId = uuidv4()
                const request: ICreateAssetRequest = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    requestId,
                }
                return platformClient.createAsset(request, keyPair1);
            })
            .then( () => {
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId1,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "0",
                    requestId,
                }
                return platformClient.createAsset(request, keyPair1);
            })
            .then( () => {
                requestId = uuidv4();
                const request: ICreateAssetRequest = {
                    assetId: accountId2,
                    assetTypeId: quantifiableAssetTypeId,
                    quantity: "100",
                    requestId,
                }
                return platformClient.createAsset(request, keyPair2);
            })
            .then( () => {
                
            })
        });

        describe("Transfer unique asset using delegate", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                const transfer: ITransferOwnership = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    fromIdentityId: identityId1,
                    toIdentityId: identityId2,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, delegateKeyPair, identityId1);
                return platformClient.transferAssets(signedRequest, delegateKeyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(1);
                    expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
                });
            });
        });

        describe("Transfer quantifiable asset using delegate", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                const transfer: ITransferQuantity = {
                    assetTypeId: quantifiableAssetTypeId,
                    fromAssetId: accountId2,
                    quantity: "50",
                    toAssetId: accountId1,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, delegateKeyPair, identityId2);
                return platformClient.transferAssets(signedRequest, delegateKeyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(2);
                    expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId2}`);
                    expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId1}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
                });
            });
        });

        describe("Exchange unique asset <--> quantifiable asset using delegate", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                const transfer1: ITransferOwnership = {
                    assetId: uniqueAssetId,
                    assetTypeId: uniqueAssetTypeId,
                    fromIdentityId: identityId2,
                    toIdentityId: identityId1,
                };
                const transfer2: ITransferQuantity = {
                    assetTypeId: quantifiableAssetTypeId,
                    fromAssetId: accountId1,
                    quantity: "25",
                    toAssetId: accountId2,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer1,
                        transfer2,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, delegateKeyPair, identityId1);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(signedRequest, delegateKeyPair, identityId2);
                return platformClient.transferAssets(finalRequest, delegateKeyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(3);
                    expect(response.resources[0]).to.equal(`/api/v1/asset-types/${uniqueAssetTypeId}/assets/${uniqueAssetId}`);
                    expect(response.resources[1]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId1}`);
                    expect(response.resources[2]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId2}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
                });
            });
        });

        describe("Transfer account using delegate", () => {
            it("should return success", async () => {
                requestId = uuidv4();
                const transfer: ITransferOwnership = {
                    assetId: accountId1,
                    assetTypeId: quantifiableAssetTypeId,
                    fromIdentityId: identityId1,
                    toIdentityId: identityId2,
                };
                const request: ITransferRequest = {
                    _type: "TransfersRequest",
                    requestId,
                    transfers: [
                        transfer,
                    ],
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, delegateKeyPair, identityId1);
                return platformClient.transferAssets(signedRequest, delegateKeyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(1);
                    expect(response.resources[0]).to.equal(`/api/v1/asset-types/${quantifiableAssetTypeId}/assets/${accountId1}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
                });
            });
        });

    });
});
